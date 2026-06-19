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
      addons: {
        Row: {
          addon_name: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          price: number
          updated_at: string
        }
        Insert: {
          addon_name: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          price?: number
          updated_at?: string
        }
        Update: {
          addon_name?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          action: string | null
          admin_user_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          action?: string | null
          admin_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string | null
          admin_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_sessions_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          outlet_id: string | null
          phone: string | null
          role: string
          supabase_user_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          outlet_id?: string | null
          phone?: string | null
          role: string
          supabase_user_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          outlet_id?: string | null
          phone?: string | null
          role?: string
          supabase_user_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          performed_by: string | null
          performed_by_role: string | null
          record_id: string | null
          session_id: string | null
          table_name: string
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          performed_by?: string | null
          performed_by_role?: string | null
          record_id?: string | null
          session_id?: string | null
          table_name: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          performed_by?: string | null
          performed_by_role?: string | null
          record_id?: string | null
          session_id?: string | null
          table_name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      cart_item_addons: {
        Row: {
          addon_id: string
          cart_item_id: string
          id: string
          price: number
          quantity: number
        }
        Insert: {
          addon_id: string
          cart_item_id: string
          id?: string
          price: number
          quantity?: number
        }
        Update: {
          addon_id?: string
          cart_item_id?: string
          id?: string
          price?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "cart_item_addons_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_item_addons_cart_item_id_fkey"
            columns: ["cart_item_id"]
            isOneToOne: false
            referencedRelation: "cart_items"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          item_id: string
          quantity: number
          special_instructions: string | null
          total_price: number
          unit_price: number
          updated_at: string
          variant_id: string
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          item_id: string
          quantity?: number
          special_instructions?: string | null
          total_price: number
          unit_price: number
          updated_at?: string
          variant_id: string
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          item_id?: string
          quantity?: number
          special_instructions?: string | null
          total_price?: number
          unit_price?: number
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "item_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string
          customer_id: string
          expires_at: string | null
          id: string
          outlet_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          expires_at?: string | null
          id?: string
          outlet_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          expires_at?: string | null
          id?: string
          outlet_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carts_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      cuisine_types: {
        Row: {
          created_at: string
          cuisine_name: string
          id: string
          is_active: boolean
        }
        Insert: {
          created_at?: string
          cuisine_name: string
          id?: string
          is_active?: boolean
        }
        Update: {
          created_at?: string
          cuisine_name?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          address_label: string | null
          city: string | null
          created_at: string
          customer_id: string
          full_address: string
          id: string
          is_default: boolean
          is_deleted: boolean
          latitude: number | null
          longitude: number | null
          pincode: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address_label?: string | null
          city?: string | null
          created_at?: string
          customer_id: string
          full_address: string
          id?: string
          is_default?: boolean
          is_deleted?: boolean
          latitude?: number | null
          longitude?: number | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address_label?: string | null
          city?: string | null
          created_at?: string
          customer_id?: string
          full_address?: string
          id?: string
          is_default?: boolean
          is_deleted?: boolean
          latitude?: number | null
          longitude?: number | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          deleted_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          is_deleted: boolean
          phone: string | null
          supabase_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          phone?: string | null
          supabase_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          phone?: string | null
          supabase_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      dietary_types: {
        Row: {
          created_at: string
          dietary_code: string
          dietary_name: string
          id: string
          is_active: boolean
        }
        Insert: {
          created_at?: string
          dietary_code: string
          dietary_name: string
          id?: string
          is_active?: boolean
        }
        Update: {
          created_at?: string
          dietary_code?: string
          dietary_name?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      invoices: {
        Row: {
          generated_at: string
          generated_by: string
          id: string
          invoice_amount: number
          invoice_number: string
          invoice_url: string | null
          is_void: boolean
          order_id: string
          tax_amount: number
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          generated_at?: string
          generated_by?: string
          id?: string
          invoice_amount: number
          invoice_number: string
          invoice_url?: string | null
          is_void?: boolean
          order_id: string
          tax_amount?: number
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          generated_at?: string
          generated_by?: string
          id?: string
          invoice_amount?: number
          invoice_number?: string
          invoice_url?: string | null
          is_void?: boolean
          order_id?: string
          tax_amount?: number
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      item_addons: {
        Row: {
          addon_id: string
          id: string
          is_required: boolean
          item_id: string
          max_quantity: number
        }
        Insert: {
          addon_id: string
          id?: string
          is_required?: boolean
          item_id: string
          max_quantity?: number
        }
        Update: {
          addon_id?: string
          id?: string
          is_required?: boolean
          item_id?: string
          max_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "item_addons_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_addons_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          is_primary: boolean
          item_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          is_primary?: boolean
          item_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_primary?: boolean
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_images_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_variants: {
        Row: {
          base_price: number
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          item_id: string
          quantity_label: string | null
          serves_count: number | null
          updated_at: string
          updated_by: string | null
          variant_name: string
        }
        Insert: {
          base_price?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          item_id: string
          quantity_label?: string | null
          serves_count?: number | null
          updated_at?: string
          updated_by?: string | null
          variant_name: string
        }
        Update: {
          base_price?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          item_id?: string
          quantity_label?: string | null
          serves_count?: number | null
          updated_at?: string
          updated_by?: string | null
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_variants_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          category_name: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          is_deleted: boolean
          slug: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category_name: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_deleted?: boolean
          slug: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category_name?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_deleted?: boolean
          slug?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          category_id: string
          created_at: string
          created_by: string | null
          cuisine_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          dietary_type_id: string | null
          full_description: string | null
          id: string
          ingredients: string | null
          is_active: boolean
          is_bestseller: boolean
          is_deleted: boolean
          is_new: boolean
          is_recommended: boolean
          item_name: string
          meal_timing: string | null
          preparation_type: string | null
          short_description: string | null
          slug: string
          spice_level: string | null
          subcategory_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          cuisine_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          dietary_type_id?: string | null
          full_description?: string | null
          id?: string
          ingredients?: string | null
          is_active?: boolean
          is_bestseller?: boolean
          is_deleted?: boolean
          is_new?: boolean
          is_recommended?: boolean
          item_name: string
          meal_timing?: string | null
          preparation_type?: string | null
          short_description?: string | null
          slug: string
          spice_level?: string | null
          subcategory_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          cuisine_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          dietary_type_id?: string | null
          full_description?: string | null
          id?: string
          ingredients?: string | null
          is_active?: boolean
          is_bestseller?: boolean
          is_deleted?: boolean
          is_new?: boolean
          is_recommended?: boolean
          item_name?: string
          meal_timing?: string | null
          preparation_type?: string | null
          short_description?: string | null
          slug?: string
          spice_level?: string | null
          subcategory_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_cuisine_id_fkey"
            columns: ["cuisine_id"]
            isOneToOne: false
            referencedRelation: "cuisine_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_dietary_type_id_fkey"
            columns: ["dietary_type_id"]
            isOneToOne: false
            referencedRelation: "dietary_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "menu_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items_history: {
        Row: {
          change_source: string | null
          changed_at: string
          changed_by: string | null
          field_changed: string
          id: string
          item_id: string | null
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          change_source?: string | null
          changed_at?: string
          changed_by?: string | null
          field_changed: string
          id?: string
          item_id?: string | null
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          change_source?: string | null
          changed_at?: string
          changed_by?: string | null
          field_changed?: string
          id?: string
          item_id?: string | null
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_history_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_subcategories: {
        Row: {
          category_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          is_deleted: boolean
          slug: string
          subcategory_name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          slug: string
          subcategory_name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          slug?: string
          subcategory_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_addons: {
        Row: {
          addon_name_snapshot: string
          id: string
          order_item_id: string
          price_snapshot: number
          quantity: number
        }
        Insert: {
          addon_name_snapshot: string
          id?: string
          order_item_id: string
          price_snapshot: number
          quantity?: number
        }
        Update: {
          addon_name_snapshot?: string
          id?: string
          order_item_id?: string
          price_snapshot?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_item_addons_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          item_id: string | null
          item_name_snapshot: string
          order_id: string
          quantity: number
          special_instructions: string | null
          total_price: number
          unit_price_snapshot: number
          variant_id: string | null
          variant_name_snapshot: string
        }
        Insert: {
          id?: string
          item_id?: string | null
          item_name_snapshot: string
          order_id: string
          quantity?: number
          special_instructions?: string | null
          total_price: number
          unit_price_snapshot: number
          variant_id?: string | null
          variant_name_snapshot: string
        }
        Update: {
          id?: string
          item_id?: string | null
          item_name_snapshot?: string
          order_id?: string
          quantity?: number
          special_instructions?: string | null
          total_price?: number
          unit_price_snapshot?: number
          variant_id?: string | null
          variant_name_snapshot?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "item_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          changed_by_role: string | null
          created_at: string
          id: string
          ip_address: string | null
          new_status: string
          old_status: string | null
          order_id: string
          remarks: string | null
        }
        Insert: {
          changed_by?: string | null
          changed_by_role?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_status: string
          old_status?: string | null
          order_id: string
          remarks?: string | null
        }
        Update: {
          changed_by?: string | null
          changed_by_role?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_status?: string
          old_status?: string | null
          order_id?: string
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancellation_reason: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_notes: string | null
          delivery_address_id: string | null
          delivery_charge: number
          discount_amount: number
          grand_total: number
          id: string
          is_walk_in: boolean
          last_updated_by: string | null
          order_number: string
          order_status: string
          order_type: string
          outlet_id: string
          payment_status: string
          subtotal: number
          table_number: string | null
          tax_amount: number
          updated_at: string
          walk_in_customer_name: string | null
          walk_in_customer_phone: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          delivery_address_id?: string | null
          delivery_charge?: number
          discount_amount?: number
          grand_total?: number
          id?: string
          is_walk_in?: boolean
          last_updated_by?: string | null
          order_number: string
          order_status?: string
          order_type: string
          outlet_id: string
          payment_status?: string
          subtotal?: number
          table_number?: string | null
          tax_amount?: number
          updated_at?: string
          walk_in_customer_name?: string | null
          walk_in_customer_phone?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          delivery_address_id?: string | null
          delivery_charge?: number
          discount_amount?: number
          grand_total?: number
          id?: string
          is_walk_in?: boolean
          last_updated_by?: string | null
          order_number?: string
          order_status?: string
          order_type?: string
          outlet_id?: string
          payment_status?: string
          subtotal?: number
          table_number?: string | null
          tax_amount?: number
          updated_at?: string
          walk_in_customer_name?: string | null
          walk_in_customer_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_address_id_fkey"
            columns: ["delivery_address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      outlet_item_availability: {
        Row: {
          available_from: string | null
          available_to: string | null
          id: string
          is_available: boolean
          item_id: string
          outlet_id: string
          stock_status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          available_from?: string | null
          available_to?: string | null
          id?: string
          is_available?: boolean
          item_id: string
          outlet_id: string
          stock_status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          available_from?: string | null
          available_to?: string | null
          id?: string
          is_available?: boolean
          item_id?: string
          outlet_id?: string
          stock_status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outlet_item_availability_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outlet_item_availability_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      outlet_variant_prices: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_available: boolean
          item_id: string
          mrp_price: number | null
          outlet_id: string
          selling_price: number
          updated_at: string
          updated_by: string | null
          variant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_available?: boolean
          item_id: string
          mrp_price?: number | null
          outlet_id: string
          selling_price: number
          updated_at?: string
          updated_by?: string | null
          variant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_available?: boolean
          item_id?: string
          mrp_price?: number | null
          outlet_id?: string
          selling_price?: number
          updated_at?: string
          updated_by?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outlet_variant_prices_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outlet_variant_prices_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outlet_variant_prices_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "item_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      outlet_variant_prices_history: {
        Row: {
          change_reason: string | null
          changed_at: string
          changed_by: string | null
          id: string
          ip_address: string | null
          new_mrp_price: number | null
          new_selling_price: number | null
          old_mrp_price: number | null
          old_selling_price: number | null
          outlet_id: string | null
          outlet_variant_price_id: string | null
          variant_id: string | null
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          ip_address?: string | null
          new_mrp_price?: number | null
          new_selling_price?: number | null
          old_mrp_price?: number | null
          old_selling_price?: number | null
          outlet_id?: string | null
          outlet_variant_price_id?: string | null
          variant_id?: string | null
        }
        Update: {
          change_reason?: string | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          ip_address?: string | null
          new_mrp_price?: number | null
          new_selling_price?: number | null
          old_mrp_price?: number | null
          old_selling_price?: number | null
          outlet_id?: string | null
          outlet_variant_price_id?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outlet_variant_prices_history_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outlet_variant_prices_history_outlet_variant_price_id_fkey"
            columns: ["outlet_variant_price_id"]
            isOneToOne: false
            referencedRelation: "outlet_variant_prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outlet_variant_prices_history_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "item_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      outlets: {
        Row: {
          address: string | null
          city: string | null
          closing_time: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_deleted: boolean
          latitude: number | null
          longitude: number | null
          opening_time: string | null
          outlet_code: string
          outlet_name: string
          phone: string | null
          pincode: string | null
          state: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          closing_time?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_deleted?: boolean
          latitude?: number | null
          longitude?: number | null
          opening_time?: string | null
          outlet_code: string
          outlet_name: string
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          closing_time?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_deleted?: boolean
          latitude?: number | null
          longitude?: number | null
          opening_time?: string | null
          outlet_code?: string
          outlet_name?: string
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      payment_status_history: {
        Row: {
          created_at: string
          event_type: string | null
          gateway_payload: Json | null
          id: string
          new_status: string
          old_status: string | null
          payment_id: string
        }
        Insert: {
          created_at?: string
          event_type?: string | null
          gateway_payload?: Json | null
          id?: string
          new_status: string
          old_status?: string | null
          payment_id: string
        }
        Update: {
          created_at?: string
          event_type?: string | null
          gateway_payload?: Json | null
          id?: string
          new_status?: string
          old_status?: string | null
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_status_history_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          gateway_response_snapshot: Json | null
          id: string
          ip_address: string | null
          merchant_transaction_id: string | null
          order_id: string
          paid_at: string | null
          payment_gateway: string
          payment_mode: string | null
          payment_status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          gateway_response_snapshot?: Json | null
          id?: string
          ip_address?: string | null
          merchant_transaction_id?: string | null
          order_id: string
          paid_at?: string | null
          payment_gateway?: string
          payment_mode?: string | null
          payment_status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          gateway_response_snapshot?: Json | null
          id?: string
          ip_address?: string | null
          merchant_transaction_id?: string | null
          order_id?: string
          paid_at?: string | null
          payment_gateway?: string
          payment_mode?: string | null
          payment_status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_admin_role: { Args: never; Returns: string }
      auth_customer_id: { Args: never; Returns: string }
      is_active_admin: { Args: { _uid: string }; Returns: boolean }
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
