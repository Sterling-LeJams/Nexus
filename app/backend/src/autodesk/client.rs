use reqwest::Client;

use crate::error::AppError;

// --------------------------------
// --- Autodesk API Client ---
// --------------------------------

const BASE_URL: &str = "https://developer.api.autodesk.com";

#[derive(Debug, Clone)]
pub struct AutodeskClient {
    http: Client,
}

impl AutodeskClient {
    pub fn new(http: Client) -> Self {
        Self { http }
    }

    /// Authenticated GET request to the Autodesk API.
    pub async fn get<T: serde::de::DeserializeOwned>(
        &self,
        endpoint: &str,
        access_token: &str,
    ) -> Result<T, AppError> {
        let url = format!("{BASE_URL}{endpoint}");
        let resp = self
            .http
            .get(&url)
            .bearer_auth(access_token)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(AppError::AutodeskApi(format!(
                "{status} — {body}"
            )));
        }

        resp.json::<T>().await.map_err(|e| {
            AppError::AutodeskApi(format!("Failed to parse response: {e}"))
        })
    }

    /// Authenticated POST request to the Autodesk API (JSON body).
    pub async fn post<T: serde::de::DeserializeOwned>(
        &self,
        endpoint: &str,
        access_token: &str,
        body: &impl serde::Serialize,
    ) -> Result<T, AppError> {
        let url = format!("{BASE_URL}{endpoint}");
        let resp = self
            .http
            .post(&url)
            .bearer_auth(access_token)
            .json(body)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(AppError::AutodeskApi(format!(
                "{status} — {body}"
            )));
        }

        resp.json::<T>().await.map_err(|e| {
            AppError::AutodeskApi(format!("Failed to parse response: {e}"))
        })
    }

    /// POST with form-encoded body (used for OAuth token endpoints).
    pub async fn post_form<T: serde::de::DeserializeOwned>(
        &self,
        endpoint: &str,
        form: &[(&str, &str)],
    ) -> Result<T, AppError> {
        let url = format!("{BASE_URL}{endpoint}");
        let resp = self.http.post(&url).form(form).send().await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(AppError::AutodeskApi(format!(
                "OAuth error {status} — {body}"
            )));
        }

        resp.json::<T>().await.map_err(|e| {
            AppError::AutodeskApi(format!("Failed to parse token response: {e}"))
        })
    }

    /// Authenticated PUT with raw bytes (used for OSS upload).
    pub async fn put_bytes(
        &self,
        endpoint: &str,
        access_token: &str,
        bytes: Vec<u8>,
        content_type: &str,
    ) -> Result<serde_json::Value, AppError> {
        let url = format!("{BASE_URL}{endpoint}");
        let resp = self
            .http
            .put(&url)
            .bearer_auth(access_token)
            .header("Content-Type", content_type)
            .body(bytes)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(AppError::AutodeskApi(format!(
                "Upload error {status} — {body}"
            )));
        }

        resp.json().await.map_err(|e| {
            AppError::AutodeskApi(format!("Failed to parse upload response: {e}"))
        })
    }
}
