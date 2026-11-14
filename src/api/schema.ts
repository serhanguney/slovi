export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1';
  };
  public: {
    Tables: {
      aspect_examples: {
        Row: {
          answer_form_id: number;
          created_at: string;
          czech_sentence: string;
          distractor_form_id: number;
          english_sentence: string;
          explanation: string;
          id: number;
          qa: Json | null;
          signal: string;
          source: string;
        };
        Insert: {
          answer_form_id: number;
          created_at?: string;
          czech_sentence: string;
          distractor_form_id: number;
          english_sentence: string;
          explanation: string;
          id?: never;
          qa?: Json | null;
          signal: string;
          source?: string;
        };
        Update: {
          answer_form_id?: number;
          created_at?: string;
          czech_sentence?: string;
          distractor_form_id?: number;
          english_sentence?: string;
          explanation?: string;
          id?: never;
          qa?: Json | null;
          signal?: string;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'aspect_examples_answer_form_id_fkey';
            columns: ['answer_form_id'];
            isOneToOne: false;
            referencedRelation: 'word_forms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'aspect_examples_distractor_form_id_fkey';
            columns: ['distractor_form_id'];
            isOneToOne: false;
            referencedRelation: 'word_forms';
            referencedColumns: ['id'];
          },
        ];
      };
      blocked_words: {
        Row: {
          created_at: string;
          id: number;
          profile_id: string;
          root_word_id: number;
        };
        Insert: {
          created_at?: string;
          id?: number;
          profile_id?: string;
          root_word_id: number;
        };
        Update: {
          created_at?: string;
          id?: number;
          profile_id?: string;
          root_word_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'blocked_words_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['profile_id'];
          },
          {
            foreignKeyName: 'blocked_words_root_word_id_fkey';
            columns: ['root_word_id'];
            isOneToOne: false;
            referencedRelation: 'root_words';
            referencedColumns: ['id'];
          },
        ];
      };
      example_sentences: {
        Row: {
          created_at: string;
          czech_sentence: string;
          english_sentence: string;
          explanation: string | null;
          id: number;
          qa: Json | null;
          source: string;
          source_ref: string | null;
          word_form_id: number;
        };
        Insert: {
          created_at?: string;
          czech_sentence: string;
          english_sentence: string;
          explanation?: string | null;
          id?: number;
          qa?: Json | null;
          source?: string;
          source_ref?: string | null;
          word_form_id: number;
        };
        Update: {
          created_at?: string;
          czech_sentence?: string;
          english_sentence?: string;
          explanation?: string | null;
          id?: number;
          qa?: Json | null;
          source?: string;
          source_ref?: string | null;
          word_form_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'example_sentences_word_form_id_fkey';
            columns: ['word_form_id'];
            isOneToOne: false;
            referencedRelation: 'word_forms';
            referencedColumns: ['id'];
          },
        ];
      };
      lemma_frequencies: {
        Row: {
          checked_at: string | null;
          frequency: number;
          ipm: number;
          lemma: string;
          rank: number;
          source: string;
          word_types: Database['public']['Enums']['word_type'][] | null;
        };
        Insert: {
          checked_at?: string | null;
          frequency: number;
          ipm: number;
          lemma: string;
          rank: number;
          source?: string;
          word_types?: Database['public']['Enums']['word_type'][] | null;
        };
        Update: {
          checked_at?: string | null;
          frequency?: number;
          ipm?: number;
          lemma?: string;
          rank?: number;
          source?: string;
          word_types?: Database['public']['Enums']['word_type'][] | null;
        };
        Relationships: [];
      };
      practice_attempts: {
        Row: {
          created_at: string;
          id: number;
          is_correct: boolean;
          mode: Database['public']['Enums']['practice_mode'];
          profile_id: string;
          word_form_id: number;
        };
        Insert: {
          created_at?: string;
          id?: number;
          is_correct: boolean;
          mode: Database['public']['Enums']['practice_mode'];
          profile_id: string;
          word_form_id: number;
        };
        Update: {
          created_at?: string;
          id?: number;
          is_correct?: boolean;
          mode?: Database['public']['Enums']['practice_mode'];
          profile_id?: string;
          word_form_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'practice_attempts_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['profile_id'];
          },
          {
            foreignKeyName: 'practice_attempts_word_form_id_fkey';
            columns: ['word_form_id'];
            isOneToOne: false;
            referencedRelation: 'word_forms';
            referencedColumns: ['id'];
          },
        ];
      };
      practice_box: {
        Row: {
          created_at: string;
          id: number;
          profile_id: string;
          root_word_id: number;
        };
        Insert: {
          created_at?: string;
          id?: number;
          profile_id?: string;
          root_word_id: number;
        };
        Update: {
          created_at?: string;
          id?: number;
          profile_id?: string;
          root_word_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'practice_box_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['profile_id'];
          },
          {
            foreignKeyName: 'practice_box_root_word_id_fkey';
            columns: ['root_word_id'];
            isOneToOne: false;
            referencedRelation: 'root_words';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          id: number;
          name: string;
          profile_id: string;
          surname: string;
        };
        Insert: {
          created_at?: string;
          id?: number;
          name: string;
          profile_id?: string;
          surname: string;
        };
        Update: {
          created_at?: string;
          id?: number;
          name?: string;
          profile_id?: string;
          surname?: string;
        };
        Relationships: [];
      };
      root_words: {
        Row: {
          created_at: string;
          frequency_ipm: number | null;
          frequency_rank: number | null;
          gender: Database['public']['Enums']['gender'] | null;
          id: number;
          in_czech: string;
          in_english: string;
          is_verified: boolean;
          lemma_id: string;
          note: string | null;
          qa_report: Json | null;
          reflexive: string | null;
          source: string;
          word_aspect: Database['public']['Enums']['word_aspect'] | null;
          word_type: Database['public']['Enums']['word_type'];
        };
        Insert: {
          created_at?: string;
          frequency_ipm?: number | null;
          frequency_rank?: number | null;
          gender?: Database['public']['Enums']['gender'] | null;
          id?: number;
          in_czech: string;
          in_english: string;
          is_verified: boolean;
          lemma_id: string;
          note?: string | null;
          qa_report?: Json | null;
          reflexive?: string | null;
          source?: string;
          word_aspect?: Database['public']['Enums']['word_aspect'] | null;
          word_type: Database['public']['Enums']['word_type'];
        };
        Update: {
          created_at?: string;
          frequency_ipm?: number | null;
          frequency_rank?: number | null;
          gender?: Database['public']['Enums']['gender'] | null;
          id?: number;
          in_czech?: string;
          in_english?: string;
          is_verified?: boolean;
          lemma_id?: string;
          note?: string | null;
          qa_report?: Json | null;
          reflexive?: string | null;
          source?: string;
          word_aspect?: Database['public']['Enums']['word_aspect'] | null;
          word_type?: Database['public']['Enums']['word_type'];
        };
        Relationships: [];
      };
      user_word_progress: {
        Row: {
          correct: number;
          created_at: string;
          id: number;
          incorrect: number;
          last_practiced_at: string;
          mode: Database['public']['Enums']['practice_mode'];
          profile_id: string;
          word_form_id: number;
        };
        Insert: {
          correct: number;
          created_at?: string;
          id?: number;
          incorrect: number;
          last_practiced_at: string;
          mode: Database['public']['Enums']['practice_mode'];
          profile_id: string;
          word_form_id: number;
        };
        Update: {
          correct?: number;
          created_at?: string;
          id?: number;
          incorrect?: number;
          last_practiced_at?: string;
          mode?: Database['public']['Enums']['practice_mode'];
          profile_id?: string;
          word_form_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'user_word_progress_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['profile_id'];
          },
          {
            foreignKeyName: 'user_word_progress_word_form_id_fkey';
            columns: ['word_form_id'];
            isOneToOne: false;
            referencedRelation: 'word_forms';
            referencedColumns: ['id'];
          },
        ];
      };
      word_form_types: {
        Row: {
          category: Database['public']['Enums']['form_type_category'];
          created_at: string;
          explanation: string | null;
          id: number;
          name: string;
        };
        Insert: {
          category: Database['public']['Enums']['form_type_category'];
          created_at?: string;
          explanation?: string | null;
          id?: number;
          name: string;
        };
        Update: {
          category?: Database['public']['Enums']['form_type_category'];
          created_at?: string;
          explanation?: string | null;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      word_forms: {
        Row: {
          created_at: string;
          form_in_czech: string;
          form_type_id: number;
          gender: Database['public']['Enums']['gender'] | null;
          id: number;
          is_lemma_form: boolean;
          is_primary: boolean;
          morph_tag: string | null;
          person: Database['public']['Enums']['person'] | null;
          plurality: Database['public']['Enums']['plurality'];
          root_word_id: number;
          tense: Database['public']['Enums']['tense'] | null;
        };
        Insert: {
          created_at?: string;
          form_in_czech: string;
          form_type_id: number;
          gender?: Database['public']['Enums']['gender'] | null;
          id?: number;
          is_lemma_form?: boolean;
          is_primary: boolean;
          morph_tag?: string | null;
          person?: Database['public']['Enums']['person'] | null;
          plurality: Database['public']['Enums']['plurality'];
          root_word_id: number;
          tense?: Database['public']['Enums']['tense'] | null;
        };
        Update: {
          created_at?: string;
          form_in_czech?: string;
          form_type_id?: number;
          gender?: Database['public']['Enums']['gender'] | null;
          id?: number;
          is_lemma_form?: boolean;
          is_primary?: boolean;
          morph_tag?: string | null;
          person?: Database['public']['Enums']['person'] | null;
          plurality?: Database['public']['Enums']['plurality'];
          root_word_id?: number;
          tense?: Database['public']['Enums']['tense'] | null;
        };
        Relationships: [
          {
            foreignKeyName: 'word_forms_form_type_id_fkey';
            columns: ['form_type_id'];
            isOneToOne: false;
            referencedRelation: 'word_form_types';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'word_forms_root_word_id_fkey';
            columns: ['root_word_id'];
            isOneToOne: false;
            referencedRelation: 'root_words';
            referencedColumns: ['id'];
          },
        ];
      };
      word_relations: {
        Row: {
          created_at: string;
          from_root_id: number;
          id: number;
          relation_type: Database['public']['Enums']['word_relation_type'];
          source: string;
          to_lemma: string;
          to_root_id: number | null;
          to_word_type: Database['public']['Enums']['word_type'] | null;
        };
        Insert: {
          created_at?: string;
          from_root_id: number;
          id?: never;
          relation_type: Database['public']['Enums']['word_relation_type'];
          source: string;
          to_lemma: string;
          to_root_id?: number | null;
          to_word_type?: Database['public']['Enums']['word_type'] | null;
        };
        Update: {
          created_at?: string;
          from_root_id?: number;
          id?: never;
          relation_type?: Database['public']['Enums']['word_relation_type'];
          source?: string;
          to_lemma?: string;
          to_root_id?: number | null;
          to_word_type?: Database['public']['Enums']['word_type'] | null;
        };
        Relationships: [
          {
            foreignKeyName: 'word_relations_from_root_id_fkey';
            columns: ['from_root_id'];
            isOneToOne: false;
            referencedRelation: 'root_words';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'word_relations_to_root_id_fkey';
            columns: ['to_root_id'];
            isOneToOne: false;
            referencedRelation: 'root_words';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      build_aspect_session: {
        Args: { p_allow_new_words?: boolean };
        Returns: {
          answer_aspect: string;
          answer_form: string;
          aspect_example_id: number;
          distractor_form: string;
          explanation: string;
          imperfective: string;
          imperfective_english: string;
          is_new_word: boolean;
          perfective: string;
          perfective_english: string;
          root_word_id: number;
          sentence_czech: string;
          sentence_english: string;
          signal: string;
          word_form_id: number;
        }[];
      };
      build_case_study_session: {
        Args: { p_root_word_ids: number[] };
        Returns: {
          base_form: string;
          correct_case: string;
          explanation: string;
          gender: string;
          options: string[];
          plurality: string;
          root_word_id: number;
          sentence_czech: string;
          sentence_english: string;
          target_form: string;
          word_form_id: number;
        }[];
      };
      build_dusty_session: {
        Args: never;
        Returns: {
          base_form: string;
          correct_case: string;
          explanation: string;
          is_new_word: boolean;
          mode: string;
          sentence_czech: string;
          sentence_english: string;
          target_form: string;
          word_form_id: number;
        }[];
      };
      build_practice_session: {
        Args: {
          p_allow_new_words?: boolean;
          p_mode: Database['public']['Enums']['practice_mode'];
          p_scope: string;
          p_word_type?: Database['public']['Enums']['word_type'];
        };
        Returns: {
          base_form: string;
          correct_case: string;
          explanation: string;
          in_english: string;
          is_new_word: boolean;
          root_word_id: number;
          sentence_czech: string;
          sentence_english: string;
          target_form: string;
          word_form_id: number;
        }[];
      };
      build_vocabulary_session: {
        Args: { p_allow_new_words?: boolean };
        Returns: {
          base_form: string;
          correct_czech: string;
          distractors: string[];
          in_english: string;
          is_new_word: boolean;
          root_word_id: number;
          sentence_czech: string;
          sentence_english: string;
          target_form: string;
          word_form_id: number;
        }[];
      };
      compute_ars_priority: {
        Args: {
          p_correct: number;
          p_days_since: number;
          p_incorrect: number;
          p_is_pinned: boolean;
        };
        Returns: number;
      };
      english_senses: { Args: { p_text: string }; Returns: string[] };
      get_form_recall_eligible_count: {
        Args: never;
        Returns: {
          eligible_count: number;
          scope: string;
          word_type: string;
        }[];
      };
      get_known_words: {
        Args: never;
        Returns: {
          in_czech: string;
          in_english: string;
          is_dusty: boolean;
          known_cases: string[];
          last_practiced: string;
          partial_cases: string[];
          root_word_id: number;
        }[];
      };
      get_practice_box_count: { Args: never; Returns: number };
      get_practice_progress: {
        Args: never;
        Returns: {
          case_name: string;
          case_understanding: number;
          cu_gain_week: number;
          form_recall: number;
          fr_gain_week: number;
          total_attempts: number;
        }[];
      };
      get_user_word_list: {
        Args: { p_search?: string };
        Returns: {
          cu_accuracy: number;
          cu_status: string;
          fr_accuracy: number;
          fr_status: string;
          in_czech: string;
          in_english: string;
          is_blocked: boolean;
          is_in_box: boolean;
          is_known: boolean;
          last_practiced: string;
          practiced_cases: string[];
          root_word_id: number;
          sv_accuracy: number;
          sv_status: string;
          word_type: string;
        }[];
      };
      immutable_unaccent: { Args: { '': string }; Returns: string };
      insert_aspect_examples: { Args: { payload: Json }; Returns: number };
      insert_generated_word: { Args: { payload: Json }; Returns: number };
      known_word_threshold: { Args: never; Returns: number };
      list_aspect_pairs: {
        Args: never;
        Returns: {
          example_count: number;
          imperfective_id: number;
          perfective_id: number;
        }[];
      };
      record_practice_answer: {
        Args: {
          p_is_correct: boolean;
          p_mode: Database['public']['Enums']['practice_mode'];
          p_word_form_id: number;
        };
        Returns: Json;
      };
      search_dictionary: {
        Args: { p_limit?: number; p_query: string };
        Returns: {
          example_czech: string;
          example_english: string;
          form_type_name: string;
          matched_form: string;
          rank: number;
          root_word_czech: string;
          root_word_english: string;
          root_word_id: number;
          root_word_note: string;
          similarity: number;
          word_aspect: string;
          word_type: string;
        }[];
      };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { '': string }; Returns: string[] };
      unaccent: { Args: { '': string }; Returns: string };
    };
    Enums: {
      form_type_category:
        | 'case'
        | 'tense'
        | 'mood'
        | 'voice'
        | 'participle'
        | 'degree'
        | 'verbal_noun'
        | 'infinitive';
      gender: 'masculine_animate' | 'feminine' | 'neuter' | 'masculine_inanimate' | 'masculine';
      person: '1' | '2' | '3';
      plurality: 'singular' | 'plural';
      practice_mode:
        | 'case_understanding'
        | 'form_recall'
        | 'simple_vocabulary'
        | 'case_study'
        | 'aspect_choice';
      tense: 'present' | 'past' | 'future';
      word_aspect: 'perfective' | 'imperfective' | 'biaspectual';
      word_relation_type:
        | 'synonym'
        | 'antonym'
        | 'negation'
        | 'aspect_pair'
        | 'diminutive'
        | 'derived'
        | 'verbal_noun';
      word_type:
        | 'noun'
        | 'verb'
        | 'pronoun'
        | 'adjective'
        | 'adverb'
        | 'preposition'
        | 'conjunction'
        | 'numeral';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      form_type_category: [
        'case',
        'tense',
        'mood',
        'voice',
        'participle',
        'degree',
        'verbal_noun',
        'infinitive',
      ],
      gender: ['masculine_animate', 'feminine', 'neuter', 'masculine_inanimate', 'masculine'],
      person: ['1', '2', '3'],
      plurality: ['singular', 'plural'],
      practice_mode: [
        'case_understanding',
        'form_recall',
        'simple_vocabulary',
        'case_study',
        'aspect_choice',
      ],
      tense: ['present', 'past', 'future'],
      word_aspect: ['perfective', 'imperfective', 'biaspectual'],
      word_relation_type: [
        'synonym',
        'antonym',
        'negation',
        'aspect_pair',
        'diminutive',
        'derived',
        'verbal_noun',
      ],
      word_type: [
        'noun',
        'verb',
        'pronoun',
        'adjective',
        'adverb',
        'preposition',
        'conjunction',
        'numeral',
      ],
    },
  },
} as const;
