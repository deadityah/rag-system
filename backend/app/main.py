from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routers import chat, documents, health

settings = get_settings()

app = FastAPI(
    title="DocuMind API",
    description="RAG backend API for document upload, vector search, and streaming chat answers.",
    version="1.0.0",
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Session-Id", "Authorization"],
)

# Register routers
app.include_router(health.router)
app.include_router(documents.router)
app.include_router(chat.router)


@app.get("/")
async def root():
    return {"message": "DocuMind API is running. Check /api/health for status."}
