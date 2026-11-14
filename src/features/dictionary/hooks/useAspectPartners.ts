import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/api/client';

const aspectPartnerSchema = z.object({
  id: z.number(),
  in_czech: z.string(),
  in_english: z.string(),
  word_aspect: z.enum(['perfective', 'imperfective', 'biaspectual']).nullable(),
});

type AspectPartner = z.infer<typeof aspectPartnerSchema>;

const PARTNER_COLUMNS = 'id, in_czech, in_english, word_aspect';

/**
 * Aspect pairs come from each verb's own Wiktionary entry, so a link can exist in one
 * direction only (vypnout → vypínat, but vypínat has no entry of its own). Read both.
 */
const fetchAspectPartners = async (rootWordId: number): Promise<AspectPartner[]> => {
  const [outgoing, incoming] = await Promise.all([
    supabase
      .from('word_relations')
      .select(`partner:root_words!word_relations_to_root_id_fkey(${PARTNER_COLUMNS})`)
      .eq('relation_type', 'aspect_pair')
      .eq('from_root_id', rootWordId)
      .not('to_root_id', 'is', null),
    supabase
      .from('word_relations')
      .select(`partner:root_words!word_relations_from_root_id_fkey(${PARTNER_COLUMNS})`)
      .eq('relation_type', 'aspect_pair')
      .eq('to_root_id', rootWordId),
  ]);

  if (outgoing.error) throw new Error(outgoing.error.message);
  if (incoming.error) throw new Error(incoming.error.message);

  const partners = z
    .array(aspectPartnerSchema)
    .parse([...outgoing.data, ...incoming.data].map((row) => row.partner));

  return partners.filter(
    (partner, index) => partners.findIndex((other) => other.id === partner.id) === index
  );
};

export const useAspectPartners = (rootWordId: number, enabled: boolean) => {
  return useQuery({
    queryKey: ['aspect-partners', rootWordId],
    queryFn: () => fetchAspectPartners(rootWordId),
    enabled,
    staleTime: 1000 * 60 * 10,
  });
};
