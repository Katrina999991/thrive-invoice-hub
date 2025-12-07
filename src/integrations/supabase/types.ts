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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          description_en: string | null
          description_fr: string | null
          for_expenses: boolean | null
          for_home_office: boolean | null
          for_products: boolean | null
          for_services: boolean | null
          id: string
          name: string
          name_en: string | null
          name_fr: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          description_en?: string | null
          description_fr?: string | null
          for_expenses?: boolean | null
          for_home_office?: boolean | null
          for_products?: boolean | null
          for_services?: boolean | null
          id?: string
          name: string
          name_en?: string | null
          name_fr?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          description_en?: string | null
          description_fr?: string | null
          for_expenses?: boolean | null
          for_home_office?: boolean | null
          for_products?: boolean | null
          for_services?: boolean | null
          id?: string
          name?: string
          name_en?: string | null
          name_fr?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          company_id: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          hourly_rate: number | null
          id: string
          include_payment_link: boolean | null
          language: string | null
          name: string
          notes: string | null
          phone: string | null
          send_overdue_email_auto: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company_id?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          hourly_rate?: number | null
          id?: string
          include_payment_link?: boolean | null
          language?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          send_overdue_email_auto?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          company_id?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          hourly_rate?: number | null
          id?: string
          include_payment_link?: boolean | null
          language?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          send_overdue_email_auto?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          contact_person: string | null
          country: string | null
          created_at: string
          current_invoice_number: number | null
          default_due_days: number | null
          email: string | null
          id: string
          invoice_body_message: string | null
          invoice_body_message_en: string | null
          invoice_body_message_fr: string | null
          invoice_digits: number | null
          invoice_email_message: string | null
          invoice_email_message_en: string | null
          invoice_email_message_fr: string | null
          invoice_email_subject: string | null
          invoice_email_subject_en: string | null
          invoice_email_subject_fr: string | null
          invoice_footer_message: string | null
          invoice_footer_message_en: string | null
          invoice_footer_message_fr: string | null
          invoice_prefix: string | null
          invoice_start_number: number | null
          logo_url: string | null
          name: string
          overdue_email_message: string | null
          overdue_email_message_en: string | null
          overdue_email_message_fr: string | null
          overdue_email_subject: string | null
          overdue_email_subject_en: string | null
          overdue_email_subject_fr: string | null
          payment_confirmation_email_message: string | null
          payment_confirmation_email_message_en: string | null
          payment_confirmation_email_message_fr: string | null
          payment_confirmation_email_subject: string | null
          payment_confirmation_email_subject_en: string | null
          payment_confirmation_email_subject_fr: string | null
          phone: string | null
          postal_code: string | null
          province_state: string | null
          street_address: string | null
          tax_id: string | null
          taxes: Json | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          current_invoice_number?: number | null
          default_due_days?: number | null
          email?: string | null
          id?: string
          invoice_body_message?: string | null
          invoice_body_message_en?: string | null
          invoice_body_message_fr?: string | null
          invoice_digits?: number | null
          invoice_email_message?: string | null
          invoice_email_message_en?: string | null
          invoice_email_message_fr?: string | null
          invoice_email_subject?: string | null
          invoice_email_subject_en?: string | null
          invoice_email_subject_fr?: string | null
          invoice_footer_message?: string | null
          invoice_footer_message_en?: string | null
          invoice_footer_message_fr?: string | null
          invoice_prefix?: string | null
          invoice_start_number?: number | null
          logo_url?: string | null
          name: string
          overdue_email_message?: string | null
          overdue_email_message_en?: string | null
          overdue_email_message_fr?: string | null
          overdue_email_subject?: string | null
          overdue_email_subject_en?: string | null
          overdue_email_subject_fr?: string | null
          payment_confirmation_email_message?: string | null
          payment_confirmation_email_message_en?: string | null
          payment_confirmation_email_message_fr?: string | null
          payment_confirmation_email_subject?: string | null
          payment_confirmation_email_subject_en?: string | null
          payment_confirmation_email_subject_fr?: string | null
          phone?: string | null
          postal_code?: string | null
          province_state?: string | null
          street_address?: string | null
          tax_id?: string | null
          taxes?: Json | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          current_invoice_number?: number | null
          default_due_days?: number | null
          email?: string | null
          id?: string
          invoice_body_message?: string | null
          invoice_body_message_en?: string | null
          invoice_body_message_fr?: string | null
          invoice_digits?: number | null
          invoice_email_message?: string | null
          invoice_email_message_en?: string | null
          invoice_email_message_fr?: string | null
          invoice_email_subject?: string | null
          invoice_email_subject_en?: string | null
          invoice_email_subject_fr?: string | null
          invoice_footer_message?: string | null
          invoice_footer_message_en?: string | null
          invoice_footer_message_fr?: string | null
          invoice_prefix?: string | null
          invoice_start_number?: number | null
          logo_url?: string | null
          name?: string
          overdue_email_message?: string | null
          overdue_email_message_en?: string | null
          overdue_email_message_fr?: string | null
          overdue_email_subject?: string | null
          overdue_email_subject_en?: string | null
          overdue_email_subject_fr?: string | null
          payment_confirmation_email_message?: string | null
          payment_confirmation_email_message_en?: string | null
          payment_confirmation_email_message_fr?: string | null
          payment_confirmation_email_subject?: string | null
          payment_confirmation_email_subject_en?: string | null
          payment_confirmation_email_subject_fr?: string | null
          phone?: string | null
          postal_code?: string | null
          province_state?: string | null
          street_address?: string | null
          tax_id?: string | null
          taxes?: Json | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          client_id: string | null
          company_id: string | null
          created_at: string
          description: string
          expense_date: string
          id: string
          is_billable: boolean | null
          notes: string | null
          receipt_url: string | null
          status: string
          taxes: Json | null
          updated_at: string
          user_id: string
          vendor: string | null
        }
        Insert: {
          amount?: number
          category: string
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          is_billable?: boolean | null
          notes?: string | null
          receipt_url?: string | null
          status?: string
          taxes?: Json | null
          updated_at?: string
          user_id: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          is_billable?: boolean | null
          notes?: string | null
          receipt_url?: string | null
          status?: string
          taxes?: Json | null
          updated_at?: string
          user_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          notes: string | null
          product_id: string | null
          product_taxes: Json | null
          quantity: number
          total: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          notes?: string | null
          product_id?: string | null
          product_taxes?: Json | null
          quantity?: number
          total?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          product_id?: string | null
          product_taxes?: Json | null
          quantity?: number
          total?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_reminder_logs: {
        Row: {
          client_id: string | null
          created_at: string
          error_message: string | null
          id: string
          invoice_id: string
          reminder_type: string
          sent_at: string
          status: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          invoice_id: string
          reminder_type: string
          sent_at?: string
          status?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          invoice_id?: string
          reminder_type?: string
          sent_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_reminder_logs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string | null
          created_at: string
          due_date: string | null
          id: string
          invoice_number: string
          is_archived: boolean
          issue_date: string
          notes: string | null
          overdue_reminder_sent_at: string | null
          paid_at: string | null
          payment_link: string | null
          status: string
          stripe_payment_intent_id: string | null
          subtotal: number
          tax_amount: number
          tax_rate: number
          terms: string | null
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          is_archived?: boolean
          issue_date?: string
          notes?: string | null
          overdue_reminder_sent_at?: string | null
          paid_at?: string | null
          payment_link?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          terms?: string | null
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          is_archived?: boolean
          issue_date?: string
          notes?: string | null
          overdue_reminder_sent_at?: string | null
          paid_at?: string | null
          payment_link?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          terms?: string | null
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          client_id: string | null
          company_id: string | null
          cost: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          quantity: number | null
          sku: string | null
          taxes: Json | null
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          client_id?: string | null
          company_id?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number
          quantity?: number | null
          sku?: string | null
          taxes?: Json | null
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          client_id?: string | null
          company_id?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          quantity?: number | null
          sku?: string | null
          taxes?: Json | null
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          password_change_required: boolean
          phone_number: string | null
          recovery_email: string | null
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          password_change_required?: boolean
          phone_number?: string | null
          recovery_email?: string | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          password_change_required?: boolean
          phone_number?: string | null
          recovery_email?: string | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          all_invoice_templates: boolean
          all_reports: boolean
          category_management: boolean
          created_at: string
          custom_email_templates: boolean
          description_en: string | null
          description_fr: string | null
          id: string
          max_clients: number | null
          max_companies: number | null
          max_expenses_per_month: number | null
          max_invoices_per_month: number | null
          monthly_price: number
          name_en: string
          name_fr: string
          pdf_export: boolean
          plan_type: Database["public"]["Enums"]["subscription_plan"]
          updated_at: string
          yearly_price: number
        }
        Insert: {
          all_invoice_templates?: boolean
          all_reports?: boolean
          category_management?: boolean
          created_at?: string
          custom_email_templates?: boolean
          description_en?: string | null
          description_fr?: string | null
          id?: string
          max_clients?: number | null
          max_companies?: number | null
          max_expenses_per_month?: number | null
          max_invoices_per_month?: number | null
          monthly_price?: number
          name_en: string
          name_fr: string
          pdf_export?: boolean
          plan_type: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
          yearly_price?: number
        }
        Update: {
          all_invoice_templates?: boolean
          all_reports?: boolean
          category_management?: boolean
          created_at?: string
          custom_email_templates?: boolean
          description_en?: string | null
          description_fr?: string | null
          id?: string
          max_clients?: number | null
          max_companies?: number | null
          max_expenses_per_month?: number | null
          max_invoices_per_month?: number | null
          monthly_price?: number
          name_en?: string
          name_fr?: string
          pdf_export?: boolean
          plan_type?: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
          yearly_price?: number
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          client_id: string | null
          company_id: string | null
          created_at: string
          date: string
          description: string
          hourly_rate: number
          hours: number
          id: string
          invoice_id: string | null
          is_billed: boolean
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          date?: string
          description: string
          hourly_rate?: number
          hours?: number
          id?: string
          invoice_id?: string | null
          is_billed?: boolean
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          date?: string
          description?: string
          hourly_rate?: number
          hours?: number
          id?: string
          invoice_id?: string | null
          is_billed?: boolean
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entry_ranges: {
        Row: {
          created_at: string
          end_time: string
          id: string
          start_time: string
          time_entry_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          start_time: string
          time_entry_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          start_time?: string
          time_entry_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entry_ranges_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          billing_cycle: Database["public"]["Enums"]["billing_cycle"] | null
          created_at: string
          expenses_this_month: number
          expires_at: string | null
          id: string
          invoices_this_month: number
          last_reset_date: string
          plan_type: Database["public"]["Enums"]["subscription_plan"]
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"] | null
          created_at?: string
          expenses_this_month?: number
          expires_at?: string | null
          id?: string
          invoices_this_month?: number
          last_reset_date?: string
          plan_type?: Database["public"]["Enums"]["subscription_plan"]
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"] | null
          created_at?: string
          expenses_this_month?: number
          expires_at?: string | null
          id?: string
          invoices_this_month?: number
          last_reset_date?: string
          plan_type?: Database["public"]["Enums"]["subscription_plan"]
          started_at?: string
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
      generate_invoice_number: { Args: { company_id: string }; Returns: string }
      get_user_plan_limits: {
        Args: { user_uuid: string }
        Returns: {
          all_invoice_templates: boolean
          all_reports: boolean
          category_management: boolean
          custom_email_templates: boolean
          expenses_used: number
          invoices_used: number
          max_clients: number
          max_companies: number
          max_expenses_per_month: number
          max_invoices_per_month: number
          pdf_export: boolean
          plan_type: Database["public"]["Enums"]["subscription_plan"]
        }[]
      }
      reset_monthly_usage: { Args: never; Returns: undefined }
    }
    Enums: {
      billing_cycle: "monthly" | "yearly"
      subscription_plan: "free" | "premium" | "pro"
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
      billing_cycle: ["monthly", "yearly"],
      subscription_plan: ["free", "premium", "pro"],
    },
  },
} as const
