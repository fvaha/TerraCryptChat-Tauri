fn main() {
    println!("cargo:rerun-if-changed=../src");
    println!("cargo:rerun-if-changed=../public");
    println!("cargo:rerun-if-changed=tauri.conf.json");
    
    // Platform-specific build information
    println!("cargo:rustc-env=TARGET_OS={}", std::env::var("CARGO_CFG_TARGET_OS").unwrap_or_default());
    println!("cargo:rustc-env=TARGET_ARCH={}", std::env::var("CARGO_CFG_TARGET_ARCH").unwrap_or_default());
    
    tauri_build::build()
}
