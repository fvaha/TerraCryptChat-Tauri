fn main() {
  // Explicitly link against libsoup-2.4 to fix linking issues
  println!("cargo:rustc-link-lib=soup-2.4");
  
  tauri_build::build()
}
