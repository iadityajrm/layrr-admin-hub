import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase credentials. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables. See SETUP.md for instructions.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: 'admin' | 'moderator' | 'user';
        };
      };
      users: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: string;
          status: string;
          created_at: string;
          earnings_total: number;
        };
      };
      templates: {
        Row: {
          id: string;
          title: string;
          description: string;
          category: string;
          preview_url: string;
          created_at: string;
        };
      };
      submissions: {
        Row: {
          id: string;
          user_id: string;
          template_id: string;
          project_id: string;
          project_name: string;
          status: string;
          submitted_at: string;
          image_url?: string;
          price?: number;
          commission_rate?: number;
        };
      };
      projects: {
        Row: {
          id: string;
          project_name: string;
          slug: string;
          description?: string;
          price: number;
          commission_rate: number;
          approval_status: 'pending' | 'under_review' | 'approved' | 'rejected';
          owner_id?: string;
          created_at: string;
        };
      };
      earnings: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          status: string;
          source?: string;
          created_at: string;
        };
      };
    };
  };
};
