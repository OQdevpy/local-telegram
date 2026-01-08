from fastapi import FastAPI, WebSocket, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.telegram_client import telegram_manager
from app.websocket import websocket_endpoint
from app.routes import auth, chats, messages, media


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting Telegram Clone Backend...")
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("downloads", exist_ok=True)
    yield
    # Shutdown
    print("Shutting down...")
    await telegram_manager.disconnect_all()


app = FastAPI(
    title="Telegram Clone API",
    description="Full-featured Telegram web client using Telethon",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth")
app.include_router(chats.router, prefix="/api/chats")
app.include_router(messages.router, prefix="/api/messages")
app.include_router(media.router, prefix="/api/media")


# WebSocket endpoint
@app.websocket("/ws")
async def websocket_route(
    websocket: WebSocket,
    session_id: str = Query(...)
):
    """WebSocket endpoint for real-time updates"""
    await websocket_endpoint(websocket, session_id)


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "telegram-clone-backend"}


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Telegram Clone API",
        "docs": "/docs",
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
