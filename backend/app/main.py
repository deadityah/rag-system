from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routers import chat, documents, health

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Log allowed origins once at application startup for Render logs
    logger.info(f"CORS allowed origins: {settings.cors_origins}")
    yield


app = FastAPI(
    title="DocuMind API",
    description="RAG backend API for document upload, vector search, and streaming chat answers.",
    version="1.0.0",
    lifespan=lifespan,
)

# Custom exception handler to provide both 'detail' and 'message' keys
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    detail = exc.detail
    message = detail if isinstance(detail, str) else str(detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": detail, "message": message},
        headers=exc.headers,
    )

# CORS Middleware configuration
# Never combine wildcard "*" with allow_credentials=True
allow_credentials = "*" not in settings.cors_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=allow_credentials,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Session-Id"],
)

# Register routers
app.include_router(health.router)
app.include_router(documents.router)
app.include_router(chat.router)


@app.get("/")
async def root():
    return {"message": "DocuMind API is running. Check /api/health for status."}
