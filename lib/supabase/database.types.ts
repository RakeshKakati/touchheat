export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          api_key: string;
          allowed_domains: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          api_key: string;
          allowed_domains?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          api_key?: string;
          allowed_domains?: string[] | null;
          created_at?: string;
        };
      };
      touch_events: {
        Row: {
          id: number;
          project_id: string;
          x: number;
          y: number;
          viewport_w: number;
          viewport_h: number;
          thumb_zone: 'left' | 'right' | 'center' | 'unknown';
          mis_tap: boolean;
          pressure: number | null;
          selector: string | null;
          url: string;
          ts: string;
        };
        Insert: {
          id?: number;
          project_id: string;
          x: number;
          y: number;
          viewport_w: number;
          viewport_h: number;
          thumb_zone: 'left' | 'right' | 'center' | 'unknown';
          mis_tap?: boolean;
          pressure?: number | null;
          selector?: string | null;
          url: string;
          ts?: string;
        };
        Update: {
          id?: number;
          project_id?: string;
          x?: number;
          y?: number;
          viewport_w?: number;
          viewport_h?: number;
          thumb_zone?: 'left' | 'right' | 'center' | 'unknown';
          mis_tap?: boolean;
          pressure?: number | null;
          selector?: string | null;
          url?: string;
          ts?: string;
        };
      };
      insights: {
        Row: {
          id: string;
          project_id: string;
          insight_type: string;
          payload: Json;
          score: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          insight_type: string;
          payload: Json;
          score?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          insight_type?: string;
          payload?: Json;
          score?: number | null;
          created_at?: string;
        };
      };
    };
  };
}

