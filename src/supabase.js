import { createClient } from '@supabase/supabase-js'

// --- Supabase 設定 ---
const SUPABASE_URL = 'https://sfndneptcwhblvrxykcy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmRuZXB0Y3doYmx2cnh5a2N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjYxMTcsImV4cCI6MjA4NTMwMjExN30.dN4MHhwjEM26coS9eZAW_eIQJplF8j9YHT9WyFypK3I';

// 建立並匯出 Supabase 客戶端
export const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);