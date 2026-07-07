export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_id: string
          key_prefix: string
          label: string
          last_used_at: string | null
          permission: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_id: string
          key_prefix: string
          label: string
          last_used_at?: string | null
          permission: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_id?: string
          key_prefix?: string
          label?: string
          last_used_at?: string | null
          permission?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: Json
          created_at: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: Json
          created_at?: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      geocode_cache: {
        Row: {
          city: string | null
          country: string | null
          country_code: string | null
          created_at: string
          formatted_label: string | null
          geocode_found: boolean
          id: string
          lat: number | null
          location_ewkt: string | null
          lon: number | null
          name: string | null
          place_key: string
          place_original: string
          state: string | null
          state_code: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          formatted_label?: string | null
          geocode_found?: boolean
          id?: string
          lat?: number | null
          location_ewkt?: string | null
          lon?: number | null
          name?: string | null
          place_key: string
          place_original: string
          state?: string | null
          state_code?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          formatted_label?: string | null
          geocode_found?: boolean
          id?: string
          lat?: number | null
          location_ewkt?: string | null
          lon?: number | null
          name?: string | null
          place_key?: string
          place_original?: string
          state?: string | null
          state_code?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          color: string | null
          created_at: string
          emoji: string | null
          id: string
          label: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          label: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          label?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      interaction_participants: {
        Row: {
          created_at: string
          interaction_id: string
          person_id: string
        }
        Insert: {
          created_at?: string
          interaction_id: string
          person_id: string
        }
        Update: {
          created_at?: string
          interaction_id?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interaction_participants_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interaction_participants_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          created_at: string
          date: string
          description: string | null
          id: string
          title: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          title?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          title?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      linkedin_enrich_queue: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          person_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          person_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          person_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "linkedin_enrich_queue_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          email: string
          polar_customer_id: string
          polar_subscription_id: string
          status: string
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          email: string
          polar_customer_id: string
          polar_subscription_id: string
          status: string
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          email?: string
          polar_customer_id?: string
          polar_subscription_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          created_at: string
          first_name: string
          gis_point: unknown
          has_avatar: boolean
          headline: string | null
          id: string
          keep_frequency_days: number | null
          language: string | null
          last_interaction: string | null
          last_interaction_activity_id: string | null
          last_name: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          middle_name: string | null
          myself: boolean | null
          notes: string | null
          notes_updated_at: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_name: string
          gis_point?: unknown
          has_avatar?: boolean
          headline?: string | null
          id?: string
          keep_frequency_days?: number | null
          language?: string | null
          last_interaction?: string | null
          last_interaction_activity_id?: string | null
          last_name?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          middle_name?: string | null
          myself?: boolean | null
          notes?: string | null
          notes_updated_at?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_name?: string
          gis_point?: unknown
          has_avatar?: boolean
          headline?: string | null
          id?: string
          keep_frequency_days?: number | null
          language?: string | null
          last_interaction?: string | null
          last_interaction_activity_id?: string | null
          last_name?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          middle_name?: string | null
          myself?: boolean | null
          notes?: string | null
          notes_updated_at?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_last_interaction_activity_id_fkey"
            columns: ["last_interaction_activity_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
        ]
      }
      people_addresses: {
        Row: {
          address_city: string | null
          address_country: string | null
          address_country_code: string | null
          address_formatted: string | null
          address_geocode_source: string | null
          address_granularity: string
          address_line1: string | null
          address_line2: string | null
          address_postal_code: string | null
          address_state: string | null
          address_state_code: string | null
          created_at: string
          geocode_confidence: string | null
          gis_point: unknown
          id: string
          label: string | null
          latitude: number | null
          longitude: number | null
          person_id: string
          sort_order: number
          timezone: string | null
          type: string
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          address_city?: string | null
          address_country?: string | null
          address_country_code?: string | null
          address_formatted?: string | null
          address_geocode_source?: string | null
          address_granularity?: string
          address_line1?: string | null
          address_line2?: string | null
          address_postal_code?: string | null
          address_state?: string | null
          address_state_code?: string | null
          created_at?: string
          geocode_confidence?: string | null
          gis_point?: unknown
          id?: string
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          person_id: string
          sort_order?: number
          timezone?: string | null
          type?: string
          updated_at?: string
          user_id: string
          value: string
        }
        Update: {
          address_city?: string | null
          address_country?: string | null
          address_country_code?: string | null
          address_formatted?: string | null
          address_geocode_source?: string | null
          address_granularity?: string
          address_line1?: string | null
          address_line2?: string | null
          address_postal_code?: string | null
          address_state?: string | null
          address_state_code?: string | null
          created_at?: string
          geocode_confidence?: string | null
          gis_point?: unknown
          id?: string
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          person_id?: string
          sort_order?: number
          timezone?: string | null
          type?: string
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_addresses_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      people_education_history: {
        Row: {
          created_at: string
          degree: string | null
          description: string | null
          end_date: string | null
          id: string
          people_linkedin_id: string
          school_linkedin_id: string | null
          school_name: string
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          degree?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          people_linkedin_id: string
          school_linkedin_id?: string | null
          school_name: string
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          degree?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          people_linkedin_id?: string
          school_linkedin_id?: string | null
          school_name?: string
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_education_history_people_linkedin_id_fkey"
            columns: ["people_linkedin_id"]
            isOneToOne: false
            referencedRelation: "people_linkedin"
            referencedColumns: ["id"]
          },
        ]
      }
      people_emails: {
        Row: {
          created_at: string
          id: string
          person_id: string
          preferred: boolean
          sort_order: number
          type: string
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          person_id: string
          preferred?: boolean
          sort_order?: number
          type?: string
          updated_at?: string
          user_id: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          person_id?: string
          preferred?: boolean
          sort_order?: number
          type?: string
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_emails_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      people_groups: {
        Row: {
          created_at: string
          group_id: string
          id: string
          person_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          person_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          person_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_groups_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      people_important_dates: {
        Row: {
          created_at: string
          date: string
          id: string
          note: string | null
          notify_days_before: number | null
          notify_on: string | null
          person_id: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          note?: string | null
          notify_days_before?: number | null
          notify_on?: string | null
          person_id: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          notify_days_before?: number | null
          notify_on?: string | null
          person_id?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_important_dates_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      people_linkedin: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          person_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: string
          person_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          person_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_linkedin_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      people_merge_recommendations: {
        Row: {
          algorithm_version: string
          created_at: string
          id: string
          is_declined: boolean
          left_person_id: string
          reasons: string[]
          right_person_id: string
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          algorithm_version?: string
          created_at?: string
          id?: string
          is_declined?: boolean
          left_person_id: string
          reasons?: string[]
          right_person_id: string
          score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          algorithm_version?: string
          created_at?: string
          id?: string
          is_declined?: boolean
          left_person_id?: string
          reasons?: string[]
          right_person_id?: string
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_merge_recommendations_left_person_id_fkey"
            columns: ["left_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_merge_recommendations_right_person_id_fkey"
            columns: ["right_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      people_phones: {
        Row: {
          created_at: string
          id: string
          person_id: string
          preferred: boolean
          prefix: string
          sort_order: number
          type: string
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          person_id: string
          preferred?: boolean
          prefix?: string
          sort_order?: number
          type?: string
          updated_at?: string
          user_id: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          person_id?: string
          preferred?: boolean
          prefix?: string
          sort_order?: number
          type?: string
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_phones_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      people_relationships: {
        Row: {
          created_at: string
          id: string
          relationship_type: string
          source_person_id: string
          target_person_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          relationship_type: string
          source_person_id: string
          target_person_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          relationship_type?: string
          source_person_id?: string
          target_person_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_relationships_source_person_id_fkey"
            columns: ["source_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_relationships_target_person_id_fkey"
            columns: ["target_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      people_socials: {
        Row: {
          connected_at: string | null
          created_at: string
          handle: string
          id: string
          person_id: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connected_at?: string | null
          created_at?: string
          handle: string
          id?: string
          person_id: string
          platform: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connected_at?: string | null
          created_at?: string
          handle?: string
          id?: string
          person_id?: string
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_socials_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      people_tags: {
        Row: {
          created_at: string
          id: string
          person_id: string
          tag_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          person_id: string
          tag_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          person_id?: string
          tag_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_tags_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      people_work_history: {
        Row: {
          company_linkedin_id: string | null
          company_name: string
          created_at: string
          description: string | null
          employment_type: string | null
          end_date: string | null
          id: string
          location: string | null
          people_linkedin_id: string
          start_date: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_linkedin_id?: string | null
          company_name: string
          created_at?: string
          description?: string | null
          employment_type?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          people_linkedin_id: string
          start_date?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_linkedin_id?: string | null
          company_name?: string
          created_at?: string
          description?: string | null
          employment_type?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          people_linkedin_id?: string
          start_date?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_work_history_people_linkedin_id_fkey"
            columns: ["people_linkedin_id"]
            isOneToOne: false
            referencedRelation: "people_linkedin"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_dispatch_log: {
        Row: {
          created_at: string
          id: string
          reminder_date: string
          timezone: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reminder_date: string
          timezone: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reminder_date?: string
          timezone?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          polar_customer_id: string
          polar_subscription_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          polar_customer_id: string
          polar_subscription_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          polar_customer_id?: string
          polar_subscription_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_change_log: {
        Row: {
          change_index: number
          created_at: string
          entity_id: string
          operation: string
          row_data: Json | null
          server_sequence: number
          table_name: string
          user_id: string
        }
        Insert: {
          change_index?: number
          created_at?: string
          entity_id: string
          operation: string
          row_data?: Json | null
          server_sequence: number
          table_name: string
          user_id: string
        }
        Update: {
          change_index?: number
          created_at?: string
          entity_id?: string
          operation?: string
          row_data?: Json | null
          server_sequence?: number
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_mutation_receipts: {
        Row: {
          client_mutation_id: string
          created_at: string
          mutation_type: string
          payload_hash: string
          result: Json
          server_sequence: number
          user_id: string
        }
        Insert: {
          client_mutation_id: string
          created_at?: string
          mutation_type: string
          payload_hash: string
          result: Json
          server_sequence: number
          user_id: string
        }
        Update: {
          client_mutation_id?: string
          created_at?: string
          mutation_type?: string
          payload_hash?: string
          result?: Json
          server_sequence?: number
          user_id?: string
        }
        Relationships: []
      }
      sync_user_sequence: {
        Row: {
          last_sequence: number
          user_id: string
        }
        Insert: {
          last_sequence?: number
          user_id: string
        }
        Update: {
          last_sequence?: number
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          label: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          label: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          label?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          ai_messages_month_reset_at: string
          ai_messages_this_month: number
          ai_messages_used: number
          color_scheme: Database["public"]["Enums"]["color_scheme"]
          created_at: string
          getting_started_dismissed_at: string | null
          group_sort_order: string
          id: string
          import_completed_at: string | null
          import_followup_platform: string | null
          import_followup_status: string | null
          is_admin: boolean
          language: string | null
          left_swipe_action: string
          next_reminder_at_utc: string
          onboarding_completed_at: string | null
          reminder_send_hour: string
          right_swipe_action: string
          tag_sort_order: string
          time_format: string
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_messages_month_reset_at?: string
          ai_messages_this_month?: number
          ai_messages_used?: number
          color_scheme?: Database["public"]["Enums"]["color_scheme"]
          created_at?: string
          getting_started_dismissed_at?: string | null
          group_sort_order?: string
          id?: string
          import_completed_at?: string | null
          import_followup_platform?: string | null
          import_followup_status?: string | null
          is_admin?: boolean
          language?: string | null
          left_swipe_action?: string
          next_reminder_at_utc: string
          onboarding_completed_at?: string | null
          reminder_send_hour?: string
          right_swipe_action?: string
          tag_sort_order?: string
          time_format?: string
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_messages_month_reset_at?: string
          ai_messages_this_month?: number
          ai_messages_used?: number
          color_scheme?: Database["public"]["Enums"]["color_scheme"]
          created_at?: string
          getting_started_dismissed_at?: string | null
          group_sort_order?: string
          id?: string
          import_completed_at?: string | null
          import_followup_platform?: string | null
          import_followup_status?: string | null
          is_admin?: boolean
          language?: string | null
          left_swipe_action?: string
          next_reminder_at_utc?: string
          onboarding_completed_at?: string | null
          reminder_send_hour?: string
          right_swipe_action?: string
          tag_sort_order?: string
          time_format?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allocate_sync_server_sequence: {
        Args: { p_count?: number; p_user_id: string }
        Returns: number
      }
      authenticate_api_key: {
        Args: { p_key_id: string; p_provided_hash: string }
        Returns: {
          id: string
          label: string
          permission: string
          user_id: string
        }[]
      }
      bump_person_updated_at_for_sync: {
        Args: { p_person_id: string; p_user_id: string }
        Returns: string
      }
      check_and_increment_ai_messages: {
        Args: { p_is_premium: boolean; p_limit: number; p_user_id: string }
        Returns: {
          allowed: boolean
          messages_used: number
          reset_at: string
        }[]
      }
      cleanup_stale_enrich_queue: { Args: never; Returns: number }
      compute_next_reminder_at_utc: {
        Args: {
          base_ts?: string
          input_send_hour: string
          input_timezone: string
        }
        Returns: string
      }
      count_search_people_ids: {
        Args: {
          p_group_id?: string
          p_keep_in_touch?: boolean
          p_query: string
          p_tag_id?: string
          p_threshold?: number
          p_user_id: string
        }
        Returns: number
      }
      get_current_sync_txid: { Args: never; Returns: string }
      get_funnel_periods: {
        Args: never
        Returns: {
          contacts: number
          contacts_to_interactions_pct: number
          interactions: number
          period_key: string
          period_label: string
          signups: number
          signups_to_contacts_pct: number
        }[]
      }
      get_funnel_stats: {
        Args: { p_weeks?: number }
        Returns: {
          contacts: number
          interactions: number
          signups: number
          week: string
        }[]
      }
      get_linkedin_enrich_eligible: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          first_name: string
          handle: string
          last_name: string
          person_id: string
        }[]
      }
      get_map_address_pins_in_bbox: {
        Args: {
          p_limit?: number
          p_max_lat: number
          p_max_lon: number
          p_min_lat: number
          p_min_lon: number
          p_user_id: string
        }
        Returns: {
          address_city: string
          address_country: string
          address_formatted: string
          address_id: string
          address_type: string
          first_name: string
          has_avatar: boolean
          last_name: string
          latitude: number
          longitude: number
          person_id: string
          updated_at: string
        }[]
      }
      get_map_pins_in_bbox: {
        Args: {
          p_limit?: number
          p_max_lat: number
          p_max_lon: number
          p_min_lat: number
          p_min_lon: number
          p_user_id: string
        }
        Returns: {
          first_name: string
          has_avatar: boolean
          headline: string
          id: string
          last_interaction: string
          last_name: string
          latitude: number
          location: string
          longitude: number
          updated_at: string
        }[]
      }
      get_total_users_growth: {
        Args: never
        Returns: {
          date: string
          total: number
        }[]
      }
      get_user_id_by_email: { Args: { p_email: string }; Returns: string }
      get_user_settings_is_admin: {
        Args: { p_row_id: string }
        Returns: boolean
      }
      immutable_unaccent: { Args: { "": string }; Returns: string }
      increment_ai_messages_used: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      replace_education_history: {
        Args: { p_people_linkedin_id: string; p_rows: Json; p_user_id: string }
        Returns: undefined
      }
      replace_work_history: {
        Args: { p_people_linkedin_id: string; p_rows: Json; p_user_id: string }
        Returns: undefined
      }
      search_people_ids:
        | {
            Args: {
              p_group_id?: string
              p_keep_in_touch?: boolean
              p_limit?: number
              p_offset?: number
              p_query: string
              p_tag_id?: string
              p_threshold?: number
              p_user_id: string
            }
            Returns: {
              id: string
              rank: number
            }[]
          }
        | {
            Args: {
              p_group_id?: string
              p_limit?: number
              p_offset?: number
              p_query: string
              p_threshold?: number
              p_user_id: string
            }
            Returns: {
              id: string
              rank: number
            }[]
          }
      send_daily_reminder_digests: {
        Args: { target_date?: string }
        Returns: Json
      }
      send_hourly_reminder_digests: { Args: never; Returns: Json }
      set_person_location: {
        Args: {
          p_latitude: number
          p_longitude: number
          p_person_id: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      color_scheme: "light" | "dark" | "auto"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      color_scheme: ["light", "dark", "auto"],
    },
  },
} as const

