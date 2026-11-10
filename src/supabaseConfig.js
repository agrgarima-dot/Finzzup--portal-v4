// src/supabaseConfig.js — the project's public Supabase coordinates.
//
// Neither of these is a secret. The anon key is compiled into the browser
// bundle and is visible to anyone who opens the portal; what protects the data
// is row level security on the tables, not the secrecy of this string.
//
// They live here rather than only inside src/supabase.js so the serverless
// functions can fall back to them when the matching environment variables are
// not set. Before this existed, a missing SUPABASE_ANON_KEY made the keepalive
// ping quietly report "supabase_not_configured" and do nothing — which let the
// free tier pause the project, taking the whole portal down with it.
//
// An environment variable always wins, so rotating the key is still a matter of
// setting it in Vercel without touching this file.

export const SUPABASE_URL      = "https://nnayaapqhvusaqvbsniv.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uYXlhYXBxaHZ1c2FxdmJzbml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NTI3MzMsImV4cCI6MjA4NzIyODczM30.3rJFl73rWaJYZ6Uwke7KY6PCBeKlzgx4-mZhm3oF8UE";
