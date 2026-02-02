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
      audit_logs: {
        Row: {
          category: Database["public"]["Enums"]["audit_event_category"]
          company_id: string | null
          created_at: string
          description: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          platform: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          user_agent: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["audit_event_category"]
          company_id?: string | null
          created_at?: string
          description: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          platform?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          user_agent?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["audit_event_category"]
          company_id?: string | null
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          platform?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          user_agent?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
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
          time_rounding_enabled: boolean | null
          time_rounding_increment_minutes: number | null
          time_rounding_method: string | null
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
          time_rounding_enabled?: boolean | null
          time_rounding_increment_minutes?: number | null
          time_rounding_method?: string | null
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
          time_rounding_enabled?: boolean | null
          time_rounding_increment_minutes?: number | null
          time_rounding_method?: string | null
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
          expense_tax_handling: string | null
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
          quote_body_message_en: string | null
          quote_body_message_fr: string | null
          quote_email_message_en: string | null
          quote_email_message_fr: string | null
          quote_email_subject_en: string | null
          quote_email_subject_fr: string | null
          quote_footer_message_en: string | null
          quote_footer_message_fr: string | null
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
          expense_tax_handling?: string | null
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
          quote_body_message_en?: string | null
          quote_body_message_fr?: string | null
          quote_email_message_en?: string | null
          quote_email_message_fr?: string | null
          quote_email_subject_en?: string | null
          quote_email_subject_fr?: string | null
          quote_footer_message_en?: string | null
          quote_footer_message_fr?: string | null
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
          expense_tax_handling?: string | null
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
          quote_body_message_en?: string | null
          quote_body_message_fr?: string | null
          quote_email_message_en?: string | null
          quote_email_message_fr?: string | null
          quote_email_subject_en?: string | null
          quote_email_subject_fr?: string | null
          quote_footer_message_en?: string | null
          quote_footer_message_fr?: string | null
          street_address?: string | null
          tax_id?: string | null
          taxes?: Json | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      company_invites: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_invites_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "company_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role_id: string
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role_id: string
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role_id?: string
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "company_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_roles: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_subscriptions: {
        Row: {
          billing_cycle: Database["public"]["Enums"]["billing_cycle"] | null
          company_id: string
          created_at: string
          expenses_this_month: number
          expires_at: string | null
          id: string
          invoices_this_month: number
          last_reset_date: string
          plan_type: Database["public"]["Enums"]["subscription_plan"]
          started_at: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"] | null
          company_id: string
          created_at?: string
          expenses_this_month?: number
          expires_at?: string | null
          id?: string
          invoices_this_month?: number
          last_reset_date?: string
          plan_type?: Database["public"]["Enums"]["subscription_plan"]
          started_at?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"] | null
          company_id?: string
          created_at?: string
          expenses_this_month?: number
          expires_at?: string | null
          id?: string
          invoices_this_month?: number
          last_reset_date?: string
          plan_type?: Database["public"]["Enums"]["subscription_plan"]
          started_at?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_preferences: {
        Row: {
          created_at: string
          id: string
          maintenance_notifications: boolean
          monthly_summary: boolean
          platform_changes: boolean
          product_updates: boolean
          updated_at: string
          user_id: string
          weekly_summary: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          maintenance_notifications?: boolean
          monthly_summary?: boolean
          platform_changes?: boolean
          product_updates?: boolean
          updated_at?: string
          user_id: string
          weekly_summary?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          maintenance_notifications?: boolean
          monthly_summary?: boolean
          platform_changes?: boolean
          product_updates?: boolean
          updated_at?: string
          user_id?: string
          weekly_summary?: boolean
        }
        Relationships: []
      }
      expense_category_mappings: {
        Row: {
          category_id: string
          company_id: string
          created_at: string
          id: string
          key: string
          last_used_at: string
          mapping_type: string
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          category_id: string
          company_id: string
          created_at?: string
          id?: string
          key: string
          last_used_at?: string
          mapping_type: string
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          category_id?: string
          company_id?: string
          created_at?: string
          id?: string
          key?: string
          last_used_at?: string
          mapping_type?: string
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_category_mappings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_category_mappings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          category: string
          client_id: string | null
          company_id: string | null
          created_at: string
          description: string
          expense_date: string
          id: string
          is_archived: boolean
          is_billable: boolean | null
          notes: string | null
          original_receipt_total: number | null
          receipt_url: string | null
          status: string
          tax_auto_source: string | null
          tax_user_overridden: boolean | null
          taxes: Json | null
          updated_at: string
          user_id: string
          vendor: string | null
        }
        Insert: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category: string
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          is_archived?: boolean
          is_billable?: boolean | null
          notes?: string | null
          original_receipt_total?: number | null
          receipt_url?: string | null
          status?: string
          tax_auto_source?: string | null
          tax_user_overridden?: boolean | null
          taxes?: Json | null
          updated_at?: string
          user_id: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          is_archived?: boolean
          is_billable?: boolean | null
          notes?: string | null
          original_receipt_total?: number | null
          receipt_url?: string | null
          status?: string
          tax_auto_source?: string | null
          tax_user_overridden?: boolean | null
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
      mfa_audit_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          success: boolean | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mfa_recovery_codes: {
        Row: {
          code_hash: string
          created_at: string | null
          id: string
          is_used: boolean | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string | null
          id?: string
          is_used?: boolean | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string | null
          id?: string
          is_used?: boolean | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mfa_secrets: {
        Row: {
          created_at: string | null
          enabled_at: string | null
          encrypted_secret: string
          failed_attempts: number | null
          id: string
          is_enabled: boolean | null
          last_verified_at: string | null
          locked_until: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enabled_at?: string | null
          encrypted_secret: string
          failed_attempts?: number | null
          id?: string
          is_enabled?: boolean | null
          last_verified_at?: string | null
          locked_until?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enabled_at?: string | null
          encrypted_secret?: string
          failed_attempts?: number | null
          id?: string
          is_enabled?: boolean | null
          last_verified_at?: string | null
          locked_until?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      product_update_logs: {
        Row: {
          batch_id: string
          content_en: string | null
          content_fr: string | null
          created_at: string
          error_message: string | null
          id: string
          recipient_email: string
          recipient_language: string
          recipient_user_id: string
          sent_at: string
          status: string
          subject_en: string | null
          subject_fr: string | null
          title_en: string | null
          title_fr: string | null
        }
        Insert: {
          batch_id?: string
          content_en?: string | null
          content_fr?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          recipient_email: string
          recipient_language?: string
          recipient_user_id: string
          sent_at?: string
          status?: string
          subject_en?: string | null
          subject_fr?: string | null
          title_en?: string | null
          title_fr?: string | null
        }
        Update: {
          batch_id?: string
          content_en?: string | null
          content_fr?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          recipient_email?: string
          recipient_language?: string
          recipient_user_id?: string
          sent_at?: string
          status?: string
          subject_en?: string | null
          subject_fr?: string | null
          title_en?: string | null
          title_fr?: string | null
        }
        Relationships: []
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
      quote_items: {
        Row: {
          created_at: string
          description: string
          id: string
          notes: string | null
          product_id: string | null
          product_taxes: Json | null
          quantity: number
          quote_id: string
          total: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          notes?: string | null
          product_id?: string | null
          product_taxes?: Json | null
          quantity?: number
          quote_id: string
          total?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          notes?: string | null
          product_id?: string | null
          product_taxes?: Json | null
          quantity?: number
          quote_id?: string
          total?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          access_token: string | null
          client_id: string | null
          client_response_note: string | null
          converted_at: string | null
          converted_to_invoice_id: string | null
          created_at: string
          expiry_date: string | null
          id: string
          issue_date: string
          notes: string | null
          quote_number: string
          responded_at: string | null
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          terms: string | null
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          client_id?: string | null
          client_response_note?: string | null
          converted_at?: string | null
          converted_to_invoice_id?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          quote_number: string
          responded_at?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          terms?: string | null
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          client_id?: string | null
          client_response_note?: string | null
          converted_at?: string | null
          converted_to_invoice_id?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          quote_number?: string
          responded_at?: string | null
          status?: string
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
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_converted_to_invoice_id_fkey"
            columns: ["converted_to_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_scan_logs: {
        Row: {
          company_id: string | null
          error_message: string | null
          id: string
          scanned_at: string
          status: string
          total_amount: number | null
          user_id: string
          vendor: string | null
        }
        Insert: {
          company_id?: string | null
          error_message?: string | null
          id?: string
          scanned_at?: string
          status?: string
          total_amount?: number | null
          user_id: string
          vendor?: string | null
        }
        Update: {
          company_id?: string | null
          error_message?: string | null
          id?: string
          scanned_at?: string
          status?: string
          total_amount?: number | null
          user_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipt_scan_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          permission: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "company_roles"
            referencedColumns: ["id"]
          },
        ]
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
          quotes_enabled: boolean
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
          quotes_enabled?: boolean
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
          quotes_enabled?: boolean
          updated_at?: string
          yearly_price?: number
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          client_id: string | null
          company_id: string | null
          created_at: string
          date: string
          description: string
          duration_billed_minutes: number | null
          duration_raw_minutes: number | null
          hourly_rate: number
          hours: number
          id: string
          invoice_id: string | null
          is_archived: boolean
          is_billed: boolean
          notes: string | null
          source: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          date?: string
          description: string
          duration_billed_minutes?: number | null
          duration_raw_minutes?: number | null
          hourly_rate?: number
          hours?: number
          id?: string
          invoice_id?: string | null
          is_archived?: boolean
          is_billed?: boolean
          notes?: string | null
          source?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          date?: string
          description?: string
          duration_billed_minutes?: number | null
          duration_raw_minutes?: number | null
          hourly_rate?: number
          hours?: number
          id?: string
          invoice_id?: string | null
          is_archived?: boolean
          is_billed?: boolean
          notes?: string | null
          source?: string | null
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
      authorize_action: {
        Args: {
          _check_limit?: string
          _company_id: string
          _feature_key?: string
          _permission?: string
          _user_id: string
        }
        Returns: Json
      }
      check_user_is_admin_or_owner: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      check_user_is_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      check_username_available: {
        Args: { check_username: string; current_user_id: string }
        Returns: boolean
      }
      count_owners_in_company: {
        Args: { _company_id: string }
        Returns: number
      }
      create_company_role: {
        Args: { _company_id: string; _description?: string; _name: string }
        Returns: string
      }
      create_default_roles_for_company: {
        Args: { _company_id: string; _owner_user_id: string }
        Returns: undefined
      }
      decrypt_sensitive: { Args: { ciphertext: string }; Returns: string }
      delete_company_role: { Args: { _role_id: string }; Returns: undefined }
      encrypt_sensitive: { Args: { plaintext: string }; Returns: string }
      generate_invoice_number: { Args: { company_id: string }; Returns: string }
      generate_quote_number: { Args: { company_id: string }; Returns: string }
      get_company_members_for_debug: {
        Args: { _company_id: string }
        Returns: Json
      }
      get_company_plan_limits: {
        Args: { _company_id: string }
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
          quotes_enabled: boolean
        }[]
      }
      get_company_roles: {
        Args: { _company_id: string }
        Returns: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "company_roles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_current_user_email: { Args: never; Returns: string }
      get_role_company_id: { Args: { _role_id: string }; Returns: string }
      get_role_company_id_safe: { Args: { _role_id: string }; Returns: string }
      get_role_permissions: {
        Args: { _role_id: string }
        Returns: {
          permission: string
        }[]
      }
      get_user_permissions: {
        Args: { _company_id: string; _user_id: string }
        Returns: string[]
      }
      get_user_permissions_for_debug: {
        Args: { _company_id: string; _target_user_id: string }
        Returns: Json
      }
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
      get_user_role_in_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: string
      }
      has_permission: {
        Args: { _company_id: string; _permission: string; _user_id: string }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_company_owner: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_encrypted: { Args: { data: string }; Returns: boolean }
      is_owner_of_role_company: { Args: { _role_id: string }; Returns: boolean }
      is_system_role: { Args: { _role_id: string }; Returns: boolean }
      log_audit_event: {
        Args: {
          p_category: Database["public"]["Enums"]["audit_event_category"]
          p_company_id: string
          p_description: string
          p_event_type: string
          p_ip_address?: string
          p_metadata?: Json
          p_platform?: string
          p_related_entity_id?: string
          p_related_entity_type?: string
          p_user_agent?: string
          p_user_id: string
          p_user_name: string
        }
        Returns: string
      }
      reset_monthly_usage: { Args: never; Returns: undefined }
      set_role_permissions: {
        Args: { _permissions: string[]; _role_id: string }
        Returns: undefined
      }
      update_company_role: {
        Args: { _description?: string; _name: string; _role_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "accountant" | "employee" | "viewer"
      audit_event_category:
        | "authentication"
        | "billing"
        | "sales"
        | "products"
        | "exports"
        | "settings"
      billing_cycle: "monthly" | "yearly"
      member_status: "active" | "suspended"
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
      app_role: ["owner", "admin", "accountant", "employee", "viewer"],
      audit_event_category: [
        "authentication",
        "billing",
        "sales",
        "products",
        "exports",
        "settings",
      ],
      billing_cycle: ["monthly", "yearly"],
      member_status: ["active", "suspended"],
      subscription_plan: ["free", "premium", "pro"],
    },
  },
} as const
