from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.telegram_client import telegram_manager
from app.models.schemas import DialogsResponse
from typing import Optional, List
import asyncio

router = APIRouter(tags=["chats"])


class AvatarsRequest(BaseModel):
    entity_ids: List[int]


@router.get("/dialogs", response_model=DialogsResponse)
async def get_dialogs(
    session_id: str = Query(..., description="Session ID"),
    limit: int = Query(300, ge=1, le=500, description="Number of dialogs to fetch")
):
    """Get list of all dialogs/chats"""
    try:
        client = await telegram_manager.get_client_or_restore(session_id)
        if not client:
            raise HTTPException(status_code=401, detail="Session not found")

        dialogs = await telegram_manager.get_dialogs(session_id, limit)
        return DialogsResponse(dialogs=dialogs)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/contacts")
async def get_contacts(
    session_id: str = Query(..., description="Session ID")
):
    """Get all contacts from Telegram"""
    try:
        client = await telegram_manager.get_client_or_restore(session_id)
        if not client:
            raise HTTPException(status_code=401, detail="Session not found")

        contacts = await telegram_manager.get_contacts(session_id)
        return {"contacts": contacts}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dialog/{chat_id}")
async def get_dialog(
    chat_id: int,
    session_id: str = Query(..., description="Session ID")
):
    """Get single dialog info"""
    try:
        client = await telegram_manager.get_client_or_restore(session_id)
        if not client:
            raise HTTPException(status_code=401, detail="Session not found")

        dialog = await telegram_manager.get_dialog_by_id(session_id, chat_id)
        return dialog
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/avatar/{entity_id}")
async def get_avatar(
    entity_id: int,
    session_id: str = Query(..., description="Session ID")
):
    """Get profile photo as base64"""
    try:
        client = await telegram_manager.get_client_or_restore(session_id)
        if not client:
            raise HTTPException(status_code=401, detail="Session not found")

        photo = await telegram_manager.get_profile_photo(session_id, entity_id)
        return {"avatar": photo}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/avatars")
async def get_avatars(
    request: AvatarsRequest,
    session_id: str = Query(..., description="Session ID")
):
    """Get multiple profile photos as base64"""
    try:
        client = await telegram_manager.get_client_or_restore(session_id)
        if not client:
            raise HTTPException(status_code=401, detail="Session not found")

        avatars = await telegram_manager.get_profile_photos_batch(session_id, request.entity_ids)
        return {"avatars": avatars}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mark-read/{chat_id}")
async def mark_as_read(
    chat_id: int,
    session_id: str = Query(..., description="Session ID")
):
    """Mark all messages in chat as read"""
    try:
        client = await telegram_manager.get_client_or_restore(session_id)
        if not client:
            raise HTTPException(status_code=401, detail="Session not found")

        await telegram_manager.mark_as_read(session_id, chat_id)
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/typing/{chat_id}")
async def send_typing(
    chat_id: int,
    session_id: str = Query(..., description="Session ID")
):
    """Send typing indicator"""
    try:
        client = await telegram_manager.get_client_or_restore(session_id)
        if not client:
            raise HTTPException(status_code=401, detail="Session not found")

        await telegram_manager.send_typing(session_id, chat_id)
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
