# Multi-platform Python 3.11 slim base image for Render web service
FROM python:3.11-slim

# Prevent Python from writing .pyc files and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

# Install Python dependencies first for Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application package
COPY app/ ./app

# Expose default HTTP port
EXPOSE 8000

# Run uvicorn server binding to 0.0.0.0 and dynamic PORT env variable (assigned by Render)
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
