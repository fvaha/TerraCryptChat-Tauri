use std::fs;
use std::path::Path;

fn main() {
    println!("cargo:rerun-if-changed=../src");
    println!("cargo:rerun-if-changed=../public");
    println!("cargo:rerun-if-changed=tauri.conf.json");
    println!("cargo:rustc-env=TARGET_OS={}", std::env::var("TARGET_OS").unwrap_or_else(|_| "unknown".to_string()));
    println!("cargo:rustc-env=TARGET_ARCH={}", std::env::var("TARGET_ARCH").unwrap_or_else(|_| "unknown".to_string()));
    
    // Create a proper SQLite database file during build for bundling
    create_database_for_bundling();
    
    tauri_build::build()
}

fn create_database_for_bundling() {
    let db_path = Path::new("chat.db");
    
    // If database already exists, don't recreate it
    if db_path.exists() {
        println!("cargo:warning=Database file already exists, skipping creation");
        return;
    }
    
    println!("cargo:warning=Creating database file for bundling...");
    
    // Create an empty file - SQLite will initialize it properly when first accessed
    if let Err(e) = fs::File::create(db_path) {
        eprintln!("cargo:warning=Failed to create database file: {}", e);
        return;
    }
    
    println!("cargo:warning=Database file created successfully for bundling");
}
