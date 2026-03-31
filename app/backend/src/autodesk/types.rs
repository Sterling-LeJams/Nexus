use serde::{Deserialize, Serialize};

// --------------------------------
// --- OAuth Token Responses ---
// --------------------------------

#[derive(Debug, Deserialize)]
pub struct TwoLeggedTokenResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: i64,
}

#[derive(Debug, Deserialize)]
pub struct ThreeLeggedTokenResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
    pub expires_in: i64,
}

// --------------------------------
// --- Model Derivative ---
// --------------------------------

#[derive(Debug, Deserialize)]
pub struct ManifestResponse {
    #[serde(rename = "type")]
    pub kind: Option<String>,
    #[serde(rename = "hasThumbnail")]
    pub has_thumbnail: Option<String>,
    pub status: String,
    pub progress: Option<String>,
    pub region: Option<String>,
    pub urn: Option<String>,
    pub version: Option<String>,
    pub derivatives: Option<Vec<Derivative>>,
}

#[derive(Debug, Deserialize)]
pub struct Derivative {
    pub name: Option<String>,
    #[serde(rename = "hasThumbnail")]
    pub has_thumbnail: Option<String>,
    pub status: String,
    pub progress: Option<String>,
    #[serde(rename = "outputType")]
    pub output_type: Option<String>,
    pub children: Option<Vec<DerivativeChild>>,
}

#[derive(Debug, Deserialize)]
pub struct DerivativeChild {
    pub guid: Option<String>,
    #[serde(rename = "type")]
    pub kind: Option<String>,
    pub role: Option<String>,
    pub name: Option<String>,
    pub status: Option<String>,
    pub progress: Option<String>,
    pub children: Option<Vec<DerivativeChild>>,
}

// --------------------------------
// --- Metadata ---
// --------------------------------

#[derive(Debug, Deserialize)]
pub struct MetadataResponse {
    pub data: MetadataData,
}

#[derive(Debug, Deserialize)]
pub struct MetadataData {
    #[serde(rename = "type")]
    pub kind: Option<String>,
    pub metadata: Vec<MetadataItem>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct MetadataItem {
    pub name: String,
    pub guid: String,
    pub role: Option<String>,
}

// --------------------------------
// --- Properties ---
// --------------------------------

#[derive(Debug, Deserialize)]
pub struct PropertiesResponse {
    pub data: PropertiesData,
}

#[derive(Debug, Deserialize)]
pub struct PropertiesData {
    #[serde(rename = "type")]
    pub kind: Option<String>,
    pub collection: Vec<PropertyCollection>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct PropertyCollection {
    pub objectid: i64,
    pub name: String,
    #[serde(rename = "externalId")]
    pub external_id: Option<String>,
    pub properties: serde_json::Value,
}

// --------------------------------
// --- Object Tree ---
// --------------------------------

#[derive(Debug, Deserialize)]
pub struct ObjectTreeResponse {
    pub data: ObjectTreeData,
}

#[derive(Debug, Deserialize)]
pub struct ObjectTreeData {
    #[serde(rename = "type")]
    pub kind: Option<String>,
    pub objects: Vec<TreeObject>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct TreeObject {
    pub objectid: i64,
    pub name: String,
    pub objects: Option<Vec<TreeObject>>,
}

// --------------------------------
// --- Data Management (ACC) ---
// --------------------------------

#[derive(Debug, Deserialize, Serialize)]
pub struct HubsResponse {
    pub data: Vec<Hub>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Hub {
    pub id: String,
    pub attributes: HubAttributes,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct HubAttributes {
    pub name: String,
    pub region: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ProjectsResponse {
    pub data: Vec<Project>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Project {
    pub id: String,
    pub attributes: ProjectAttributes,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ProjectAttributes {
    pub name: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct FolderContentsResponse {
    pub data: Vec<FolderItem>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct FolderItem {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub attributes: FolderItemAttributes,
    pub relationships: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct FolderItemAttributes {
    #[serde(rename = "displayName")]
    pub display_name: Option<String>,
    pub name: Option<String>,
    #[serde(rename = "fileType")]
    pub file_type: Option<String>,
}

// --------------------------------
// --- Translation Job ---
// --------------------------------

#[derive(Debug, Serialize)]
pub struct TranslationJobRequest {
    pub input: TranslationInput,
    pub output: TranslationOutput,
}

#[derive(Debug, Serialize)]
pub struct TranslationInput {
    pub urn: String,
    #[serde(rename = "compressedUrn", skip_serializing_if = "Option::is_none")]
    pub compressed_urn: Option<bool>,
    #[serde(rename = "rootFilename", skip_serializing_if = "Option::is_none")]
    pub root_filename: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TranslationOutput {
    pub formats: Vec<TranslationFormat>,
}

#[derive(Debug, Serialize)]
pub struct TranslationFormat {
    #[serde(rename = "type")]
    pub kind: String,
    pub views: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct TranslationJobResponse {
    pub result: Option<String>,
    pub urn: Option<String>,
}

// --------------------------------
// --- API Responses (our backend → frontend) ---
// --------------------------------

#[derive(Debug, Serialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub expires_in: i64,
}

#[derive(Debug, Serialize)]
pub struct TranslationStatusResponse {
    pub status: String,
    pub progress: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
}
