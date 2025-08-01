use reqwest;
use serde_json;
use tauri::State;
use std::collections::HashMap;
use std::sync::Mutex;

// ======== AUTH STRUCTURES ========
#[derive(serde::Serialize)]
struct LoginRequest {
    username: String,
    password: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct LoginResponse {
    pub access_token: String,
}

#[derive(serde::Deserialize)]
struct BackendLoginResponse {
    access_token: String,
}

#[derive(serde::Serialize)]
struct RegisterRequest {
    name: String,
    email: String,
    password: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct UserData {
    pub user_id: String,
    pub username: String,
    pub name: String,
    pub email: String,
    pub picture: Option<String>,
    pub verified: bool,
    pub role: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(serde::Serialize)]
pub struct UpdateDarkModeRequest {
    pub user_id: String,
    pub is_dark_mode: bool,
}

#[derive(serde::Serialize)]
pub struct UpdateColorSchemeRequest {
    pub user_id: String,
    pub color_scheme: String,
}

// ======== AUTH COMMANDS ========
#[tauri::command]
pub async fn login(username: String, password: String) -> Result<LoginResponse, String> {
    println!("Logging in user: {}", username);
    
    let client = reqwest::Client::new();
    let login_request = LoginRequest {
        username: username.clone(),
        password,
    };
    
    // Debug: Print the request being sent
    println!("Request URL: https://dev.v1.terracrypt.cc/api/v1/auth/signin");
    println!("Request body: {}", serde_json::to_string(&login_request).unwrap_or_else(|_| "Failed to serialize".to_string()));
    
    let res = client
        .post("https://dev.v1.terracrypt.cc/api/v1/auth/signin")
        .header("Content-Type", "application/json")
        .json(&login_request)
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Login response status: {}", status);
    println!("Login response body: {}", text);

    if status.is_success() {
        let backend_response: BackendLoginResponse = serde_json::from_str(&text)
            .map_err(|e| format!("Invalid JSON response: {e}"))?;
        
        let response = LoginResponse {
            access_token: backend_response.access_token,
        };
        
        println!("Successfully logged in user: {}", username);
        Ok(response)
    } else {
        println!("Failed to login with status: {}", status);
        Err(format!("Failed to login: {} - {}", status, text))
    }
}

#[tauri::command]
pub async fn register(name: String, email: String, password: String) -> Result<LoginResponse, String> {
    println!("Registering user: {}", email);
    
    let client = reqwest::Client::new();
    let register_request = RegisterRequest {
        name: name.clone(),
        email: email.clone(),
        password,
    };
    
    let res = client
        .post("https://dev.v1.terracrypt.cc/api/v1/auth/signup")
        .header("Content-Type", "application/json")
        .json(&register_request)
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Register response status: {}", status);
    println!("Register response body: {}", text);

    if status.is_success() {
        let backend_response: BackendLoginResponse = serde_json::from_str(&text)
            .map_err(|e| format!("Invalid JSON response: {e}"))?;
        
        let response = LoginResponse {
            access_token: backend_response.access_token,
        };
        
        println!("Successfully registered user: {}", name);
        Ok(response)
    } else {
        println!("Failed to register with status: {}", status);
        Err(format!("Failed to register: {} - {}", status, text))
    }
}

// ======== TOKEN MANAGEMENT ========
type TokenStore = Mutex<HashMap<String, String>>;

#[tauri::command]
pub async fn save_token(
    state: State<'_, TokenStore>,
    key: String,
    value: String,
) -> Result<(), String> {
    let mut store = state.lock().unwrap();
    store.insert(key, value);
    Ok(())
}

#[tauri::command]
pub async fn load_token(
    state: State<'_, TokenStore>,
    key: String,
) -> Result<Option<String>, String> {
    let store = state.lock().unwrap();
    Ok(store.get(&key).cloned())
}

#[tauri::command]
pub async fn remove_token(
    state: State<'_, TokenStore>,
    key: String,
) -> Result<(), String> {
    let mut store = state.lock().unwrap();
    store.remove(&key);
    Ok(())
}



#[tauri::command]
pub async fn get_current_user(state: State<'_, TokenStore>) -> Result<UserData, String> {
    let token = {
        let store = state.lock().unwrap();
        store.get("access_token")
            .ok_or("No access token found")?
            .clone()
    };
    
    get_current_user_with_token(token).await
}

#[tauri::command]
pub async fn get_current_user_with_token(token: String) -> Result<UserData, String> {
    println!("Getting current user with token");
    
    let client = reqwest::Client::new();
    let res = client
        .get("https://dev.v1.terracrypt.cc/api/v1/users/me")
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Get current user response status: {}", status);
    println!("Get current user response body: {}", text);

    if status.is_success() {
        #[derive(serde::Deserialize)]
        struct BackendUserResponse {
            user_id: String,
            username: String,
            name: String,
            email: String,
            picture: Option<String>,
            verified: bool,
            role: Option<String>,
            created_at: Option<String>,
            updated_at: Option<String>,
        }
        
        let backend_response: BackendUserResponse = serde_json::from_str(&text)
            .map_err(|e| format!("Invalid JSON response: {e}"))?;
        
        let user_data = UserData {
            user_id: backend_response.user_id,
            username: backend_response.username,
            name: backend_response.name,
            email: backend_response.email,
            picture: backend_response.picture,
            verified: backend_response.verified,
            role: backend_response.role,
            created_at: backend_response.created_at,
            updated_at: backend_response.updated_at,
        };
        
        println!("Successfully retrieved current user: {}", user_data.username);
        Ok(user_data)
    } else {
        println!("Failed to get current user with status: {}", status);
        Err(format!("Failed to get current user: {} - {}", status, text))
    }
}

#[tauri::command]
pub async fn search_users(token: String, query: String) -> Result<Vec<UserData>, String> {
    println!("Searching users with query: '{}'", query);
    println!("Using token: {}", if token.len() > 10 { format!("{}...", &token[..10]) } else { token.clone() });
    
    let client = reqwest::Client::new();
    let url = format!("https://dev.v1.terracrypt.cc/api/v1/users/search?username={}", query);
    println!("Making request to: {}", url);
    
    let res = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "<no body>".into());
    
    println!("Search users response status: {}", status);
    println!("Search users response body: {}", text);

    if status.is_success() {
        // Try different response formats
        let users: Vec<UserData> = if text.trim().starts_with('[') {
            // Direct array format
            serde_json::from_str(&text)
                .map_err(|e| format!("Invalid JSON array response: {e}"))?
        } else {
            // Try with data wrapper
            #[derive(serde::Deserialize)]
            struct SearchResponse {
                data: Vec<UserData>,
            }
            
            let search_response: SearchResponse = serde_json::from_str(&text)
                .map_err(|e| format!("Invalid JSON response: {e}"))?;
            search_response.data
        };
        
        println!("Successfully found {} users", users.len());
        Ok(users)
    } else {
        println!("Failed to search users with status: {}", status);
        Err(format!("Failed to search users: {} - {}", status, text))
    }
} 