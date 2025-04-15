export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      finances: {
        Row: {
          amount: number
          date: string | null
          description: string | null
          id: string
          member_id: string
          proof_url: string | null
          type: string
          verified: boolean | null
        }
        Insert: {
          amount: number
          date?: string | null
          description?: string | null
          id?: string
          member_id: string
          proof_url?: string | null
          type: string
          verified?: boolean | null
        }
        Update: {
          amount?: number
          date?: string | null
          description?: string | null
          id?: string
          member_id?: string
          proof_url?: string | null
          type?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "finances_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string | null
          current_amount: number | null
          end_date: string
          id: string
          start_date: string | null
          target_amount: number
          title: string
        }
        Insert: {
          created_at?: string | null
          current_amount?: number | null
          end_date: string
          id?: string
          start_date?: string | null
          target_amount: number
          title: string
        }
        Update: {
          created_at?: string | null
          current_amount?: number | null
          end_date?: string
          id?: string
          start_date?: string | null
          target_amount?: number
          title?: string
        }
        Relationships: []
      }
      items: {
        Row: {
          created_at: string | null
          id: string
          name: string
          property_id: string | null
          quantity: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          property_id?: string | null
          quantity?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          property_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "items_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_schedule: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string
          id: string
          members: string[] | null
          title: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date: string
          id?: string
          members?: string[] | null
          title: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string
          id?: string
          members?: string[] | null
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          join_date: string
          last_activity: string | null
          name: string
          password_updated_at: string | null
          role: string
          state_id: string | null
          status: string
          temporary_password: string | null
        }
        Insert: {
          id: string
          join_date?: string
          last_activity?: string | null
          name: string
          password_updated_at?: string | null
          role?: string
          state_id?: string | null
          status?: string
          temporary_password?: string | null
        }
        Update: {
          id?: string
          join_date?: string
          last_activity?: string | null
          name?: string
          password_updated_at?: string | null
          role?: string
          state_id?: string | null
          status?: string
          temporary_password?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          created_at: string | null
          id: string
          location: string
          number: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          location: string
          number: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          location?: string
          number?: string
          type?: string
        }
        Relationships: []
      }
      property_transactions: {
        Row: {
          amount: number
          date: string | null
          description: string
          id: string
          property_id: string | null
        }
        Insert: {
          amount: number
          date?: string | null
          description: string
          id?: string
          property_id?: string | null
        }
        Update: {
          amount?: number
          date?: string | null
          description?: string
          id?: string
          property_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_temp_password: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      reset_temp_passwords: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
