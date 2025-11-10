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
          name: string;
          email: string;
          role: string;
          status: string;
          joined_at: string;
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
          project_name: string;
          status: string;
          submitted_at: string;
        };
      };
      earnings: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          status: string;
          created_at: string;
        };
      };
      payouts: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          processed_at: string;
        };
      };
    };
  };
};
