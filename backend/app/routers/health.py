from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health_check():
    """Health check endpoint used for monitoring, uptime, and Render cold-start wakeups."""
    return {"status": "ok"}
