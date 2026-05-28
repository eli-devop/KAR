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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      dashboard_changes: {
        Row: {
          alert_count: number
          detected_at: string
          headline: string
          id: string
          key_changes: Json
          summary: string
        }
        Insert: {
          alert_count?: number
          detected_at?: string
          headline: string
          id?: string
          key_changes?: Json
          summary: string
        }
        Update: {
          alert_count?: number
          detected_at?: string
          headline?: string
          id?: string
          key_changes?: Json
          summary?: string
        }
        Relationships: []
      }
      forecast_runs: {
        Row: {
          finished_at: string | null
          id: string
          message: string | null
          occupations_count: number | null
          scope: string | null
          started_at: string
          status: string
        }
        Insert: {
          finished_at?: string | null
          id?: string
          message?: string | null
          occupations_count?: number | null
          scope?: string | null
          started_at?: string
          status?: string
        }
        Update: {
          finished_at?: string | null
          id?: string
          message?: string | null
          occupations_count?: number | null
          scope?: string | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      forecasts: {
        Row: {
          ai_exposure: number | null
          confidence: number | null
          drivers: Json | null
          employment: number | null
          employment_delta_pct: number | null
          generated_at: string
          horizon: string
          id: string
          occ_code: string
          outlook: string | null
          rationale: string | null
          wage: number | null
          wage_delta_pct: number | null
        }
        Insert: {
          ai_exposure?: number | null
          confidence?: number | null
          drivers?: Json | null
          employment?: number | null
          employment_delta_pct?: number | null
          generated_at?: string
          horizon: string
          id?: string
          occ_code: string
          outlook?: string | null
          rationale?: string | null
          wage?: number | null
          wage_delta_pct?: number | null
        }
        Update: {
          ai_exposure?: number | null
          confidence?: number | null
          drivers?: Json | null
          employment?: number | null
          employment_delta_pct?: number | null
          generated_at?: string
          horizon?: string
          id?: string
          occ_code?: string
          outlook?: string | null
          rationale?: string | null
          wage?: number | null
          wage_delta_pct?: number | null
        }
        Relationships: []
      }
      labor_alerts: {
        Row: {
          created_at: string
          dismissed_at: string | null
          email_sent_at: string | null
          id: string
          kind: string
          payload: Json
          severity: string
          source_url: string | null
          summary: string
          title: string
        }
        Insert: {
          created_at?: string
          dismissed_at?: string | null
          email_sent_at?: string | null
          id?: string
          kind: string
          payload?: Json
          severity?: string
          source_url?: string | null
          summary: string
          title: string
        }
        Update: {
          created_at?: string
          dismissed_at?: string | null
          email_sent_at?: string | null
          id?: string
          kind?: string
          payload?: Json
          severity?: string
          source_url?: string | null
          summary?: string
          title?: string
        }
        Relationships: []
      }
      market_narratives: {
        Row: {
          ai_displacement_index: number | null
          generated_at: string
          headline: string | null
          horizon: string
          id: string
          key_signals: Json | null
          labor_force_participation: number | null
          summary: string | null
          unemployment_rate: number | null
        }
        Insert: {
          ai_displacement_index?: number | null
          generated_at?: string
          headline?: string | null
          horizon: string
          id?: string
          key_signals?: Json | null
          labor_force_participation?: number | null
          summary?: string | null
          unemployment_rate?: number | null
        }
        Update: {
          ai_displacement_index?: number | null
          generated_at?: string
          headline?: string | null
          horizon?: string
          id?: string
          key_signals?: Json | null
          labor_force_participation?: number | null
          summary?: string | null
          unemployment_rate?: number | null
        }
        Relationships: []
      }
      news_items: {
        Row: {
          category: string
          fetched_at: string
          id: string
          published_at: string | null
          source: string | null
          summary: string | null
          title: string
          url: string
        }
        Insert: {
          category?: string
          fetched_at?: string
          id?: string
          published_at?: string | null
          source?: string | null
          summary?: string | null
          title: string
          url: string
        }
        Update: {
          category?: string
          fetched_at?: string
          id?: string
          published_at?: string | null
          source?: string | null
          summary?: string | null
          title?: string
          url?: string
        }
        Relationships: []
      }
      occupation_snapshots: {
        Row: {
          fetched_at: string
          id: string
          occ_code: string
          period: string | null
          period_name: string | null
          series_id: string
          value: number | null
          year: number | null
        }
        Insert: {
          fetched_at?: string
          id?: string
          occ_code: string
          period?: string | null
          period_name?: string | null
          series_id: string
          value?: number | null
          year?: number | null
        }
        Update: {
          fetched_at?: string
          id?: string
          occ_code?: string
          period?: string | null
          period_name?: string | null
          series_id?: string
          value?: number | null
          year?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
