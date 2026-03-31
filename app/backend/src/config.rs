use std::env;

// --------------------------------
// --- App Configuration ---
// --------------------------------

#[derive(Debug, Clone)]
pub struct Config {
    pub aps_client_id: String,
    pub aps_client_secret: String,
    pub aps_callback_url: String,
    pub aps_bucket: String,
    pub supabase_url: String,
    pub supabase_service_key: String,
    pub database_url: String,
    pub port: u16,
    pub frontend_url: String,
}

impl Config {
    pub fn from_env() -> Result<Self, env::VarError> {
        let aps_client_id = env::var("APS_CLIENT_ID")?;

        // Default bucket: {client_id_lowercase}-nexus
        let default_bucket = format!("{}-nexus", aps_client_id.to_lowercase());

        Ok(Self {
            aps_client_id,
            aps_client_secret: env::var("APS_CLIENT_SECRET")?,
            aps_callback_url: env::var("APS_CALLBACK_URL")
                .unwrap_or_else(|_| "http://localhost:3001/api/acc/callback".to_string()),
            aps_bucket: env::var("APS_BUCKET").unwrap_or(default_bucket),
            supabase_url: env::var("SUPABASE_URL")?,
            supabase_service_key: env::var("SUPABASE_SERVICE_KEY")?,
            database_url: env::var("DATABASE_URL")?,
            port: env::var("PORT")
                .unwrap_or_else(|_| "3001".to_string())
                .parse()
                .expect("PORT must be a valid u16"),
            frontend_url: env::var("FRONTEND_URL")
                .unwrap_or_else(|_| "http://localhost:5173".to_string()),
        })
    }
}
