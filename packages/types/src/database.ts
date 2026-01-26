/**
 * Supabase Database Types
 * Auto-generated types for Supabase database schema
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      people: {
        Row: {
          avatar: string | null;
          avatar_color: string | null;
          birthdate: string | null;
          connections: string[] | null;
          group_ids: string[];
          created_at: string | null;
          description: string | null;
          email: string | null;
          emails: Json | null;
          facebook: string | null;
          first_name: string;
          gender: string | null;
          id: string;
          important_dates: Json | null;
          instagram: string | null;
          language: string | null;
          last_interaction: string | null;
          last_name: string | null;
          linkedin: string | null;
          location: string | null;
          latitude: number | null;
          longitude: number | null;
          middle_name: string | null;
          myself: boolean | null;
          nickname: string | null;
          notes: string | null;
          notify_birthday: boolean | null;
          phone: string | null;
          phones: Json | null;
          place: string | null;
          position: Json | null;
          pgp_public_key: string | null;
          signal: string | null;
          title: string | null;
          timezone: string | null;
          updated_at: string | null;
          user_id: string;
          website: string | null;
          whatsapp: string | null;
        };
        Insert: {
          avatar?: string | null;
          avatar_color?: string | null;
          birthdate?: string | null;
          connections?: string[] | null;
          group_ids?: string[];
          created_at?: string | null;
          description?: string | null;
          email?: string | null;
          emails?: Json | null;
          facebook?: string | null;
          first_name: string;
          gender?: string | null;
          id?: string;
          important_dates?: Json | null;
          instagram?: string | null;
          language?: string | null;
          last_interaction?: string | null;
          last_name?: string | null;
          linkedin?: string | null;
          location?: string | null;
          middle_name?: string | null;
          myself?: boolean | null;
          nickname?: string | null;
          notes?: string | null;
          notify_birthday?: boolean | null;
          phone?: string | null;
          phones?: Json | null;
          place?: string | null;
          position?: Json | null;
          pgp_public_key?: string | null;
          signal?: string | null;
          title?: string | null;
          timezone?: string | null;
          updated_at?: string | null;
          user_id: string;
          website?: string | null;
          whatsapp?: string | null;
        };
        Update: {
          avatar?: string | null;
          avatar_color?: string | null;
          birthdate?: string | null;
          connections?: string[] | null;
          group_ids?: string[];
          created_at?: string | null;
          description?: string | null;
          email?: string | null;
          emails?: Json | null;
          facebook?: string | null;
          first_name?: string;
          gender?: string | null;
          id?: string;
          important_dates?: Json | null;
          instagram?: string | null;
          language?: string | null;
          last_interaction?: string | null;
          last_name?: string;
          linkedin?: string | null;
          location?: string | null;
          middle_name?: string | null;
          myself?: boolean | null;
          nickname?: string | null;
          notes?: string | null;
          notify_birthday?: boolean | null;
          phone?: string | null;
          phones?: Json | null;
          place?: string | null;
          position?: Json | null;
          pgp_public_key?: string | null;
          signal?: string | null;
          title?: string | null;
          timezone?: string | null;
          updated_at?: string | null;
          user_id?: string;
          website?: string | null;
          whatsapp?: string | null;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          color: string | null;
          created_at: string | null;
          emoji: string | null;
          id: string;
          label: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string | null;
          emoji?: string | null;
          id?: string;
          label: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          color?: string | null;
          created_at?: string | null;
          emoji?: string | null;
          id?: string;
          label?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      people_groups: {
        Row: {
          created_at: string | null;
          group_id: string;
          id: string;
          person_id: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          group_id: string;
          id?: string;
          person_id: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          group_id?: string;
          id?: string;
          person_id?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          id: string;
          language: string | null;
          middlename: string | null;
          name: string | null;
          surname: string | null;
          timezone: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          id?: string;
          language?: string | null;
          middlename?: string | null;
          name?: string | null;
          surname?: string | null;
          timezone?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          id?: string;
          language?: string | null;
          middlename?: string | null;
          name?: string | null;
          surname?: string | null;
          timezone?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
