fn is_allowed_external_url(url: &str) -> bool {
  url.starts_with("https://github.com/")
    || url.starts_with("https://www.github.com/")
    || url == "https://gestionflow.net"
    || url.starts_with("https://gestionflow.net/")
    || url == "https://www.gestionflow.net"
    || url.starts_with("https://www.gestionflow.net/")
}

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
  if !is_allowed_external_url(&url) {
    return Err("url host is not allowed".into());
  }

  #[cfg(target_os = "windows")]
  {
    std::process::Command::new("cmd")
      .args(["/C", "start", "", &url])
      .spawn()
      .map_err(|e| e.to_string())?;
    return Ok(());
  }

  #[cfg(target_os = "macos")]
  {
    std::process::Command::new("open")
      .arg(&url)
      .spawn()
      .map_err(|e| e.to_string())?;
    return Ok(());
  }

  #[cfg(target_os = "linux")]
  {
    std::process::Command::new("xdg-open")
      .arg(&url)
      .spawn()
      .map_err(|e| e.to_string())?;
    return Ok(());
  }

  #[allow(unreachable_code)]
  Err("unsupported platform".into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // Some Fedora KDE/Wayland GPU drivers fail to create WebKit DMA-BUF
  // buffers, resulting in a blank window. Disable that renderer for Linux;
  // WebKit will use its compatible fallback renderer instead.
  #[cfg(target_os = "linux")]
  std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");

  tauri::Builder::default()
    .plugin(tauri_plugin_http::init())
    .plugin(
      tauri_plugin_log::Builder::default()
        .level(log::LevelFilter::Info)
        .build(),
    )
    .invoke_handler(tauri::generate_handler![open_external_url])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
