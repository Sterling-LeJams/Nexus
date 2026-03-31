use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;

// --------------------------------
// --- Models CRUD ---
// --------------------------------

pub async fn insert_model(
    pool: &PgPool,
    file_name: &str,
    source: &str,
    urn: Option<&str>,
) -> Result<Uuid, AppError> {
    let row = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO models (file_name, source, urn, status)
        VALUES ($1, $2, $3, 'processing')
        RETURNING id
        "#,
    )
    .bind(file_name)
    .bind(source)
    .bind(urn)
    .fetch_one(pool)
    .await?;

    Ok(row)
}

pub async fn update_model_status(
    pool: &PgPool,
    model_id: Uuid,
    status: &str,
    error_message: Option<&str>,
) -> Result<(), AppError> {
    sqlx::query(
        r#"
        UPDATE models
        SET status = $1, error_message = $2, updated_at = now()
        WHERE id = $3
        "#,
    )
    .bind(status)
    .bind(error_message)
    .bind(model_id)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn update_model_storage_path(
    pool: &PgPool,
    model_id: Uuid,
    storage_path: &str,
) -> Result<(), AppError> {
    sqlx::query(
        r#"
        UPDATE models
        SET storage_path = $1, updated_at = now()
        WHERE id = $2
        "#,
    )
    .bind(storage_path)
    .bind(model_id)
    .execute(pool)
    .await?;

    Ok(())
}

// --------------------------------
// --- Metadata CRUD ---
// --------------------------------

pub async fn insert_metadata(
    pool: &PgPool,
    model_id: Uuid,
    guid: &str,
    view_name: &str,
    role: Option<&str>,
) -> Result<Uuid, AppError> {
    let row = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO model_metadata (model_id, guid, view_name, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        "#,
    )
    .bind(model_id)
    .bind(guid)
    .bind(view_name)
    .bind(role)
    .fetch_one(pool)
    .await?;

    Ok(row)
}

// --------------------------------
// --- Elements CRUD ---
// --------------------------------

pub async fn insert_elements_batch(
    pool: &PgPool,
    model_id: Uuid,
    metadata_id: Uuid,
    elements: &[(i32, Option<String>, String, Option<String>, Option<String>, Option<String>, Option<serde_json::Value>)],
) -> Result<(), AppError> {
    // (db_id, external_id, name, category, family, type, properties)
    for chunk in elements.chunks(100) {
        let mut query_builder = String::from(
            "INSERT INTO model_elements (model_id, metadata_id, db_id, external_id, name, category, family, type, properties) VALUES ",
        );

        let mut params: Vec<String> = Vec::new();
        for (i, _) in chunk.iter().enumerate() {
            let offset = i * 9;
            params.push(format!(
                "(${}, ${}, ${}, ${}, ${}, ${}, ${}, ${}, ${})",
                offset + 1,
                offset + 2,
                offset + 3,
                offset + 4,
                offset + 5,
                offset + 6,
                offset + 7,
                offset + 8,
                offset + 9,
            ));
        }
        query_builder.push_str(&params.join(", "));

        let mut query = sqlx::query(&query_builder);
        for (db_id, external_id, name, category, family, elem_type, properties) in chunk {
            query = query
                .bind(model_id)
                .bind(metadata_id)
                .bind(db_id)
                .bind(external_id)
                .bind(name)
                .bind(category)
                .bind(family)
                .bind(elem_type)
                .bind(properties);
        }

        query.execute(pool).await?;
    }

    Ok(())
}

// --------------------------------
// --- Object Tree CRUD ---
// --------------------------------

pub async fn insert_object_tree_batch(
    pool: &PgPool,
    model_id: Uuid,
    metadata_id: Uuid,
    nodes: &[(i32, String, Option<i32>, i32)],
) -> Result<(), AppError> {
    // (object_id, name, parent_object_id, depth)
    for chunk in nodes.chunks(100) {
        let mut query_builder = String::from(
            "INSERT INTO model_object_tree (model_id, metadata_id, object_id, name, parent_object_id, depth) VALUES ",
        );

        let mut params: Vec<String> = Vec::new();
        for (i, _) in chunk.iter().enumerate() {
            let offset = i * 6;
            params.push(format!(
                "(${}, ${}, ${}, ${}, ${}, ${})",
                offset + 1,
                offset + 2,
                offset + 3,
                offset + 4,
                offset + 5,
                offset + 6,
            ));
        }
        query_builder.push_str(&params.join(", "));

        let mut query = sqlx::query(&query_builder);
        for (object_id, name, parent_object_id, depth) in chunk {
            query = query
                .bind(model_id)
                .bind(metadata_id)
                .bind(object_id)
                .bind(name)
                .bind(parent_object_id)
                .bind(depth);
        }

        query.execute(pool).await?;
    }

    Ok(())
}

// --------------------------------
// --- Query Helpers ---
// --------------------------------

/// Check if a model with this URN already exists and is complete (cache hit).
pub async fn find_model_by_urn(
    pool: &PgPool,
    urn: &str,
) -> Result<Option<ModelRow>, AppError> {
    let row = sqlx::query_as::<_, ModelRow>(
        "SELECT id, storage_path, status FROM models WHERE urn = $1 AND status = 'complete' LIMIT 1",
    )
    .bind(urn)
    .fetch_optional(pool)
    .await?;

    Ok(row)
}

#[derive(sqlx::FromRow)]
pub struct ModelRow {
    pub id: Uuid,
    pub storage_path: Option<String>,
    pub status: String,
}
