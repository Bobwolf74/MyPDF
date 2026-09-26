# PDF Studio

A beautiful, privacy-first PDF toolkit inspired by iLovePDF & SmallPDF, with an Apple-like design.

## Features

| Tool | Description |
|------|-------------|
| **Merge PDF** | Combine multiple PDFs into one |
| **Split PDF** | Extract ranges, every page, or fixed chunks |
| **Compress PDF** | Reduce file size with object streams |
| **Rotate PDF** | Rotate all or selected pages |
| **Protect PDF** | Add user/owner password |
| **Unlock PDF** | Remove password protection |
| **Organize PDF** | Preview, reorder & delete pages |
| **Extract Pages** | Save specific pages as new PDF |
| **PDF → JPG** | High-quality page images |
| **JPG → PDF** | Images to a single PDF |
| **Page Numbers** | Customizable page numbering |
| **Watermark** | Text watermark with opacity & rotation |

All processing happens **100% in the browser**. Files never leave your device.

## Run locally

```bash
cd pdf-tool
python3 -m http.server 8080
```

Open http://localhost:8080

Or simply open `index.html` in a modern browser (some features need a local server due to module/CORS policies of PDF.js).

## Tech

- **pdf-lib** — PDF creation & manipulation
- **PDF.js** — Rendering pages for previews & image export
- Pure HTML / CSS / JS — no build step
- Apple-inspired UI (system fonts, blur, soft shadows, rounded cards)

## Browser support

Chrome, Firefox, Safari, Edge (recent versions).
