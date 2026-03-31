import { createClient } from "@supabase/supabase-js";
import { config } from "../config.js";

// --------------------------------
// --- Supabase Client ---
// --------------------------------

export const supabase = createClient(
  config.supabaseUrl,
  config.supabaseServiceKey
);
