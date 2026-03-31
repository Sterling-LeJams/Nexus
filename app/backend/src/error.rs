use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde_json::json;

// --------------------------------
// --- App Error ---
// --------------------------------

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Autodesk API error: {0}")]
    AutodeskApi(String),

    #[error("Authentication error: {0}")]
    Auth(String),

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("HTTP client error: {0}")]
    HttpClient(#[from] reqwest::Error),

    #[error("Configuration error: {0}")]
    Config(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::AutodeskApi(msg) => (StatusCode::BAD_GATEWAY, msg.clone()),
            AppError::Auth(msg) => (StatusCode::UNAUTHORIZED, msg.clone()),
            AppError::Database(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
            AppError::HttpClient(e) => (StatusCode::BAD_GATEWAY, e.to_string()),
            AppError::Config(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg.clone()),
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg.clone()),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            AppError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg.clone()),
        };

        tracing::error!(%status, %message, "request error");

        let body = axum::Json(json!({
            "error": message,
        }));

        (status, body).into_response()
    }
}
