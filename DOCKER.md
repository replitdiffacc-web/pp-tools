# Docker Deployment Guide

This application uses a multi-stage Docker build to create a production-ready container that serves both the React frontend and Flask backend from a single service.

## Architecture

The Dockerfile uses a two-stage build process:

1. **Stage 1: Frontend Builder** (Node.js 20 Alpine)
   - Installs npm dependencies
   - Builds the React application with Vite
   - Outputs static assets to `/dist`

2. **Stage 2: Runtime** (Python 3.11 Slim)
   - Installs system dependencies (Tesseract OCR, Poppler, FFmpeg, etc.)
   - Installs Python dependencies
   - Copies backend code and utilities
   - Copies built frontend from Stage 1
   - Runs production server with Gunicorn

## System Dependencies

The container includes the following native tools:
- **tesseract-ocr**: OCR text extraction
- **poppler-utils**: PDF to image conversion
- **ffmpeg**: Audio/video conversion
- **libzbar0**: QR code and barcode scanning
- **opencv dependencies**: Image processing

## Building the Image

```bash
# Build the image
docker build -t converter-app .

# Build with custom tag
docker build -t myregistry/converter-app:v1.0 .
```

## Running the Container

### Basic Run

```bash
docker run -p 5000:5000 converter-app
```

### With Environment Variables

```bash
docker run -p 5000:5000 \
  -e PORT=5000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/dbname" \
  -e SECRET_KEY="your-secret-key-here" \
  converter-app
```

### With Docker Compose

Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - PORT=5000
      - DATABASE_URL=postgresql://postgres:password@db:5432/converter
      - SECRET_KEY=change-this-in-production
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=converter
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

Then run:

```bash
docker-compose up -d
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Port to bind the server | `5000` | No |
| `DATABASE_URL` | PostgreSQL connection string | None | Yes |
| `SECRET_KEY` | Flask session secret key | `dev-secret-key-change-in-production` | Yes (production) |
| `ENABLE_CORS` | Enable CORS (for development only) | `false` | No |

## Health Checks

The container exposes health and readiness endpoints:

- **Health endpoint**: `GET /health`
  - Returns `200 OK` if service is running
  - Response: `{"status": "healthy", "service": "converter-api"}`

- **Readiness endpoint**: `GET /ready`
  - Returns `200 OK` if database is connected
  - Returns `503 Service Unavailable` if database is unreachable
  - Response: `{"status": "ready", "database": "connected"}`

### Docker Health Check

Add to Dockerfile or docker-compose.yml:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1
```

## API Routes

All API endpoints are available under the `/api` prefix:

- `/api/auth/*` - Authentication endpoints
- `/api/image/*` - Image conversion and manipulation
- `/api/pdf/*` - PDF operations
- `/api/video/*` - Video conversion
- `/api/audio/*` - Audio conversion
- `/api/ocr/*` - OCR text extraction
- `/api/qr/*` - QR code generation and scanning
- `/api/archive/*` - ZIP/unzip operations
- `/api/history/*` - User download history

## Static Files & SPA Routing

The Flask server is configured to:
- Serve static assets from `/dist` directory
- Return `index.html` for any non-API routes (SPA fallback)
- Disable caching for HTML files (ensures users get latest version)

## Production Considerations

### Scaling

The container runs Gunicorn with 4 workers by default. To adjust:

```dockerfile
CMD exec gunicorn --bind 0.0.0.0:${PORT} --workers 8 --timeout 120 backend:app
```

### Security

1. **Always set a strong SECRET_KEY** in production
2. **Use SSL/TLS** - Deploy behind a reverse proxy (nginx, Traefik) with HTTPS
3. **Database security** - Use strong passwords and limit network access
4. **Environment variables** - Never commit secrets to version control
5. **CORS** - Disabled by default in production (same-origin serving). Only enable with `ENABLE_CORS=true` for development with separate frontend/backend servers

### Storage

The container is **stateless** and uses temporary directories for file processing:
- Uploaded files are stored in `/tmp` and cleaned up after processing
- For persistent storage, integrate with object storage (S3, MinIO, etc.)
- Download history is stored in the database, not local filesystem

### Resource Limits

Set appropriate resource limits in production:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## Deployment Platforms

This Docker image is compatible with:
- **AWS ECS/Fargate** - Use task definitions with health checks
- **Google Cloud Run** - Ensure PORT is set dynamically
- **Azure Container Instances** - Configure health probes
- **Kubernetes** - Use liveness and readiness probes
- **Railway, Render, Fly.io** - Works out of the box with auto-detected PORT

## Troubleshooting

### Build Issues

**Problem**: `npm ci` fails
- **Solution**: Ensure `package-lock.json` is committed to repo

**Problem**: Missing system dependencies
- **Solution**: Add required packages to `apt-get install` step

### Runtime Issues

**Problem**: Database connection fails
- **Solution**: Verify `DATABASE_URL` is correct and database is accessible

**Problem**: Static files not loading
- **Solution**: Ensure frontend build succeeded and `/dist` exists in image

**Problem**: Port binding fails
- **Solution**: Ensure `PORT` environment variable matches exposed port

### Logs

View container logs:

```bash
# Docker
docker logs <container-id>

# Docker Compose
docker-compose logs -f app
```

## Development vs Production

This Dockerfile is optimized for **production**. For local development:

1. Use the existing dev setup with separate frontend/backend servers
2. Mount volumes for hot-reloading
3. Or use a separate `Dockerfile.dev` with development settings

## License

See main project LICENSE file.
