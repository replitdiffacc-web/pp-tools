# Universal File Converter

## Overview

Universal File Converter is a comprehensive, all-in-one file conversion application with a modern React frontend and Flask backend. The application supports conversion between 200+ file formats across 11 different categories, with an optimized, user-friendly interface featuring loading animations, progress bars, and copy-to-clipboard functionality.

## User Preferences

- Preferred communication style: Simple, everyday language
- Quality and bitrate options removed per user preference
- Clean, modern UI with minimal clutter

## Recent Changes

### Docker Deployment (October 11, 2025)
- **Multi-stage Dockerfile**: Production-ready containerization with Node.js build stage and Python runtime
- **System dependencies**: Includes Tesseract OCR, Poppler, FFmpeg, LibreOffice for all conversion features
- **Static file serving**: Flask configured to serve built frontend and handle SPA routing
- **Health endpoints**: Added `/health` and `/ready` endpoints for container orchestration
- **Production optimizations**: 
  - CORS disabled by default (same-origin serving)
  - Proper cache headers (index.html no-cache, assets cached)
  - Gunicorn production server with 4 workers
  - Stateless design using temp directories
- **Documentation**: Complete Docker guide in DOCKER.md with deployment examples

### Previous Changes (October 8, 2025)

### Major Restructuring
- **Removed duplicate files/folders**: Deleted `frontend/`, `app.py`, and duplicate README
- **Removed old converter components**: Deleted individual converter files (ImageConverter, PDFConverter, etc.)
- **Created unified converter system**: Single UniversalConverter component handles all format conversions
- **Removed quality/bitrate controls**: Per user request, simplified interface by removing these options

### New Components
1. **UniversalConverter.jsx** - Main converter supporting 11 categories and 200+ formats
2. **OptimizeTools.jsx** - PDF/PNG/JPG compression and OCR text extraction
3. **MergeTools.jsx** - PDF merging functionality
4. **CaptureTools.jsx** - Website screenshot and PDF capture
5. **QRTools.jsx** - QR code generation and barcode/QR decoding
6. **FileUpload.jsx** - Reusable file upload with drag-drop and paste support
7. **CustomDropdown.jsx** - Custom dropdown component replacing native selects

### Latest UI/UX Improvements (Added Today)
- **Drag and Drop**: All file uploads now support drag and drop functionality
- **Paste to Upload**: Images can be pasted directly (Ctrl/Cmd + V) into file upload areas
- **Visual Drop Indicator**: ChatGPT-style overlay appears when dragging files over upload zones
- **Custom Dropdowns**: Replaced all native `<select>` elements with custom styled dropdowns
- **QR Code Tools Restored**: Re-added QR code generation and decoding features
- **Enhanced File Preview**: File uploads show file type icons, names, and sizes
- **Multiple File Display**: Better visualization for multiple file uploads with remove buttons

### Previous UI/UX Improvements
- Added animated loading states with spinning indicators
- Implemented progress bars with percentage display
- Added copy-to-clipboard buttons with success feedback
- Simplified tab navigation (5 main tabs: Convert, Optimize & OCR, Merge PDFs, Capture Website, QR Code Tools)
- Enhanced visual design with better gradients and shadows
- Responsive layout optimized for all screen sizes

## System Architecture

### Frontend Architecture
- **Framework**: React 19 with Vite build tool
- **Styling**: Tailwind CSS with custom animations
  - Custom loading animations (spin, pulse, loading dots)
  - Progress bar components with gradient fills
  - Copy button with success state feedback
- **UI Components**: Headless UI for accessible tabs, Heroicons for icons
- **HTTP Client**: Axios for API communication
- **Dev Server**: Port 5000 with proxy to backend on port 8000

### Backend Architecture
- **Framework**: Flask with CORS enabled
- **Port**: 8000 (changed from 5001 for Replit compatibility)
- **File Handling**: 
  - System temp directory for all operations
  - UUID-based unique filenames
  - Secure filename validation via Werkzeug
- **API Structure**: RESTful endpoints by conversion type

### Supported Format Categories

1. **Archive** (38 formats): 7z, ace, alz, arc, arj, bz, bz2, cab, cpio, deb, dmg, gz, img, iso, jar, lha, lz, lzma, lzo, rar, rpm, rz, tar, tar.7z, tar.bz, tar.bz2, tar.gz, tar.lzo, tar.xz, tar.z, tbz, tbz2, tgz, tz, tzo, xz, z, zip

2. **Audio** (18 formats): aac, ac3, aif, aifc, aiff, amr, au, caf, dss, flac, m4a, m4b, mp3, oga, voc, wav, weba, wma

3. **CAD** (2 formats): dwg, dxf

4. **Document** (21 formats): abw, djvu, doc, docm, docx, dot, dotx, html, hwp, lwp, md, odt, pages, pdf, rst, rtf, tex, txt, wpd, wps, zabw

5. **Ebook** (20 formats): azw, azw3, azw4, cbc, cbr, cbz, chm, epub, fb2, htm, htmlz, lit, lrf, mobi, pdb, pml, prc, rb, snb, tcr, txtz

6. **Font** (5 formats): eot, otf, ttf, woff, woff2

7. **Image** (44 formats): 3fr, arw, avif, bmp, cr2, cr3, crw, dcr, dng, eps, erf, gif, heic, heif, icns, ico, jfif, jpeg, jpg, mos, mrw, nef, odd, odg, orf, pef, png, ppm, ps, psd, pub, raf, raw, rw2, tif, tiff, webp, x3f, xcf, xps

8. **Presentation** (10 formats): dps, key, odp, pot, potx, pps, ppsx, ppt, pptm, pptx

9. **Spreadsheet** (7 formats): csv, et, numbers, ods, xls, xlsm, xlsx

10. **Vector** (10 formats): ai, cdr, cgm, emf, sk, sk1, svg, svgz, vsd, wmf

11. **Video** (28 formats): 3g2, 3gp, 3gpp, avi, cavs, dv, dvr, flv, m2ts, m4v, mkv, mod, mov, mp4, mpeg, mpg, mts, mxf, ogg, rm, rmvb, swf, ts, vob, webm, wmv, wtv

### Tool Categories

1. **Optimize & OCR**
   - Compress PDF
   - Compress PNG
   - Compress JPG
   - PDF OCR (text extraction)
   - Image OCR (text extraction)

2. **Merge PDFs**
   - Combine multiple PDFs into one

3. **Capture Website**
   - Save website as PDF
   - PNG screenshot
   - JPG screenshot

4. **QR Code Tools**
   - Generate QR codes from text/URL
   - Decode QR codes and barcodes from images

## File Structure

```
/
├── src/
│   ├── components/
│   │   ├── UniversalConverter.jsx (main converter)
│   │   ├── OptimizeTools.jsx (compression & OCR)
│   │   ├── MergeTools.jsx (PDF merging)
│   │   ├── CaptureTools.jsx (website capture)
│   │   ├── QRTools.jsx (QR code generation & decoding)
│   │   ├── FileUpload.jsx (reusable drag-drop file upload)
│   │   └── CustomDropdown.jsx (custom dropdown component)
│   ├── App.jsx (main app with tabs)
│   ├── main.jsx (entry point)
│   └── index.css (styles with animations)
├── utils/ (Python backend utilities)
│   ├── image_utils.py
│   ├── pdf_utils.py
│   ├── office_utils.py
│   ├── av_utils.py
│   ├── ocr_utils.py
│   ├── barcode_utils.py
│   └── archive_utils.py
├── backend.py (Flask API server)
├── package.json (npm dependencies)
├── requirements.txt (Python dependencies)
├── vite.config.js (Vite configuration)
├── tailwind.config.js (Tailwind configuration)
├── Dockerfile (multi-stage production build)
├── docker-compose.yml (Docker Compose setup)
├── .dockerignore (build optimization)
└── DOCKER.md (deployment documentation)
```

## Dependencies

### Frontend
- React 19 ecosystem (react, react-dom)
- Vite build tool
- Tailwind CSS with PostCSS
- Headless UI and Heroicons
- Axios for HTTP requests

### Backend (Python)
- Flask and flask-cors
- Pillow (image processing)
- pypdf, pdf2image (PDF operations)
- pytesseract (OCR)
- qrcode, pyzbar (QR/barcode)
- pydub (audio)
- python-dotenv

### System Requirements
- FFmpeg (audio/video conversion)
- LibreOffice (document conversion)
- Tesseract OCR (text extraction)
- ZBar (barcode decoding)

## Workflow Configuration

### Development
- **Frontend**: `npm run dev` on port 5000 (webview)
- **Backend**: `python3 backend.py` on port 8000 (console)
- **Proxy**: Frontend proxies `/api` requests to backend

### Production (Docker)
- **Container**: Single container serving both frontend and backend
- **Build**: Multi-stage Docker build (Node.js → Python)
- **Server**: Gunicorn on configurable PORT (default: 5000)
- **Static**: Built frontend served from `/dist` directory
- **Health**: `/health` and `/ready` endpoints for monitoring
- **Deploy**: See DOCKER.md for complete deployment guide

## Features

### Loading States
- Animated spinners during conversion
- Progress bars with percentage display
- Visual feedback for all operations

### User Experience
- One-click file conversion
- Automatic download on completion
- Copy-to-clipboard for download links
- Category-based format organization
- Format preview with counts
- Responsive design for all devices
- **Drag and drop file upload** - Simply drag files into upload areas
- **Paste to upload** - Paste images directly with Ctrl/Cmd+V
- **Visual drop feedback** - ChatGPT-style overlay when dragging files
- **Custom styled dropdowns** - Accessible, keyboard-friendly dropdown menus
- **Enhanced file preview** - Shows file icons, names, and sizes

### File Operations
- Direct file conversion
- Batch processing (PDF merge, images to PDF)
- OCR text extraction
- Website capture/screenshot
- Archive extraction
- QR code generation and decoding

## Development Notes

- Port 8000 used for backend (Replit-compatible)
- Vite dev server allows all hosts for iframe proxy
- No quality/bitrate options (removed per user preference)
- Streamlined 5-tab interface (Convert, Optimize & OCR, Merge PDFs, Capture Website, QR Code Tools)
- All conversions use temp directory for security
- Drag-drop and paste functionality built into reusable FileUpload component
- Custom dropdowns using Headless UI Listbox for better accessibility
