import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("[supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configurado")
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
  },
})
