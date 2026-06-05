// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

// VITE_SUPABASE_URL が無い場合（ビルド時など）は空文字を入れてエラーを防ぐ
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dummy.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'dummy_key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)