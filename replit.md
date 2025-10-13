# Universal Tool Suite
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

5. **YouTube Downloader**
   - Download YouTube videos as MP3 (audio only)
   - Download YouTube videos as MP4 (video)
   - URL validation for YouTube links
   - Progress tracking with visual feedback

6. **Citation Generator**
   - Generate citations in APA, MLA, Chicago, and Harvard styles
   - Support for multiple source types (website, book, journal, etc.)
   - Auto-fetch metadata from URLs
   - Save citations to user account (requires login)
   - Edit and update saved citations
   - Export multiple citations to .txt file
   - Copy citations to clipboard

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
- yt-dlp (YouTube downloading)
- beautifulsoup4 and requests (URL metadata fetching)

### System Requirements
- FFmpeg (audio/video conversion, YouTube downloads)
- LibreOffice (document conversion)
- Tesseract OCR (text extraction)
- ZBar (barcode decoding)