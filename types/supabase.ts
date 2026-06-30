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
      animal_health_logs: {
        Row: {
          animal_id: string
          created_at: string | null
          date: string
          fed: boolean
          id: number
          note: string | null
          weight_g: number | null
        }
        Insert: {
          animal_id: string
          created_at?: string | null
          date?: string
          fed?: boolean
          id?: never
          note?: string | null
          weight_g?: number | null
        }
        Update: {
          animal_id?: string
          created_at?: string | null
          date?: string
          fed?: boolean
          id?: never
          note?: string | null
          weight_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "animal_health_logs_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      animals: {
        Row: {
          birthday: string
          buyer_contact: string | null
          buyer_name: string | null
          cost_price: number
          created_at: string
          gender_type: string
          gender_value: string
          genes: Json
          id: string
          image_url: string
          images: string[] | null
          is_breeder: boolean
          is_hot: boolean
          laying_event_id: string | null
          listing_price: number
          morph: string
          note: string
          parent_female_id: string | null
          parent_male_id: string | null
          ship_carrier: string | null
          shipped_at: string | null
          sold_price: number | null
          source: string
          species: string
          status: string
          tags: Json | null
          tracking_no: string | null
        }
        Insert: {
          birthday?: string
          buyer_contact?: string | null
          buyer_name?: string | null
          cost_price?: number
          created_at?: string
          gender_type?: string
          gender_value?: string
          genes?: Json
          id: string
          image_url?: string
          images?: string[] | null
          is_breeder?: boolean
          is_hot?: boolean
          laying_event_id?: string | null
          listing_price?: number
          morph?: string
          note?: string
          parent_female_id?: string | null
          parent_male_id?: string | null
          ship_carrier?: string | null
          shipped_at?: string | null
          sold_price?: number | null
          source?: string
          species?: string
          status?: string
          tags?: Json | null
          tracking_no?: string | null
        }
        Update: {
          birthday?: string
          buyer_contact?: string | null
          buyer_name?: string | null
          cost_price?: number
          created_at?: string
          gender_type?: string
          gender_value?: string
          genes?: Json
          id?: string
          image_url?: string
          images?: string[] | null
          is_breeder?: boolean
          is_hot?: boolean
          laying_event_id?: string | null
          listing_price?: number
          morph?: string
          note?: string
          parent_female_id?: string | null
          parent_male_id?: string | null
          ship_carrier?: string | null
          shipped_at?: string | null
          sold_price?: number | null
          source?: string
          species?: string
          status?: string
          tags?: Json | null
          tracking_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "animals_laying_event_id_fkey"
            columns: ["laying_event_id"]
            isOneToOne: false
            referencedRelation: "breeding_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_parent_female_id_fkey"
            columns: ["parent_female_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_parent_male_id_fkey"
            columns: ["parent_male_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author: string | null
          category: string | null
          content: string | null
          faq: Json | null
          id: string
          image_url: string | null
          keywords: string | null
          publish_date: string | null
          status: string | null
          summary: string | null
          title: string | null
        }
        Insert: {
          author?: string | null
          category?: string | null
          content?: string | null
          faq?: Json | null
          id: string
          image_url?: string | null
          keywords?: string | null
          publish_date?: string | null
          status?: string | null
          summary?: string | null
          title?: string | null
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string | null
          faq?: Json | null
          id?: string
          image_url?: string | null
          keywords?: string | null
          publish_date?: string | null
          status?: string | null
          summary?: string | null
          title?: string | null
        }
        Relationships: []
      }
      auction_bids: {
        Row: {
          amount: number
          auction_id: string | null
          bid_time: string | null
          id: string
          phone: string | null
          user_name: string
        }
        Insert: {
          amount: number
          auction_id?: string | null
          bid_time?: string | null
          id?: string
          phone?: string | null
          user_name: string
        }
        Update: {
          amount?: number
          auction_id?: string | null
          bid_time?: string | null
          id?: string
          phone?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      auctions: {
        Row: {
          animal_id: string | null
          birth_year: string | null
          buy_now_price: number | null
          created_at: string | null
          diet: string | null
          end_time: string
          feeding_freq: string | null
          gender: string | null
          id: string
          images: Json | null
          min_increment: number | null
          morph: string
          note: string | null
          shipping_info: string | null
          start_price: number | null
          status: string | null
          title: string
          tongs_fed: string | null
        }
        Insert: {
          animal_id?: string | null
          birth_year?: string | null
          buy_now_price?: number | null
          created_at?: string | null
          diet?: string | null
          end_time: string
          feeding_freq?: string | null
          gender?: string | null
          id: string
          images?: Json | null
          min_increment?: number | null
          morph: string
          note?: string | null
          shipping_info?: string | null
          start_price?: number | null
          status?: string | null
          title: string
          tongs_fed?: string | null
        }
        Update: {
          animal_id?: string | null
          birth_year?: string | null
          buy_now_price?: number | null
          created_at?: string | null
          diet?: string | null
          end_time?: string
          feeding_freq?: string | null
          gender?: string | null
          id?: string
          images?: Json | null
          min_increment?: number | null
          morph?: string
          note?: string | null
          shipping_info?: string | null
          start_price?: number | null
          status?: string | null
          title?: string
          tongs_fed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auctions_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      blacklist: {
        Row: {
          created_at: string
          email: string | null
          id: number
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: number
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: number
        }
        Relationships: []
      }
      breeding_events: {
        Row: {
          breeding_record_id: string
          created_at: string
          event_date: string
          id: string
          incubation_temp: number
          is_supplemental: boolean
          normal_eggs: number
          note: string
          stuck_eggs: number
          type: string
          water_eggs: number
        }
        Insert: {
          breeding_record_id: string
          created_at?: string
          event_date: string
          id: string
          incubation_temp?: number
          is_supplemental?: boolean
          normal_eggs?: number
          note?: string
          stuck_eggs?: number
          type: string
          water_eggs?: number
        }
        Update: {
          breeding_record_id?: string
          created_at?: string
          event_date?: string
          id?: string
          incubation_temp?: number
          is_supplemental?: boolean
          normal_eggs?: number
          note?: string
          stuck_eggs?: number
          type?: string
          water_eggs?: number
        }
        Relationships: [
          {
            foreignKeyName: "breeding_events_breeding_record_id_fkey"
            columns: ["breeding_record_id"]
            isOneToOne: false
            referencedRelation: "breeding_records"
            referencedColumns: ["id"]
          },
        ]
      }
      breeding_records: {
        Row: {
          created_at: string
          female_id: string
          id: string
          male_id: string
          note: string
          paired_date: string
          status: string
        }
        Insert: {
          created_at?: string
          female_id: string
          id: string
          male_id: string
          note?: string
          paired_date: string
          status?: string
        }
        Update: {
          created_at?: string
          female_id?: string
          id?: string
          male_id?: string
          note?: string
          paired_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "breeding_records_female_id_fkey"
            columns: ["female_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breeding_records_male_id_fkey"
            columns: ["male_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      clutches: {
        Row: {
          breeding_record_id: string
          clutch_date: string
          created_at: string
          egg_count: number
          id: string
          note: string
        }
        Insert: {
          breeding_record_id: string
          clutch_date: string
          created_at?: string
          egg_count?: number
          id: string
          note?: string
        }
        Update: {
          breeding_record_id?: string
          clutch_date?: string
          created_at?: string
          egg_count?: number
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "clutches_breeding_record_id_fkey"
            columns: ["breeding_record_id"]
            isOneToOne: false
            referencedRelation: "breeding_records"
            referencedColumns: ["id"]
          },
        ]
      }
      config: {
        Row: {
          id: number
          text: string | null
          url: string | null
        }
        Insert: {
          id?: number
          text?: string | null
          url?: string | null
        }
        Update: {
          id?: number
          text?: string | null
          url?: string | null
        }
        Relationships: []
      }
      eggs: {
        Row: {
          created_at: string
          egg_count: number
          female_id: string
          id: string
          incubation_temp: number
          laying_date: string
          male_id: string
          note: string
          status: string
        }
        Insert: {
          created_at?: string
          egg_count?: number
          female_id: string
          id: string
          incubation_temp?: number
          laying_date: string
          male_id: string
          note?: string
          status?: string
        }
        Update: {
          created_at?: string
          egg_count?: number
          female_id?: string
          id?: string
          incubation_temp?: number
          laying_date?: string
          male_id?: string
          note?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "eggs_female_id_fkey"
            columns: ["female_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eggs_male_id_fkey"
            columns: ["male_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          id: string
          note: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          date: string
          id: string
          note?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          id?: string
          note?: string
        }
        Relationships: []
      }
      genetic_pages: {
        Row: {
          brief: string | null
          detail: string | null
          discovery_year: number | null
          english_name: string | null
          id: number
          image_url: string | null
          inheritance_mode: string | null
          name: string | null
          original_breeder: string | null
          source: string | null
          warning: string | null
        }
        Insert: {
          brief?: string | null
          detail?: string | null
          discovery_year?: number | null
          english_name?: string | null
          id?: number
          image_url?: string | null
          inheritance_mode?: string | null
          name?: string | null
          original_breeder?: string | null
          source?: string | null
          warning?: string | null
        }
        Update: {
          brief?: string | null
          detail?: string | null
          discovery_year?: number | null
          english_name?: string | null
          id?: number
          image_url?: string | null
          inheritance_mode?: string | null
          name?: string | null
          original_breeder?: string | null
          source?: string | null
          warning?: string | null
        }
        Relationships: []
      }
      hatchlings: {
        Row: {
          animal_id: string | null
          clutch_id: string
          created_at: string
          hatch_date: string
          id: string
          note: string
        }
        Insert: {
          animal_id?: string | null
          clutch_id: string
          created_at?: string
          hatch_date: string
          id: string
          note?: string
        }
        Update: {
          animal_id?: string | null
          clutch_id?: string
          created_at?: string
          hatch_date?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "hatchlings_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hatchlings_clutch_id_fkey"
            columns: ["clutch_id"]
            isOneToOne: false
            referencedRelation: "clutches"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          accept_species: string[] | null
          address: string
          city: string
          created_at: string | null
          district: string
          has_emergency: boolean | null
          hours: string | null
          id: string
          map_url: string | null
          name: string
          phone: string | null
          region: string | null
          status: string | null
          updated_at: string | null
          verified_at: string | null
        }
        Insert: {
          accept_species?: string[] | null
          address: string
          city: string
          created_at?: string | null
          district: string
          has_emergency?: boolean | null
          hours?: string | null
          id: string
          map_url?: string | null
          name: string
          phone?: string | null
          region?: string | null
          status?: string | null
          updated_at?: string | null
          verified_at?: string | null
        }
        Update: {
          accept_species?: string[] | null
          address?: string
          city?: string
          created_at?: string | null
          district?: string
          has_emergency?: boolean | null
          hours?: string | null
          id?: string
          map_url?: string | null
          name?: string
          phone?: string | null
          region?: string | null
          status?: string | null
          updated_at?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      inventory: {
        Row: {
          birthday: string | null
          cost_price: string | null
          gender_type: string | null
          gender_value: string | null
          genes: string | null
          id: string
          image_url: string | null
          is_hot: string | null
          listing_price: string | null
          morph: string | null
          note: string | null
          sold_price: string | null
          source: string | null
          species: string | null
          status: string | null
        }
        Insert: {
          birthday?: string | null
          cost_price?: string | null
          gender_type?: string | null
          gender_value?: string | null
          genes?: string | null
          id: string
          image_url?: string | null
          is_hot?: string | null
          listing_price?: string | null
          morph?: string | null
          note?: string | null
          sold_price?: string | null
          source?: string | null
          species?: string | null
          status?: string | null
        }
        Update: {
          birthday?: string | null
          cost_price?: string | null
          gender_type?: string | null
          gender_value?: string | null
          genes?: string | null
          id?: string
          image_url?: string | null
          is_hot?: string | null
          listing_price?: string | null
          morph?: string | null
          note?: string | null
          sold_price?: string | null
          source?: string | null
          species?: string | null
          status?: string | null
        }
        Relationships: []
      }
      merchandise: {
        Row: {
          available: string | null
          category: string | null
          description: string | null
          external_link: string | null
          image_url: string | null
          item_id: string
          name: string | null
          price: string | null
        }
        Insert: {
          available?: string | null
          category?: string | null
          description?: string | null
          external_link?: string | null
          image_url?: string | null
          item_id: string
          name?: string | null
          price?: string | null
        }
        Update: {
          available?: string | null
          category?: string | null
          description?: string | null
          external_link?: string | null
          image_url?: string | null
          item_id?: string
          name?: string | null
          price?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      view_incoming: {
        Row: {
          birthday: string | null
          cost_price: string | null
          gender_type: string | null
          gender_value: string | null
          genes: string | null
          id: string | null
          morph: string | null
          source: string | null
          species: string | null
          status: string | null
        }
        Insert: {
          birthday?: string | null
          cost_price?: string | null
          gender_type?: string | null
          gender_value?: string | null
          genes?: string | null
          id?: string | null
          morph?: string | null
          source?: string | null
          species?: string | null
          status?: string | null
        }
        Update: {
          birthday?: string | null
          cost_price?: string | null
          gender_type?: string | null
          gender_value?: string | null
          genes?: string | null
          id?: string | null
          morph?: string | null
          source?: string | null
          species?: string | null
          status?: string | null
        }
        Relationships: []
      }
      view_listed: {
        Row: {
          id: string | null
          image_url: string | null
          is_hot: string | null
          listing_price: string | null
          morph: string | null
          note: string | null
          species: string | null
          status: string | null
        }
        Insert: {
          id?: string | null
          image_url?: string | null
          is_hot?: string | null
          listing_price?: string | null
          morph?: string | null
          note?: string | null
          species?: string | null
          status?: string | null
        }
        Update: {
          id?: string | null
          image_url?: string | null
          is_hot?: string | null
          listing_price?: string | null
          morph?: string | null
          note?: string | null
          species?: string | null
          status?: string | null
        }
        Relationships: []
      }
      view_sold: {
        Row: {
          id: string | null
          image_url: string | null
          morph: string | null
          sold_price: string | null
          species: string | null
          status: string | null
        }
        Insert: {
          id?: string | null
          image_url?: string | null
          morph?: string | null
          sold_price?: string | null
          species?: string | null
          status?: string | null
        }
        Update: {
          id?: string | null
          image_url?: string | null
          morph?: string | null
          sold_price?: string | null
          species?: string | null
          status?: string | null
        }
        Relationships: []
      }
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
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
    Enums: {},
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
