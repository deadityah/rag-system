from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import health

settings = get_settings()

app = FastAPI(
    title="DocuMind API",
    description="RAG backend API for document upload, vector search, and streaming chat answers.",
    version="1.0.0",
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Session-Id", "Authorization"],
)

# Register routers
app.include_router(health.router)


@app.get("/")
async def root():
    return {"message": "DocuMind API is running. Check /api/health for status."}
