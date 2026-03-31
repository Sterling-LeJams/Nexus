import { supabase } from "./client.js";

// --------------------------------
// --- Autodesk Token Storage ---
// --------------------------------

type StoredToken = {
  id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope: string | null;
};

export const upsertToken = async (
  accessToken: string,
  refreshToken: string,
  expiresInSeconds: number,
  scope: string
): Promise<void> => {
  const expiresAt = new Date(
    Date.now() + expiresInSeconds * 1000
  ).toISOString();

  // Try to get existing row
  const { data: existing } = await supabase
    .from("autodesk_tokens")
    .select("id")
    .limit(1)
    .single();

  if (existing) {
    // Update existing
    const { error } = await supabase
      .from("autodesk_tokens")
      .update({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        scope,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) throw new Error(`Failed to update token: ${error.message}`);
  } else {
    // Insert new
    const { error } = await supabase.from("autodesk_tokens").insert({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      scope,
    });

    if (error) throw new Error(`Failed to insert token: ${error.message}`);
  }
};

export const getStoredToken = async (): Promise<StoredToken | null> => {
  const { data, error } = await supabase
    .from("autodesk_tokens")
    .select("*")
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as StoredToken;
};

export const isTokenExpired = (expiresAt: string): boolean => {
  // Consider expired if less than 60 seconds remaining
  return new Date(expiresAt).getTime() - Date.now() < 60_000;
};
