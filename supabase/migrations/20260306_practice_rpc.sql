
-- -----------------------------------------------------------------------------
-- 1. record_practice_answer
--    Called after every card answer. Writes practice_attempts and
--    user_word_progress atomically. Returns achievement flags so the frontend
--    can show toasts without a second request.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION record_practice_answer(
  p_word_form_id bigint,
  p_mode         practice_mode,
  p_is_correct   boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id           uuid := auth.uid();
  v_total_correct     int;
  v_word_became_known boolean := false;
  v_level_up          jsonb := null;
  v_old_known_count   int;
  v_new_known_count   int;
BEGIN
  -- 1. Insert attempt
  INSERT INTO practice_attempts (profile_id, word_form_id, mode, is_correct)
  VALUES (v_user_id, p_word_form_id, p_mode, p_is_correct);

  -- 2. Upsert progress
  INSERT INTO user_word_progress (profile_id, word_form_id, mode, correct, incorrect, last_practiced_at)
  VALUES (
    v_user_id, p_word_form_id, p_mode,
    CASE WHEN p_is_correct THEN 1 ELSE 0 END,
    CASE WHEN p_is_correct THEN 0 ELSE 1 END,
    now()
  )
  ON CONFLICT (profile_id, word_form_id, mode) DO UPDATE SET
    correct           = user_word_progress.correct   + CASE WHEN p_is_correct THEN 1 ELSE 0 END,
    incorrect         = user_word_progress.incorrect + CASE WHEN p_is_correct THEN 0 ELSE 1 END,
    last_practiced_at = now();

  -- 3. Consume practice box pin (remove on first answer, regardless of correctness)
  DELETE FROM practice_box
  WHERE profile_id = v_user_id
    AND root_word_id = (SELECT root_word_id FROM word_forms WHERE id = p_word_form_id);

  -- 4. Check: did this root word just reach SUM(correct) >= 10 across all forms and modes?
  IF p_is_correct THEN
    SELECT SUM(uwp.correct) INTO v_total_correct
    FROM user_word_progress uwp
    JOIN word_forms wf ON uwp.word_form_id = wf.id
    WHERE uwp.profile_id = v_user_id
      AND wf.root_word_id = (SELECT root_word_id FROM word_forms WHERE id = p_word_form_id);

    -- Became known if this correct answer pushed it over the threshold
    v_word_became_known := v_total_correct >= 10 AND (v_total_correct - 1) < 10;
  END IF;

  -- 5. Check: did total known words cross a global level threshold? (5 / 20 / 50)
  IF v_word_became_known THEN
    SELECT COUNT(*) - 1 INTO v_old_known_count
    FROM (
      SELECT wf.root_word_id
      FROM user_word_progress uwp
      JOIN word_forms wf ON uwp.word_form_id = wf.id
      WHERE uwp.profile_id = v_user_id
      GROUP BY wf.root_word_id
      HAVING SUM(uwp.correct) >= 10
    ) known_words;

    v_new_known_count := v_old_known_count + 1;

    IF (v_old_known_count < 5  AND v_new_known_count >= 5)  OR
       (v_old_known_count < 20 AND v_new_known_count >= 20) OR
       (v_old_known_count < 50 AND v_new_known_count >= 50) THEN
      v_level_up := jsonb_build_object(
        'known_count', v_new_known_count,
        'level', CASE
          WHEN v_new_known_count >= 50 THEN 'Fluent'
          WHEN v_new_known_count >= 20 THEN 'Proficient'
          ELSE 'Familiar'
        END
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'word_became_known', v_word_became_known,
    'level_up',          v_level_up
  );
END;
$$;


-- -----------------------------------------------------------------------------
-- 2. build_practice_session
--    ARS-based session builder for case_understanding and form_recall modes.
--    Returns exactly 10 card objects ordered randomly.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION build_practice_session(
  p_mode  practice_mode,  -- 'case_understanding' | 'form_recall'
  p_scope text            -- 'mixed' | specific case name e.g. 'accusative'
)
RETURNS TABLE (
  word_form_id     bigint,
  root_word_id     bigint,
  sentence_czech   text,
  sentence_english text,
  target_form      text,   -- the inflected form (bold in Case Understanding, answer in Form Recall)
  base_form        text,   -- nominative shown as hint in Form Recall
  correct_case     text,   -- for Case Understanding answer checking
  explanation      text    -- shown after answer
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  RETURN QUERY
  WITH
  -- Pinned words not yet practiced in this mode: take new slots ahead of frequency-ranked candidates
  pinned_new AS (
    SELECT wf.id AS word_form_id
    FROM practice_box pb
    JOIN word_forms wf ON wf.root_word_id = pb.root_word_id
    JOIN word_form_types ft ON wf.form_type_id = ft.id
    WHERE pb.profile_id = v_user_id
      AND ft.category = 'case'
      AND (p_scope = 'mixed' OR ft.name = p_scope)
      AND wf.root_word_id NOT IN (SELECT bw.root_word_id FROM blocked_words bw WHERE bw.profile_id = v_user_id)
      AND NOT EXISTS (
        SELECT 1 FROM user_word_progress uwp
        WHERE uwp.profile_id = v_user_id
          AND uwp.word_form_id = wf.id
          AND uwp.mode = p_mode
      )
    ORDER BY pb.created_at ASC
    LIMIT 2
  ),
  -- ARS priority for all words this user has practiced in this mode + scope.
  -- Pinned words that have already been practiced get priority 1.0 (guaranteed struggling slot).
  practiced AS (
    SELECT
      uwp.word_form_id,
      ft.name AS case_name,
      CASE WHEN pb.root_word_id IS NOT NULL THEN 1.0
           ELSE 1 - (
             (uwp.correct::float / GREATEST(uwp.correct + uwp.incorrect, 1))
             * exp(
                 -EXTRACT(EPOCH FROM (now() - uwp.last_practiced_at)) / 86400.0
                 / (GREATEST(uwp.correct, 1) * 3.0)
               )
           )
      END AS priority
    FROM user_word_progress uwp
    JOIN word_forms wf ON uwp.word_form_id = wf.id
    JOIN word_form_types ft ON wf.form_type_id = ft.id
    LEFT JOIN practice_box pb ON pb.root_word_id = wf.root_word_id AND pb.profile_id = v_user_id
    WHERE uwp.profile_id = v_user_id
      AND uwp.mode = p_mode
      AND ft.category = 'case'
      AND (p_scope = 'mixed' OR ft.name = p_scope)
      AND wf.root_word_id NOT IN (SELECT bw.root_word_id FROM blocked_words bw WHERE bw.profile_id = v_user_id)
      -- Form Recall only surfaces words seen at least once in Case Understanding
      AND (p_mode = 'case_understanding' OR EXISTS (
        SELECT 1 FROM user_word_progress e
        WHERE e.profile_id = v_user_id
          AND e.word_form_id = uwp.word_form_id
          AND e.mode = 'case_understanding' AND e.correct >= 1
      ))
  ),
  -- Words not yet practiced in this mode (new candidates, excluding pinned_new)
  new_candidates AS (
    -- One random form per root word, then take top 10 by frequency rank
    SELECT one_per_word.word_form_id, one_per_word.case_name, one_per_word.priority
    FROM (
      SELECT DISTINCT ON (rw.id)
        wf.id        AS word_form_id,
        ft.name      AS case_name,
        rw.frequency_rank,
        0.5          AS priority
      FROM word_forms wf
      JOIN root_words rw ON wf.root_word_id = rw.id
      JOIN word_form_types ft ON wf.form_type_id = ft.id
      WHERE ft.category = 'case'
        AND (p_scope = 'mixed' OR ft.name = p_scope)
        AND wf.root_word_id NOT IN (SELECT bw.root_word_id FROM blocked_words bw WHERE bw.profile_id = v_user_id)
        AND NOT EXISTS (
          SELECT 1 FROM user_word_progress uwp
          WHERE uwp.profile_id = v_user_id
            AND uwp.word_form_id = wf.id
            AND uwp.mode = p_mode
        )
        AND wf.id NOT IN (SELECT pn.word_form_id FROM pinned_new pn)
        AND (p_mode != 'form_recall' OR EXISTS (
          SELECT 1 FROM user_word_progress e
          WHERE e.profile_id = v_user_id
            AND e.word_form_id = wf.id
            AND e.mode = 'case_understanding' AND e.correct >= 1
        ))
      ORDER BY rw.id, random()
    ) one_per_word
    ORDER BY one_per_word.frequency_rank ASC NULLS LAST
    LIMIT 10
  ),
  -- Fill slots: pinned new first, then 4 struggling (>0.6), 4 reinforcing (0.3-0.6), remaining new
  selected AS (
    SELECT ac.word_form_id FROM (
      SELECT pn.word_form_id FROM pinned_new pn
      UNION ALL
      SELECT p1.word_form_id FROM (SELECT p.word_form_id FROM practiced p WHERE p.priority > 0.6 ORDER BY p.priority DESC LIMIT 4) p1
      UNION ALL
      SELECT p2.word_form_id FROM (SELECT p.word_form_id FROM practiced p WHERE p.priority BETWEEN 0.3 AND 0.6 ORDER BY p.priority DESC LIMIT 4) p2
      UNION ALL
      SELECT nc.word_form_id FROM new_candidates nc
    ) ac
    LIMIT 10
  )
  SELECT
    wf.id,
    rw.id,
    es.czech_sentence,
    es.english_sentence,
    wf.form_in_czech,
    rw.in_czech,
    ft.name,
    es.explanation
  FROM selected s
  JOIN word_forms wf ON s.word_form_id = wf.id
  JOIN root_words rw ON wf.root_word_id = rw.id
  JOIN word_form_types ft ON wf.form_type_id = ft.id
  JOIN LATERAL (
    SELECT e.czech_sentence, e.english_sentence, e.explanation
    FROM example_sentences e
    WHERE e.word_form_id = wf.id
    ORDER BY e.id
    LIMIT 1
  ) es ON true
  ORDER BY random();
END;
$$;


-- -----------------------------------------------------------------------------
-- 3. build_vocabulary_session
--    ARS-based session builder for simple_vocabulary mode.
--    Returns 10 cards with 3 distractors each (4-option multiple choice).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION build_vocabulary_session()
RETURNS TABLE (
  word_form_id    bigint,
  in_english      text,    -- prompt shown to user
  correct_czech   text,    -- correct nominative form
  distractors     text[]   -- 3 wrong Czech nominative forms from same frequency band
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  RETURN QUERY
  WITH
  pinned_new AS (
    SELECT wf.id AS word_form_id
    FROM practice_box pb
    JOIN word_forms wf ON wf.root_word_id = pb.root_word_id
    JOIN word_form_types ft ON wf.form_type_id = ft.id
    WHERE pb.profile_id = v_user_id
      AND ft.name = 'nominative'
      AND NOT EXISTS (
        SELECT 1 FROM user_word_progress uwp
        WHERE uwp.profile_id = v_user_id
          AND uwp.word_form_id = wf.id
          AND uwp.mode = 'simple_vocabulary'
      )
    ORDER BY pb.created_at ASC
    LIMIT 2
  ),
  practiced AS (
    SELECT
      uwp.word_form_id,
      CASE WHEN pb.root_word_id IS NOT NULL THEN 1.0
           ELSE 1 - (
             (uwp.correct::float / GREATEST(uwp.correct + uwp.incorrect, 1))
             * exp(
                 -EXTRACT(EPOCH FROM (now() - uwp.last_practiced_at)) / 86400.0
                 / (GREATEST(uwp.correct, 1) * 3.0)
               )
           )
      END AS priority
    FROM user_word_progress uwp
    JOIN word_forms wf ON uwp.word_form_id = wf.id
    JOIN word_form_types ft ON wf.form_type_id = ft.id
    LEFT JOIN practice_box pb ON pb.root_word_id = wf.root_word_id AND pb.profile_id = v_user_id
    WHERE uwp.profile_id = v_user_id
      AND uwp.mode = 'simple_vocabulary'
      AND ft.name = 'nominative'
  ),
  new_candidates AS (
    SELECT wf.id AS word_form_id, 0.5 AS priority
    FROM word_forms wf
    JOIN root_words rw ON wf.root_word_id = rw.id
    JOIN word_form_types ft ON wf.form_type_id = ft.id
    WHERE ft.name = 'nominative'
      AND NOT EXISTS (
        SELECT 1 FROM user_word_progress uwp
        WHERE uwp.profile_id = v_user_id
          AND uwp.word_form_id = wf.id
          AND uwp.mode = 'simple_vocabulary'
      )
      AND wf.id NOT IN (SELECT word_form_id FROM pinned_new)
    ORDER BY rw.frequency_rank ASC NULLS LAST
    LIMIT 2
  ),
  selected AS (
    SELECT word_form_id FROM (
      SELECT word_form_id FROM pinned_new
      UNION ALL
      SELECT word_form_id FROM (SELECT word_form_id FROM practiced WHERE priority > 0.6 ORDER BY priority DESC LIMIT 4) struggling
      UNION ALL
      SELECT word_form_id FROM (SELECT word_form_id FROM practiced WHERE priority BETWEEN 0.3 AND 0.6 ORDER BY priority DESC LIMIT 4) reinforcing
      UNION ALL
      SELECT word_form_id FROM new_candidates
    ) all_candidates
    LIMIT 10
  )
  SELECT
    wf.id,
    rw.in_english,
    rw.in_czech,
    -- 3 distractors from nearby frequency band; fallback to random if band is sparse
    COALESCE(
      NULLIF(ARRAY(
        SELECT d.in_czech FROM root_words d
        WHERE d.id != rw.id
          AND d.frequency_rank BETWEEN rw.frequency_rank - 50 AND rw.frequency_rank + 50
        ORDER BY random() LIMIT 3
      ), '{}'),
      ARRAY(SELECT d.in_czech FROM root_words d WHERE d.id != rw.id ORDER BY random() LIMIT 3)
    ) AS distractors
  FROM selected s
  JOIN word_forms wf ON s.word_form_id = wf.id
  JOIN root_words rw ON wf.root_word_id = rw.id
  ORDER BY random();
END;
$$;


-- -----------------------------------------------------------------------------
-- 4. get_practice_progress
--    Progress screen: per-case accuracy + weekly gains for case_understanding
--    and form_recall. Returns one row per active case.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_practice_progress()
RETURNS TABLE (
  case_name          text,
  case_understanding numeric,   -- all-time accuracy (0–1), null if not started
  form_recall        numeric,   -- all-time accuracy (0–1), null if not started
  cu_gain_week       numeric,   -- case_understanding: this-week minus last-week accuracy
  fr_gain_week       numeric,   -- form_recall: this-week minus last-week accuracy
  total_attempts     int        -- total card attempts across all cases and modes
)
LANGUAGE sql
SECURITY INVOKER
AS $$
  WITH all_time AS (
    SELECT
      ft.name AS case_name,
      uwp.mode,
      SUM(uwp.correct)::numeric / NULLIF(SUM(uwp.correct + uwp.incorrect), 0) AS accuracy
    FROM user_word_progress uwp
    JOIN word_forms wf ON uwp.word_form_id = wf.id
    JOIN word_form_types ft ON wf.form_type_id = ft.id
    WHERE uwp.profile_id = auth.uid()
      AND ft.category = 'case'
      AND uwp.mode IN ('case_understanding', 'form_recall')
    GROUP BY ft.name, uwp.mode
  ),
  this_week AS (
    SELECT ft.name AS case_name, pa.mode,
      AVG(pa.is_correct::int) AS accuracy
    FROM practice_attempts pa
    JOIN word_forms wf ON pa.word_form_id = wf.id
    JOIN word_form_types ft ON wf.form_type_id = ft.id
    WHERE pa.profile_id = auth.uid()
      AND ft.category = 'case'
      AND pa.mode IN ('case_understanding', 'form_recall')
      AND pa.created_at >= now() - interval '7 days'
    GROUP BY ft.name, pa.mode
  ),
  last_week AS (
    SELECT ft.name AS case_name, pa.mode,
      AVG(pa.is_correct::int) AS accuracy
    FROM practice_attempts pa
    JOIN word_forms wf ON pa.word_form_id = wf.id
    JOIN word_form_types ft ON wf.form_type_id = ft.id
    WHERE pa.profile_id = auth.uid()
      AND ft.category = 'case'
      AND pa.mode IN ('case_understanding', 'form_recall')
      AND pa.created_at BETWEEN now() - interval '14 days' AND now() - interval '7 days'
    GROUP BY ft.name, pa.mode
  ),
  attempt_count AS (
    SELECT COUNT(*)::int AS total
    FROM practice_attempts
    WHERE profile_id = auth.uid()
      AND mode IN ('case_understanding', 'form_recall')
  )
  SELECT
    COALESCE(e.case_name, h.case_name) AS case_name,
    e.accuracy  AS case_understanding,
    h.accuracy  AS form_recall,
    tw_e.accuracy - lw_e.accuracy AS cu_gain_week,
    tw_h.accuracy - lw_h.accuracy AS fr_gain_week,
    (SELECT total FROM attempt_count) AS total_attempts
  FROM all_time e
  FULL OUTER JOIN all_time h   ON e.case_name = h.case_name AND h.mode = 'form_recall'
  LEFT JOIN this_week tw_e     ON tw_e.case_name = e.case_name AND tw_e.mode = 'case_understanding'
  LEFT JOIN last_week lw_e     ON lw_e.case_name = e.case_name AND lw_e.mode = 'case_understanding'
  LEFT JOIN this_week tw_h     ON tw_h.case_name = e.case_name AND tw_h.mode = 'form_recall'
  LEFT JOIN last_week lw_h     ON lw_h.case_name = e.case_name AND lw_h.mode = 'form_recall'
  WHERE e.mode = 'case_understanding';
$$;


-- -----------------------------------------------------------------------------
-- 5. get_known_words
--    Returns one row per known root word (SUM(correct) >= 10 across all forms
--    and modes). Includes which cases are known vs. partially practiced for
--    the Known Words screen case badges.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_known_words()
RETURNS TABLE (
  root_word_id    bigint,
  in_czech        text,
  in_english      text,
  known_cases     text[],   -- cases with >= 5 correct answers for this word's forms
  partial_cases   text[],   -- cases with any practice but < 5 correct
  last_practiced  timestamptz,
  is_dusty        boolean
)
LANGUAGE sql
SECURITY INVOKER
AS $$
  WITH word_case_totals AS (
    SELECT
      rw.id                         AS root_word_id,
      ft.name                       AS case_name,
      COALESCE(SUM(uwp.correct), 0) AS total_correct,
      MAX(uwp.last_practiced_at)    AS last_practiced
    FROM root_words rw
    JOIN word_forms wf          ON wf.root_word_id = rw.id
    JOIN word_form_types ft     ON wf.form_type_id = ft.id
    LEFT JOIN user_word_progress uwp
      ON uwp.word_form_id = wf.id AND uwp.profile_id = auth.uid()
    WHERE ft.category = 'case'
    GROUP BY rw.id, ft.name
  )
  SELECT
    rw.id,
    rw.in_czech,
    rw.in_english,
    ARRAY_AGG(DISTINCT wct.case_name) FILTER (WHERE wct.total_correct >= 5)                           AS known_cases,
    ARRAY_AGG(DISTINCT wct.case_name) FILTER (WHERE wct.total_correct > 0 AND wct.total_correct < 5) AS partial_cases,
    MAX(wct.last_practiced)                                                                            AS last_practiced,
    MAX(wct.last_practiced) < now() - interval '90 days'                                              AS is_dusty
  FROM root_words rw
  JOIN word_case_totals wct ON wct.root_word_id = rw.id
  GROUP BY rw.id, rw.in_czech, rw.in_english
  HAVING SUM(wct.total_correct) >= 10
  ORDER BY rw.in_czech;
$$;


-- -----------------------------------------------------------------------------
-- 6. build_dusty_session
--    Returns up to 10 cards (5 known+dusty words × 2 modes) for the
--    "Dusty Words" refresh quiz. The frontend alternates case_understanding
--    and form_recall per word.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION build_dusty_session()
RETURNS TABLE (
  word_form_id     bigint,
  mode             text,            -- 'case_understanding' | 'form_recall' (alternated by app)
  sentence_czech   text,
  sentence_english text,
  target_form      text,
  base_form        text,
  correct_case     text,
  explanation      text
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  WITH known_roots AS (
    SELECT wf.root_word_id, MAX(uwp.last_practiced_at) AS last_practiced
    FROM user_word_progress uwp
    JOIN word_forms wf ON uwp.word_form_id = wf.id
    WHERE uwp.profile_id = auth.uid()
    GROUP BY wf.root_word_id
    HAVING SUM(uwp.correct) >= 10
      AND MAX(uwp.last_practiced_at) < now() - interval '90 days'
  ),
  dusty AS (
    SELECT DISTINCT ON (wf.root_word_id) wf.id AS word_form_id
    FROM known_roots kr
    JOIN word_forms wf ON wf.root_word_id = kr.root_word_id
    JOIN word_form_types ft ON wf.form_type_id = ft.id
    WHERE ft.category = 'case'
    ORDER BY wf.root_word_id, kr.last_practiced ASC
    LIMIT 5  -- 5 words × 2 modes = 10 cards
  )
  SELECT
    wf.id,
    'case_understanding' AS mode,  -- frontend alternates mode per word
    es.czech_sentence,
    es.english_sentence,
    wf.form_in_czech,
    rw.in_czech,
    ft.name,
    es.explanation
  FROM dusty d
  JOIN word_forms wf ON d.word_form_id = wf.id
  JOIN root_words rw ON wf.root_word_id = rw.id
  JOIN word_form_types ft ON wf.form_type_id = ft.id
  JOIN LATERAL (
    SELECT e.czech_sentence, e.english_sentence, e.explanation
    FROM example_sentences e WHERE e.word_form_id = wf.id ORDER BY e.id LIMIT 1
  ) es ON true;
END;
$$;


-- -----------------------------------------------------------------------------
-- 7. get_practice_box_count
--    Lightweight function called on the Session Setup screen to show
--    how many words are currently pinned in the user's practice box.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_practice_box_count()
RETURNS int
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT COUNT(*)::int FROM practice_box WHERE profile_id = auth.uid();
$$;
