#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // Some Fedora KDE/Wayland GPU drivers fail to create WebKit DMA-BUF
  // buffers, resulting in a blank window. Disable that renderer for Linux;
  // WebKit will use its compatible fallback renderer instead.
  #[cfg(target_os = "linux")]
  std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");

  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
