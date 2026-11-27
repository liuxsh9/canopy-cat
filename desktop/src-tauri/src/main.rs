#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Emitter;

#[cfg(windows)]
mod display {
    use std::io;
    use tauri::{AppHandle, Emitter, Manager};
    use windows_sys::Win32::{
        Foundation::{HWND, LPARAM, LRESULT, WPARAM},
        UI::{
            Shell::{DefSubclassProc, RemoveWindowSubclass, SetWindowSubclass},
            WindowsAndMessaging::{
                SPI_SETWORKAREA, WM_DISPLAYCHANGE, WM_NCDESTROY, WM_SETTINGCHANGE,
            },
        },
    };

    const SUBCLASS_ID: usize = 1;

    pub fn watch(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
        let window = app.get_webview_window("pet").expect("pet window exists");
        let hwnd = window.hwnd()?.0;
        let data = Box::into_raw(Box::new(app.clone()));

        // Setup runs on the window thread. The subclass owns data until WM_NCDESTROY.
        if unsafe { SetWindowSubclass(hwnd, Some(window_proc), SUBCLASS_ID, data as usize) } == 0 {
            unsafe { drop(Box::from_raw(data)) };
            return Err(io::Error::last_os_error().into());
        }
        Ok(())
    }

    unsafe extern "system" fn window_proc(
        hwnd: HWND,
        message: u32,
        wparam: WPARAM,
        lparam: LPARAM,
        id: usize,
        data: usize,
    ) -> LRESULT {
        let display_changed = message == WM_DISPLAYCHANGE
            || (message == WM_SETTINGCHANGE && wparam == SPI_SETWORKAREA as usize);
        if display_changed {
            let app = unsafe { (&*(data as *const AppHandle)).clone() };
            let _ = app.emit("desktop:display-change", ());
        } else if message == WM_NCDESTROY {
            unsafe {
                RemoveWindowSubclass(hwnd, Some(window_proc), id);
                drop(Box::from_raw(data as *mut AppHandle));
            }
        }
        unsafe { DefSubclassProc(hwnd, message, wparam, lparam) }
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            let _ = app.emit("desktop:show", ());
        }))
        .setup(|app| {
            #[cfg(windows)]
            display::watch(app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("could not run CanopyCat");
}
