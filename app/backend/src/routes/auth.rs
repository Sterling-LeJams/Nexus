use axum::extract::{Query, State};
use axum::response::Redirect;
use axum::Json;
use chrono::Utc;
use serde::Deserialize;

use crate::autodesk::oauth;
use crate::autodesk::types::TokenResponse;
use crate::error::AppError;
use crate::AppState;

// --------------------------------
// --- OAuth Routes ---
// --------------------------------

/// GET /api/acc/login
/// Redirects the user's browser to the Autodesk OAuth consent page.
pub async fn login(State(state): State<AppState>) -> Redirect {
    let url = oauth::get_three_legged_auth_url(&state.config);
    Redirect::temporary(&url)
}

/// Query params returned by Autodesk after user consents.
#[derive(Debug, Deserialize)]
pub struct CallbackParams {
    pub code: String,
}

/// GET /api/acc/callback
/// Autodesk redirects here after the user grants consent.
/// Exchanges the auth code for tokens and stores them in the database.
pub async fn callback(
    State(state): State<AppState>,
    Query(params): Query<CallbackParams>,
) -> Result<Redirect, AppError> {
    let tokens = oauth::exchange_code_for_token(
        &state.autodesk_client,
        &state.config,
        &params.code,
    )
    .await?;

    let expires_at = Utc::now() + chrono::Duration::seconds(tokens.expires_in);

    // Upsert token into database (one row per user for now — single-tenant MVP)
    sqlx::query(
        r#"
        INSERT INTO autodesk_tokens (id, access_token, refresh_token, expires_at, scope)
        VALUES (gen_random_uuid(), $1, $2, $3, $4)
        ON CONFLICT ((true))  -- single-row table for MVP
        DO UPDATE SET
            access_token = EXCLUDED.access_token,
            refresh_token = EXCLUDED.refresh_token,
            expires_at = EXCLUDED.expires_at,
            updated_at = now()
        "#,
    )
    .bind(&tokens.access_token)
    .bind(&tokens.refresh_token)
    .bind(expires_at)
    .bind("data:read account:read")
    .execute(&state.db)
    .await?;

    // Redirect back to the frontend
    Ok(Redirect::temporary(&state.config.frontend_url))
}

/// GET /api/acc/token
/// Returns the current Autodesk access token. Refreshes automatically if expired.
pub async fn token(
    State(state): State<AppState>,
) -> Result<Json<TokenResponse>, AppError> {
    // Fetch the stored token
    let row = sqlx::query_as::<_, StoredToken>(
        "SELECT access_token, refresh_token, expires_at FROM autodesk_tokens LIMIT 1",
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| {
        AppError::Auth("Not connected to Autodesk. Please log in first.".to_string())
    })?;

    // If token is still valid, return it
    if row.expires_at > Utc::now() + chrono::Duration::seconds(60) {
        return Ok(Json(TokenResponse {
            access_token: row.access_token,
            expires_in: (row.expires_at - Utc::now()).num_seconds(),
        }));
    }

    // Token expired — refresh it
    let refreshed = oauth::refresh_access_token(
        &state.autodesk_client,
        &state.config,
        &row.refresh_token,
    )
    .await?;

    let new_expires_at = Utc::now() + chrono::Duration::seconds(refreshed.expires_in);

    sqlx::query(
        r#"
        UPDATE autodesk_tokens
        SET access_token = $1,
            refresh_token = $2,
            expires_at = $3,
            updated_at = now()
        "#,
    )
    .bind(&refreshed.access_token)
    .bind(&refreshed.refresh_token)
    .bind(new_expires_at)
    .execute(&state.db)
    .await?;

    Ok(Json(TokenResponse {
        access_token: refreshed.access_token,
        expires_in: refreshed.expires_in,
    }))
}

// --------------------------------
// --- DB Row Types ---
// --------------------------------

#[derive(sqlx::FromRow)]
struct StoredToken {
    access_token: String,
    refresh_token: String,
    expires_at: chrono::DateTime<Utc>,
}
