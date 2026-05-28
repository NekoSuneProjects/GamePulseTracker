# Icons

This folder ships with **auto-generated placeholder icons** so Overwolf accepts
the manifest out of the box:

- `icon-256.png` — 256x256 neon-green "GP" mark on a dark gradient
- `icon-256-gray.png` — grayscale variant (Overwolf uses this when the app is paused)
- `icon-256.ico` — PNG-in-ICO 256x256 (taskbar)

These are intentionally generic. Replace them with branded art when you have it.
Keep the **same filenames** so [`../manifest.json`](../manifest.json) doesn't need to change.

Re-generate the placeholders (Windows PowerShell, from the repo root):

```powershell
# Adapt to your needs. Original generator drew a "GP" mark on a dark→neon
# gradient using System.Drawing.Bitmap, then wrapped the PNG inside an ICO
# directory entry per the Vista PNG-in-ICO format.
```

For a production app you'll usually want the .ico to contain multiple sizes
(16, 32, 48, 64, 128, 256). Tools like ImageMagick, `convert`, or
https://convertio.co/png-ico/ handle that easily.
