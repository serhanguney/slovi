export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1';
  };
  public: {
    Tables: {
      example_sentences: {
        Row: {
          created_at: string;
          czech_sentence: string;
          english_sentence: string;
          explanation: string | null;
          id: number;
          word_form_id: number;
        };
        Insert: {
          created_at?: string;
          czech_sentence: string;
          english_sentence: string;
          explanation?: string | null;
          id?: number;
          word_form_id: number;
        };
        Update: {
          created_at?: string;
          czech_sentence?: string;
          english_sentence?: string;
          explanation?: string | null;
          id?: number;
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
      root_words: {
        Row: {
          created_at: string;
          id: number;
          in_czech: string;
          in_english: string;
          is_verified: boolean;
          note: string | null;
          word_aspect: Database['public']['Enums']['word_aspect'] | null;
          word_type: Database['public']['Enums']['word_type'];
        };
        Insert: {
          created_at?: string;
          id?: number;
          in_czech: string;
          in_english: string;
          is_verified: boolean;
          note?: string | null;
          word_aspect?: Database['public']['Enums']['word_aspect'] | null;
          word_type: Database['public']['Enums']['word_type'];
        };
        Update: {
          created_at?: string;
          id?: number;
          in_czech?: string;
          in_english?: string;
          is_verified?: boolean;
          note?: string | null;
          word_aspect?: Database['public']['Enums']['word_aspect'] | null;
          word_type?: Database['public']['Enums']['word_type'];
        };
        Relationships: [];
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
          is_primary: boolean;
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
          is_primary: boolean;
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
          is_primary?: boolean;
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      immutable_unaccent: { Args: { '': string }; Returns: string };
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
        | 'verbal_noun';
      gender: 'masculine_animate' | 'feminine' | 'neuter' | 'masculine_inanimate' | 'masculine';
      person: '1' | '2' | '3';
      plurality: 'singular' | 'plural';
      tense: 'present' | 'past' | 'future';
      word_aspect: 'perfective' | 'imperfective';
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
      form_type_category: ['case', 'tense', 'mood', 'voice', 'participle', 'degree', 'verbal_noun'],
      gender: ['masculine_animate', 'feminine', 'neuter', 'masculine_inanimate', 'masculine'],
      person: ['1', '2', '3'],
      plurality: ['singular', 'plural'],
      tense: ['present', 'past', 'future'],
      word_aspect: ['perfective', 'imperfective'],
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
