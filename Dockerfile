# Stage 1: Build frontend with Node.js
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY package*.json ./
RUN npm ci
COPY vite.config.js ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY index.html ./
COPY src ./src
RUN npm run build

# Stage 2: Python runtime with backend and built frontend
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1 \
    PORT=5000 \
    PYTHONDONTWRITEBYTECODE=1
WORKDIR /app

# NOTE: libgl1-mesa-glx is deprecated; use libgl1. Add --no-install-recommends to keep image smaller.
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    poppler-utils \
    ffmpeg \
    libzbar0 \
    libgl1 \
    libglib2.0-0 \
    libreoffice \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend.py ./
COPY utils ./utils
COPY --from=frontend-builder /app/frontend/dist ./dist

EXPOSE ${PORT}

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT:-5000}/health')" || exit 1

CMD exec gunicorn --bind 0.0.0.0:${PORT} --workers 4 --timeout 120 --access-logfile - --error-logfile - backend:app
