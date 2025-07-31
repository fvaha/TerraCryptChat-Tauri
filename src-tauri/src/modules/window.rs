use tauri::{AppHandle, Manager};

#[tauri::command]
pub async fn window_show_main_window(app_handle: AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn window_hide_main_window(app_handle: AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn window_close_main_window(app_handle: AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn resize_window(app_handle: AppHandle, width: f64, height: f64) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        // Ensure minimum size and convert to u32
        let min_width = 400.0;
        let min_height = 300.0;
        let final_width = width.max(min_width) as u32;
        let final_height = height.max(min_height) as u32;
        
        window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(final_width as f64, final_height as f64)))
            .map_err(|e| e.to_string())?;
        
        // Center the window after resize
        window.center().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn center_window(app_handle: AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        window.center().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn minimize_window(app_handle: AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        window.minimize().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn maximize_window(app_handle: AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        window.maximize().map_err(|e| e.to_string())?;
    }
    Ok(())
} 