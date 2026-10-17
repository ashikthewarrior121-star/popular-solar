# PDF Letterhead Studio — processing diagnostics v8

This version improves the generic PDF processing error by returning the actual backend failure message and validates header/footer files before processing.

- Accepts genuine PNG or JPG bytes even if a JPG file was accidentally named `.png`.
- Detects missing/empty placeholder images and explains which file needs replacing.
- Keeps the page-copy approach for preserving every source PDF page.
- Keeps proportional header/footer sizing and the elapsed-seconds indicator.

## Required files
Replace the empty placeholder images with your actual cropped images:
- `public/header.png`
- `public/footer.png`

JPG files are also accepted by content detection, but keep these filenames unless you also update the paths in `server/index.js`.

## Run
Stop old servers with Ctrl+C, extract to a new folder, open it in VS Code and run:

```powershell
npm.cmd install
npm.cmd run dev
```

Then refresh `http://localhost:5173` with Ctrl+F5. If processing fails, the app will now show the actual error rather than only a generic message.
