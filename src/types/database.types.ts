/**
 * Supabase Database TypeScript Schema Definition
 * Generated for Imovip Pro PostgreSQL Schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'buyer' | 'owner' | 'broker' | 'agency' | 'admin';
export type PropertyPurpose = 'sale' | 'rent' | 'seasonal' | 'launch';
export type PropertyType =
  | 'apartment'
  | 'house'
  | 'condo_house'
  | 'penthouse'
  | 'commercial'
  | 'land'
  | 'rural'
  | 'studio'
  | 'loft'
  | 'warehouse';
export type PropertyStatus =
  | 'draft'
  | 'pending_moderation'
  | 'active'
  | 'paused'
  | 'sold'
  | 'rented'
  | 'archived';
export type SolarOrientation =
  | 'morning'
  | 'afternoon'
  | 'north'
  | 'south'
  | 'east'
  | 'west';
export type MediaType = 'image' | 'floorplan' | 'video' | 'tour_360' | 'document';
export type MediaCategory =
  | 'fachada'
  | 'sala'
  | 'quarto'
  | 'cozinha'
  | 'banheiro'
  | 'lazer'
  | 'planta'
  | 'vista'
  | 'garagem'
  | 'outros';
export type LeadOrigin =
  | 'portal_form'
  | 'whatsapp_click'
  | 'phone_call'
  | 'schedule_visit'
  | 'manual_entry'
  | 'import';
export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'visit_scheduled'
  | 'proposal_sent'
  | 'proposal_made'
  | 'closed_won'
  | 'lost'
  | 'archived';
export type ClientType =
  | 'buyer'
  | 'seller'
  | 'tenant'
  | 'landlord'
  | 'investor'
  | 'partner';
export type ClientStatus = 'prospect' | 'active' | 'inactive' | 'blocked';
export type InteractionType =
  | 'call'
  | 'whatsapp'
  | 'email'
  | 'meeting'
  | 'visit'
  | 'proposal'
  | 'note'
  | 'status_change';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type NotificationType =
  | 'lead_received'
  | 'visit_scheduled'
  | 'proposal_received'
  | 'property_approved'
  | 'price_change'
  | 'chat_message'
  | 'system_alert';
export type ReportType =
  | 'broker_performance'
  | 'property_metrics'
  | 'lead_conversion'
  | 'sales_financial'
  | 'market_neighborhood';
export type AuditAction =
  | 'INSERT'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'EXPORT'
  | 'STATUS_CHANGE';

export interface Database {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string;
          name: string;
          slug: string;
          creci_juridico: string | null;
          cnpj: string | null;
          logo_url: string | null;
          phone: string | null;
          email: string | null;
          address: Json;
          settings: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          creci_juridico?: string | null;
          cnpj?: string | null;
          logo_url?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: Json;
          settings?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['teams']['Insert']>;
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          phone: string | null;
          whatsapp: string | null;
          avatar_url: string | null;
          role: UserRole;
          creci: string | null;
          cpf_cnpj: string | null;
          bio: string | null;
          team_id: string | null;
          agency_name: string | null;
          agency_logo: string | null;
          verified: boolean;
          verified_at: string | null;
          rating: number;
          total_deals: number;
          is_active: boolean;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          phone?: string | null;
          whatsapp?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          creci?: string | null;
          cpf_cnpj?: string | null;
          bio?: string | null;
          team_id?: string | null;
          agency_name?: string | null;
          agency_logo?: string | null;
          verified?: boolean;
          verified_at?: string | null;
          rating?: number;
          total_deals?: number;
          is_active?: boolean;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      properties: {
        Row: {
          id: string;
          code: string;
          user_id: string;
          team_id: string | null;
          title: string;
          slug: string;
          description: string;
          purpose: PropertyPurpose;
          type: PropertyType;
          status: PropertyStatus;
          featured: boolean;
          is_exclusive: boolean;
          price: number;
          condo_fee: number;
          iptu_fee: number;
          total_area: number;
          useful_area: number;
          bedrooms: number;
          suites: number;
          bathrooms: number;
          parking_spots: number;
          floor: number | null;
          total_floors: number | null;
          solar_orientation: SolarOrientation | null;
          construction_year: number | null;
          delivery_date: string | null;
          video_url: string | null;
          tour_360_url: string | null;
          views_count: number;
          leads_count: number;
          favorites_count: number;
          shares_count: number;
          rejection_reason: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code?: string;
          user_id: string;
          team_id?: string | null;
          title: string;
          slug: string;
          description: string;
          purpose?: PropertyPurpose;
          type?: PropertyType;
          status?: PropertyStatus;
          featured?: boolean;
          is_exclusive?: boolean;
          price: number;
          condo_fee?: number;
          iptu_fee?: number;
          total_area: number;
          useful_area: number;
          bedrooms?: number;
          suites?: number;
          bathrooms?: number;
          parking_spots?: number;
          floor?: number | null;
          total_floors?: number | null;
          solar_orientation?: SolarOrientation | null;
          construction_year?: number | null;
          delivery_date?: string | null;
          video_url?: string | null;
          tour_360_url?: string | null;
          views_count?: number;
          leads_count?: number;
          favorites_count?: number;
          shares_count?: number;
          rejection_reason?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['properties']['Insert']>;
      };
      property_locations: {
        Row: {
          id: string;
          property_id: string;
          zip_code: string;
          street: string;
          street_number: string | null;
          complement: string | null;
          neighborhood: string;
          city: string;
          state: string;
          country: string;
          condo_name: string | null;
          zone: string | null;
          latitude: number;
          longitude: number;
          hide_exact_address: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          zip_code: string;
          street: string;
          street_number?: string | null;
          complement?: string | null;
          neighborhood: string;
          city: string;
          state: string;
          country?: string;
          condo_name?: string | null;
          zone?: string | null;
          latitude: number;
          longitude: number;
          hide_exact_address?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['property_locations']['Insert']>;
      };
      property_images: {
        Row: {
          id: string;
          property_id: string;
          url: string;
          thumbnail_url: string | null;
          media_type: MediaType;
          category: MediaCategory | null;
          caption: string | null;
          is_cover: boolean;
          display_order: number;
          file_size_bytes: number | null;
          mime_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          url: string;
          thumbnail_url?: string | null;
          media_type?: MediaType;
          category?: MediaCategory | null;
          caption?: string | null;
          is_cover?: boolean;
          display_order?: number;
          file_size_bytes?: number | null;
          mime_type?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['property_images']['Insert']>;
      };
      features: {
        Row: {
          id: string;
          name: string;
          category: string;
          icon: string;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          category: string;
          icon: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['features']['Insert']>;
      };
      property_features: {
        Row: {
          property_id: string;
          feature_id: string;
          created_at: string;
        };
        Insert: {
          property_id: string;
          feature_id: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['property_features']['Insert']>;
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          property_id: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          property_id: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['favorites']['Insert']>;
      };
      saved_searches: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          filters: Json;
          alert_frequency: string;
          last_alert_sent_at: string | null;
          match_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          filters?: Json;
          alert_frequency?: string;
          last_alert_sent_at?: string | null;
          match_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['saved_searches']['Insert']>;
      };
      leads: {
        Row: {
          id: string;
          property_id: string | null;
          advertiser_id: string;
          team_id: string | null;
          buyer_id: string | null;
          buyer_name: string;
          buyer_email: string;
          buyer_phone: string;
          message: string | null;
          origin: LeadOrigin;
          status: LeadStatus;
          budget: number | null;
          scheduled_visit_date: string | null;
          notes: string | null;
          meta: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id?: string | null;
          advertiser_id: string;
          team_id?: string | null;
          buyer_id?: string | null;
          buyer_name: string;
          buyer_email: string;
          buyer_phone: string;
          message?: string | null;
          origin?: LeadOrigin;
          status?: LeadStatus;
          budget?: number | null;
          scheduled_visit_date?: string | null;
          notes?: string | null;
          meta?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['leads']['Insert']>;
      };
      clients: {
        Row: {
          id: string;
          broker_id: string;
          team_id: string | null;
          user_id: string | null;
          name: string;
          email: string | null;
          phone: string;
          secondary_phone: string | null;
          cpf_cnpj: string | null;
          client_type: ClientType;
          client_status: ClientStatus;
          tags: string[];
          lead_source: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          broker_id: string;
          team_id?: string | null;
          user_id?: string | null;
          name: string;
          email?: string | null;
          phone: string;
          secondary_phone?: string | null;
          cpf_cnpj?: string | null;
          client_type?: ClientType;
          client_status?: ClientStatus;
          tags?: string[];
          lead_source?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['clients']['Insert']>;
      };
      client_interests: {
        Row: {
          id: string;
          client_id: string;
          target_purpose: PropertyPurpose | null;
          property_types: PropertyType[];
          preferred_cities: string[];
          preferred_neighborhoods: string[];
          min_price: number | null;
          max_price: number | null;
          min_bedrooms: number | null;
          min_parking_spots: number | null;
          min_useful_area: number | null;
          must_have_features: string[];
          financing_approved: boolean;
          urgency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          target_purpose?: PropertyPurpose | null;
          property_types?: PropertyType[];
          preferred_cities?: string[];
          preferred_neighborhoods?: string[];
          min_price?: number | null;
          max_price?: number | null;
          min_bedrooms?: number | null;
          min_parking_spots?: number | null;
          min_useful_area?: number | null;
          must_have_features?: string[];
          financing_approved?: boolean;
          urgency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['client_interests']['Insert']>;
      };
      crm_pipeline_stages: {
        Row: {
          id: string;
          broker_id: string | null;
          team_id: string | null;
          title: string;
          stage_key: string;
          color: string;
          display_order: number;
          is_won_stage: boolean;
          is_lost_stage: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          broker_id?: string | null;
          team_id?: string | null;
          title: string;
          stage_key: string;
          color?: string;
          display_order?: number;
          is_won_stage?: boolean;
          is_lost_stage?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['crm_pipeline_stages']['Insert']>;
      };
      crm_deals: {
        Row: {
          id: string;
          broker_id: string;
          team_id: string | null;
          client_id: string;
          property_id: string | null;
          lead_id: string | null;
          stage_id: string;
          title: string;
          deal_value: number;
          estimated_commission: number | null;
          expected_closing_date: string | null;
          probability_pct: number | null;
          loss_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          broker_id: string;
          team_id?: string | null;
          client_id: string;
          property_id?: string | null;
          lead_id?: string | null;
          stage_id: string;
          title: string;
          deal_value?: number;
          estimated_commission?: number | null;
          expected_closing_date?: string | null;
          probability_pct?: number | null;
          loss_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['crm_deals']['Insert']>;
      };
      crm_interactions: {
        Row: {
          id: string;
          broker_id: string;
          client_id: string | null;
          lead_id: string | null;
          deal_id: string | null;
          property_id: string | null;
          interaction_type: InteractionType;
          title: string;
          description: string;
          occurred_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          broker_id: string;
          client_id?: string | null;
          lead_id?: string | null;
          deal_id?: string | null;
          property_id?: string | null;
          interaction_type?: InteractionType;
          title: string;
          description: string;
          occurred_at?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['crm_interactions']['Insert']>;
      };
      crm_tasks: {
        Row: {
          id: string;
          broker_id: string;
          client_id: string | null;
          deal_id: string | null;
          property_id: string | null;
          title: string;
          description: string | null;
          due_date: string;
          priority: TaskPriority;
          status: TaskStatus;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          broker_id: string;
          client_id?: string | null;
          deal_id?: string | null;
          property_id?: string | null;
          title: string;
          description?: string | null;
          due_date: string;
          priority?: TaskPriority;
          status?: TaskStatus;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['crm_tasks']['Insert']>;
      };
      conversations: {
        Row: {
          id: string;
          property_id: string | null;
          buyer_id: string;
          advertiser_id: string;
          last_message_text: string | null;
          last_message_at: string;
          buyer_unread_count: number;
          advertiser_unread_count: number;
          is_archived_buyer: boolean;
          is_archived_advertiser: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id?: string | null;
          buyer_id: string;
          advertiser_id: string;
          last_message_text?: string | null;
          last_message_at?: string;
          buyer_unread_count?: number;
          advertiser_unread_count?: number;
          is_archived_buyer?: boolean;
          is_archived_advertiser?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>;
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          text: string;
          attachments: Json;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          text: string;
          attachments?: Json;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          message: string;
          link: string | null;
          data: Json;
          read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          title: string;
          message: string;
          link?: string | null;
          data?: Json;
          read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
      reports: {
        Row: {
          id: string;
          user_id: string;
          team_id: string | null;
          report_type: ReportType;
          title: string;
          parameters: Json;
          metrics_payload: Json;
          generated_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          team_id?: string | null;
          report_type: ReportType;
          title: string;
          parameters?: Json;
          metrics_payload?: Json;
          generated_at?: string;
          expires_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['reports']['Insert']>;
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          table_name: string;
          record_id: string | null;
          action: AuditAction;
          old_data: Json | null;
          new_data: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          table_name: string;
          record_id?: string | null;
          action: AuditAction;
          old_data?: Json | null;
          new_data?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
      };
    };
  };
}
