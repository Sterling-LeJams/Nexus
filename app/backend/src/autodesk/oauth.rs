use crate::autodesk::client::AutodeskClient;
use crate::autodesk::types::{ThreeLeggedTokenResponse, TwoLeggedTokenResponse};
use crate::config::Config;
use crate::error::AppError;

// --------------------------------
// --- 2-Legged OAuth (Server-to-Server) ---
// --------------------------------

/// Get an app-level access token using client credentials.
/// Used for: OSS upload, Model Derivative translation (device upload flow).
pub async fn get_two_legged_token(
    client: &AutodeskClient,
    config: &Config,
) -> Result<TwoLeggedTokenResponse, AppError> {
    client
        .post_form(
            "/authentication/v2/token",
            &[
                ("client_id", config.aps_client_id.as_str()),
                ("client_secret", config.aps_client_secret.as_str()),
                ("grant_type", "client_credentials"),
                (
                    "scope",
                    "data:read data:write data:create bucket:read bucket:create",
                ),
            ],
        )
        .await
}

// --------------------------------
// --- 3-Legged OAuth (User Auth for ACC) ---
// --------------------------------

/// Build the Autodesk OAuth consent URL that the user's browser should redirect to.
pub fn get_three_legged_auth_url(config: &Config) -> String {
    let scopes = "data:read account:read";
    format!(
        "https://developer.api.autodesk.com/authentication/v2/authorize\
         ?response_type=code\
         &client_id={}\
         &redirect_uri={}\
         &scope={}",
        config.aps_client_id,
        urlencoding(config.aps_callback_url.as_str()),
        urlencoding(scopes),
    )
}

/// Exchange an authorization code for access + refresh tokens.
pub async fn exchange_code_for_token(
    client: &AutodeskClient,
    config: &Config,
    code: &str,
) -> Result<ThreeLeggedTokenResponse, AppError> {
    client
        .post_form(
            "/authentication/v2/token",
            &[
                ("client_id", config.aps_client_id.as_str()),
                ("client_secret", config.aps_client_secret.as_str()),
                ("grant_type", "authorization_code"),
                ("code", code),
                ("redirect_uri", config.aps_callback_url.as_str()),
            ],
        )
        .await
}

/// Refresh an expired access token using a refresh token.
pub async fn refresh_access_token(
    client: &AutodeskClient,
    config: &Config,
    refresh_token: &str,
) -> Result<ThreeLeggedTokenResponse, AppError> {
    client
        .post_form(
            "/authentication/v2/token",
            &[
                ("client_id", config.aps_client_id.as_str()),
                ("client_secret", config.aps_client_secret.as_str()),
                ("grant_type", "refresh_token"),
                ("refresh_token", refresh_token),
            ],
        )
        .await
}

// --------------------------------
// --- Helpers ---
// --------------------------------

/// Minimal percent-encoding for URL query parameters.
fn urlencoding(s: &str) -> String {
    s.replace(' ', "%20")
        .replace(':', "%3A")
        .replace('/', "%2F")
}
