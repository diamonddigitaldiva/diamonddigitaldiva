export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      feedback: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          message: string
          rating: number | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          message: string
          rating?: number | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          message?: string
          rating?: number | null
        }
        Relationships: []
      }
      handoff_sessions: {
        Row: {
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          first_name: string
          id: string
          primary_stage: string
          primary_stage_name: string | null
          primary_stage_url: string | null
          secondary_stage: string | null
          secondary_stage_name: string | null
          secondary_stage_url: string | null
          source: string | null
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          first_name: string
          id?: string
          primary_stage: string
          primary_stage_name?: string | null
          primary_stage_url?: string | null
          secondary_stage?: string | null
          secondary_stage_name?: string | null
          secondary_stage_url?: string | null
          source?: string | null
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          first_name?: string
          id?: string
          primary_stage?: string
          primary_stage_name?: string | null
          primary_stage_url?: string | null
          secondary_stage?: string | null
          secondary_stage_name?: string | null
          secondary_stage_url?: string | null
          source?: string | null
        }
        Relationships: []
      }
      link_clicks: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          handoff_session_id: string | null
          hub_consent: boolean | null
          id: string
          link_name: string
          link_url: string | null
          primary_stage: string | null
          secondary_stage: string | null
          source: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          handoff_session_id?: string | null
          hub_consent?: boolean | null
          id?: string
          link_name: string
          link_url?: string | null
          primary_stage?: string | null
          secondary_stage?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          handoff_session_id?: string | null
          hub_consent?: boolean | null
          id?: string
          link_name?: string
          link_url?: string | null
          primary_stage?: string | null
          secondary_stage?: string | null
          source?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          created_at: string
          id: string
          options: Json
          question_index: number
          question_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          options?: Json
          question_index: number
          question_text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          options?: Json
          question_index?: number
          question_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      quiz_submissions: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          primary_stage: string
          primary_stage_url: string | null
          retry_count: number
          secondary_stage: string | null
          secondary_stage_url: string | null
          source: string | null
          webhook_sent: boolean
          webhook_sent_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          primary_stage: string
          primary_stage_url?: string | null
          retry_count?: number
          secondary_stage?: string | null
          secondary_stage_url?: string | null
          source?: string | null
          webhook_sent?: boolean
          webhook_sent_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          primary_stage?: string
          primary_stage_url?: string | null
          retry_count?: number
          secondary_stage?: string | null
          secondary_stage_url?: string | null
          source?: string | null
          webhook_sent?: boolean
          webhook_sent_at?: string | null
        }
        Relationships: []
      }
      stage_links: {
        Row: {
          created_at: string
          id: string
          link_url: string
          stage_code: string
          stage_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          link_url: string
          stage_code: string
          stage_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          link_url?: string
          stage_code?: string
          stage_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_handoff_session: {
        Args: { _session_id: string }
        Returns: boolean
      }
      get_handoff_session: {
        Args: { _session_id: string }
        Returns: {
          consumed_at: string
          created_at: string
          email: string
          expires_at: string
          first_name: string
          id: string
          primary_stage: string
          primary_stage_name: string
          primary_stage_url: string
          secondary_stage: string
          secondary_stage_name: string
          secondary_stage_url: string
          source: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
