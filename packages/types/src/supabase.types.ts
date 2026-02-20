export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
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
      events: {
        Row: {
          created_at: string;
          date: string;
          description: string | null;
          id: string;
          title: string | null;
          type: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          date?: string;
          description?: string | null;
          id?: string;
          title?: string | null;
          type: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          date?: string;
          description?: string | null;
          id?: string;
          title?: string | null;
          type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      event_participants: {
        Row: {
          event_id: string;
          created_at: string;
          person_id: string;
        };
        Insert: {
          event_id: string;
          created_at?: string;
          person_id: string;
        };
        Update: {
          event_id?: string;
          created_at?: string;
          person_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_participants_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
        ];
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
      people: {
        Row: {
          avatar: string | null;
          avatar_color: string | null;
          connections: string[] | null;
          created_at: string | null;
          description: string | null;
          first_name: string;
          gender: string | null;
          id: string;
          language: string | null;
          last_interaction: string | null;
          last_name: string | null;
          latitude: number | null;
          location: unknown;
          longitude: number | null;
          middle_name: string | null;
          myself: boolean | null;
          nickname: string | null;
          notes: string | null;
          pgp_public_key: string | null;
          place: string | null;
          position: Json | null;
          timezone: string | null;
          title: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          avatar?: string | null;
          avatar_color?: string | null;
          connections?: string[] | null;
          created_at?: string | null;
          description?: string | null;
          first_name: string;
          gender?: string | null;
          id?: string;
          language?: string | null;
          last_interaction?: string | null;
          last_name?: string | null;
          latitude?: number | null;
          location?: unknown;
          longitude?: number | null;
          middle_name?: string | null;
          myself?: boolean | null;
          nickname?: string | null;
          notes?: string | null;
          pgp_public_key?: string | null;
          place?: string | null;
          position?: Json | null;
          timezone?: string | null;
          title?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          avatar?: string | null;
          avatar_color?: string | null;
          connections?: string[] | null;
          created_at?: string | null;
          description?: string | null;
          first_name?: string;
          gender?: string | null;
          id?: string;
          language?: string | null;
          last_interaction?: string | null;
          last_name?: string | null;
          latitude?: number | null;
          location?: unknown;
          longitude?: number | null;
          middle_name?: string | null;
          myself?: boolean | null;
          nickname?: string | null;
          notes?: string | null;
          pgp_public_key?: string | null;
          place?: string | null;
          position?: Json | null;
          timezone?: string | null;
          title?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      people_emails: {
        Row: {
          created_at: string;
          id: string;
          person_id: string;
          preferred: boolean;
          sort_order: number;
          type: string;
          updated_at: string;
          user_id: string;
          value: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          person_id: string;
          preferred?: boolean;
          sort_order?: number;
          type?: string;
          updated_at?: string;
          user_id: string;
          value: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          person_id?: string;
          preferred?: boolean;
          sort_order?: number;
          type?: string;
          updated_at?: string;
          user_id?: string;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: "people_emails_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
        ];
      };
      people_groups: {
        Row: {
          created_at: string | null;
          group_id: string;
          id: string;
          person_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          group_id: string;
          id?: string;
          person_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          group_id?: string;
          id?: string;
          person_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "people_groups_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "people_groups_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
        ];
      };
      people_important_events: {
        Row: {
          created_at: string;
          event_date: string;
          event_type: string;
          id: string;
          note: string | null;
          notify_days_before: number | null;
          notify_on: string | null;
          person_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          event_date: string;
          event_type: string;
          id?: string;
          note?: string | null;
          notify_days_before?: number | null;
          notify_on?: string | null;
          person_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event_date?: string;
          event_type?: string;
          id?: string;
          note?: string | null;
          notify_days_before?: number | null;
          notify_on?: string | null;
          person_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "people_important_events_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
        ];
      };
      people_phones: {
        Row: {
          created_at: string;
          id: string;
          person_id: string;
          preferred: boolean;
          prefix: string;
          sort_order: number;
          type: string;
          updated_at: string;
          user_id: string;
          value: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          person_id: string;
          preferred?: boolean;
          prefix?: string;
          sort_order?: number;
          type?: string;
          updated_at?: string;
          user_id: string;
          value: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          person_id?: string;
          preferred?: boolean;
          prefix?: string;
          sort_order?: number;
          type?: string;
          updated_at?: string;
          user_id?: string;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: "people_phones_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
        ];
      };
      people_relationships: {
        Row: {
          created_at: string;
          id: string;
          relationship_type: string;
          source_person_id: string;
          target_person_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          relationship_type: string;
          source_person_id: string;
          target_person_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          relationship_type?: string;
          source_person_id?: string;
          target_person_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "people_relationships_source_person_id_fkey";
            columns: ["source_person_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "people_relationships_target_person_id_fkey";
            columns: ["target_person_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
        ];
      };
      people_social_media: {
        Row: {
          connected_at: string | null;
          created_at: string;
          handle: string;
          id: string;
          person_id: string;
          platform: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          connected_at?: string | null;
          created_at?: string;
          handle: string;
          id?: string;
          person_id: string;
          platform: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          connected_at?: string | null;
          created_at?: string;
          handle?: string;
          id?: string;
          person_id?: string;
          platform?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "people_social_media_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
        ];
      };
      reminder_dispatch_log: {
        Row: {
          created_at: string;
          id: string;
          reminder_date: string;
          timezone: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          reminder_date: string;
          timezone: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          reminder_date?: string;
          timezone?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          avatar_url: string | null;
          color_scheme: Database["public"]["Enums"]["color_scheme"];
          created_at: string | null;
          id: string;
          language: string | null;
          middlename: string | null;
          name: string | null;
          next_reminder_at_utc: string;
          reminder_send_hour: string;
          surname: string | null;
          timezone: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          color_scheme?: Database["public"]["Enums"]["color_scheme"];
          created_at?: string | null;
          id?: string;
          language?: string | null;
          middlename?: string | null;
          name?: string | null;
          next_reminder_at_utc: string;
          reminder_send_hour?: string;
          surname?: string | null;
          timezone?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          avatar_url?: string | null;
          color_scheme?: Database["public"]["Enums"]["color_scheme"];
          created_at?: string | null;
          id?: string;
          language?: string | null;
          middlename?: string | null;
          name?: string | null;
          next_reminder_at_utc?: string;
          reminder_send_hour?: string;
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
      compute_next_reminder_at_utc: {
        Args: {
          base_ts?: string;
          input_send_hour: string;
          input_timezone: string;
        };
        Returns: string;
      };
      send_daily_reminder_digests: {
        Args: { target_date?: string };
        Returns: Json;
      };
      send_hourly_reminder_digests: { Args: never; Returns: Json };
    };
    Enums: {
      color_scheme: "light" | "dark" | "auto";
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
    Enums: {
      color_scheme: ["light", "dark", "auto"],
    },
  },
} as const;
