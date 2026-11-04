import { createClient } from "@supabase/supabase-js"

// Next.js only inlines NEXT_PUBLIC_* vars when referenced literally like this.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in frontend/.env.local",
  )
}

// The only place the Supabase client is created. Import { supabase } from here.
export const supabase = createClient(url, key)
