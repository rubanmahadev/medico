import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lbliwhaowqvukzsjiwqi.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxibGl3aGFvd3F2dWt6c2ppd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNDU0MjIsImV4cCI6MjA2NzcyMTQyMn0.CaWS0jak1RhwiXZD4TWVx5zX6h7sbLKFHY7g8MwwDY4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
