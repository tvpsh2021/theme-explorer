# Theme Explorer

A frontend-only viewer for Windows `.theme` files. The repository contains no theme collection or default third-party assets; users explicitly select a local folder for each browser session.

The desktop includes original, project-owned icons, a simulated computer window, a standalone Themes program, and a Language program. The language follows the browser by default and can be overridden per browser. Neutral desktop icons are replaced by user-provided icon assets when the active `.theme` defines them.

## Getting started

```sh
npm install
npm run dev
```

Open the URL printed by Vite. Themes can be loaded from the ignored `local-themes/` development directory or selected from the browser. Files are processed locally and are not uploaded to an external service.

### Local development folder

Create `local-themes/` at the project root and place one or more `.theme` files together with their referenced assets inside it:

```text
local-themes/
├── example.theme
├── example-wallpaper.jpg
├── example-arrow.cur
└── example-alert.wav
```

Run `npm run dev`, then choose **Load local-themes**. The development server exposes this ignored directory only to loopback clients. Its contents are not copied into the production build.

### Browser folder upload

Choose **Choose folder…**, then select a folder containing the `.theme` files and assets. Browser-selected files exist only for the current session.

## Theme importing

The importer parses the standard INI sections used by `.theme` files:

- Desktop wallpaper and its layout (center, tile, stretch, fit, fill)
- Desktop icons
- Static and animated cursors
- System and Explorer event sounds
- Theme color depth metadata

Paths using `%ThemeDir%`, `%WinDir%`, `%SystemRoot%`, relative paths, and drive-qualified paths are resolved only against files in the folder selected by the user. The app never reads arbitrary operating system paths. Missing or unsupported references are reported in the theme details.

Theme files are decoded as UTF-16 when they have a BOM, otherwise as UTF-8, falling back to Windows-1252. Legacy East Asian code pages such as Big5 are not detected.

Microsoft ADPCM WAV files are converted to browser-playable PCM in memory. ANI cursors are decoded client-side. Generated object URLs are revoked when another folder is imported or the app closes.

## Asset policy

The default desktop and drive icons in `public/icons/` are original assets generated for this project. Do not commit third-party theme files or their images, icons, cursors, sounds, screen savers, fonts, or other referenced assets. Keep any local test collections outside this repository.
