use reqwest::Client;

use crate::config::Config;
use crate::error::AppError;

// --------------------------------
// --- Supabase Storage ---
// --------------------------------

const BUCKET: &str = "model-files";

/// Upload a file to Supabase Storage.
/// Returns the storage path (e.g. "models/{model_id}/model.glb").
pub async fn upload_file(
    http: &Client,
    config: &Config,
    path: &str,
    bytes: Vec<u8>,
    content_type: &str,
) -> Result<String, AppError> {
    let url = format!(
        "{}/storage/v1/object/{}/{}",
        config.supabase_url, BUCKET, path
    );

    let resp = http
        .post(&url)
        .header("Authorization", format!("Bearer {}", config.supabase_service_key))
        .header("Content-Type", content_type)
        .header("x-upsert", "true")
        .body(bytes)
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(AppError::Internal(format!(
            "Supabase Storage upload failed: {status} — {body}"
        )));
    }

    Ok(format!("{BUCKET}/{path}"))
}

/// Get a signed URL for downloading a file from Supabase Storage.
pub async fn get_signed_url(
    http: &Client,
    config: &Config,
    path: &str,
    expires_in_seconds: u64,
) -> Result<String, AppError> {
    let url = format!(
        "{}/storage/v1/object/sign/{}/{}",
        config.supabase_url, BUCKET, path
    );

    let resp = http
        .post(&url)
        .header("Authorization", format!("Bearer {}", config.supabase_service_key))
        .json(&serde_json::json!({
            "expiresIn": expires_in_seconds,
        }))
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(AppError::Internal(format!(
            "Supabase Storage signed URL failed: {status} — {body}"
        )));
    }

    #[derive(serde::Deserialize)]
    struct SignedUrlResponse {
        #[serde(rename = "signedURL")]
        signed_url: String,
    }

    let signed: SignedUrlResponse = resp.json().await.map_err(|e| {
        AppError::Internal(format!("Failed to parse signed URL response: {e}"))
    })?;

    Ok(format!("{}{}", config.supabase_url, signed.signed_url))
}
