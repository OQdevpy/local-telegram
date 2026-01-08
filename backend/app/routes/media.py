from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse
from app.telegram_client import telegram_manager
import os
import aiofiles
import uuid

router = APIRouter(tags=["media"])

UPLOAD_DIR = "uploads"
DOWNLOAD_DIR = "downloads"

# Ensure directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(DOWNLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload_and_send(
    chat_id: int,
    session_id: str = Query(...),
    file: UploadFile = File(...),
    caption: str = Query(None),
    reply_to: int = Query(None)
):
    """Upload and send a file to a chat"""
    try:
        client = telegram_manager.get_client(session_id)
        if not client:
            raise HTTPException(status_code=401, detail="Session not found")

        # Save file temporarily
        file_ext = os.path.splitext(file.filename)[1] if file.filename else ""
        temp_filename = f"{uuid.uuid4()}{file_ext}"
        temp_path = os.path.join(UPLOAD_DIR, temp_filename)

        async with aiofiles.open(temp_path, 'wb') as f:
            content = await file.read()
            await f.write(content)

        try:
            # Send file
            message = await telegram_manager.send_file(
                session_id,
                chat_id,
                temp_path,
                caption=caption,
                reply_to=reply_to
            )
            return message
        finally:
            # Cleanup temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download/{chat_id}/{message_id}")
async def download_media(
    chat_id: int,
    message_id: int,
    session_id: str = Query(...)
):
    """Download media from a message"""
    try:
        client = telegram_manager.get_client(session_id)
        if not client:
            raise HTTPException(status_code=401, detail="Session not found")

        file_path = await telegram_manager.download_media(
            session_id,
            chat_id,
            message_id,
            DOWNLOAD_DIR
        )

        if not file_path:
            raise HTTPException(status_code=404, detail="Media not found")

        return FileResponse(
            file_path,
            filename=os.path.basename(file_path)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/preview/{chat_id}/{message_id}")
async def get_media_preview(
    chat_id: int,
    message_id: int,
    session_id: str = Query(...),
    full: bool = Query(False, description="Download full quality")
):
    """Get media preview as base64"""
    try:
        client = telegram_manager.get_client(session_id)
        if not client:
            raise HTTPException(status_code=401, detail="Session not found")

        tg_client = client
        message = await tg_client.get_messages(chat_id, ids=message_id)

        if not message or not message.media:
            raise HTTPException(status_code=404, detail="Media not found")

        import base64
        from telethon.tl.types import MessageMediaPhoto

        # For photos, download the actual image (not thumbnail)
        if isinstance(message.media, MessageMediaPhoto):
            # Download the photo itself (medium quality by default)
            photo_bytes = await tg_client.download_media(message, bytes)
            if photo_bytes:
                return {
                    "preview": base64.b64encode(photo_bytes).decode(),
                    "type": "image/jpeg"
                }
        else:
            # For other media types, download thumbnail
            thumb = await tg_client.download_media(message, bytes, thumb=0)  # 0 for larger thumb
            if thumb:
                return {
                    "preview": base64.b64encode(thumb).decode(),
                    "type": "image/jpeg"
                }

        raise HTTPException(status_code=404, detail="Preview not available")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
