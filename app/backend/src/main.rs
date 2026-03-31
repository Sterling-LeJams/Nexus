mod autodesk;
mod config;
mod error;
mod routes;
mod supabase;

use axum::routing::get;
use axum::Router;
use reqwest::Client;
use sqlx::PgPool;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

use crate::autodesk::client::AutodeskClient;
use crate::config::Config;

// --------------------------------
// --- App State ---
// --------------------------------

#[derive(Clone)]
pub struct AppState {
    pub config: Config,
    pub db: PgPool,
    pub http: Client,
    pub autodesk_client: AutodeskClient,
}

// --------------------------------
// --- Main ---
// --------------------------------

#[tokio::main]
async fn main() {
    // Load .env file
    dotenvy::dotenv().ok();

    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "backend=debug,tower_http=debug".into()),
        )
        .init();

    // Load config
    let config = Config::from_env().expect("Failed to load configuration from environment");
    let port = config.port;

    // Create database pool
    let db = supabase::client::create_pool(&config)
        .await
        .expect("Failed to connect to database");

    tracing::info!("Connected to database");

    // Create HTTP client (shared across Autodesk + Supabase calls)
    let http = Client::new();
    let autodesk_client = AutodeskClient::new(http.clone());

    // Build shared state
    let state = AppState {
        config,
        db,
        http,
        autodesk_client,
    };

    // Build router
    let app = Router::new()
        // Health
        .route("/api/health", get(routes::health::health))
        // ACC Auth
        .route("/api/acc/login", get(routes::auth::login))
        .route("/api/acc/callback", get(routes::auth::callback))
        .route("/api/acc/token", get(routes::auth::token))
        // Middleware
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    // Start server
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}"))
        .await
        .expect("Failed to bind to port");

    tracing::info!("Backend listening on http://localhost:{port}");

    axum::serve(listener, app)
        .await
        .expect("Server failed");
}
