import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nnayaapqhvusaqvbsniv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uYXlhYXBxaHZ1c2FxdmJzbml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NTI3MzMsImV4cCI6MjA4NzIyODczM30.3rJFl73rWaJYZ6Uwke7KY6PCBeKlzgx4-mZhm3oF8UE'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
