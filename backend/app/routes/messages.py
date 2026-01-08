from fastapi import APIRouter, HTTPException, Query
from app.telegram_client import telegram_manager
from app.models.schemas import (
    MessagesResponse,
    SendMessageRequest,
    EditMessageRequest,
    DeleteMessageRequest,
    Message
)
from typing import List

router = APIRouter(tags=["messages"])


@router.get("/{chat_id}", response_model=MessagesResponse)
async def get_messages(
    chat_id: int,
    session_id: str = Query(..., description="Session ID"),
    limit: int = Query(50, ge=1, le=200, description="Number of messages"),
    offset_id: int = Query(0, ge=0, description="Offset message ID for pagination")
):
    """Get messages from a chat"""
    try:
        client = telegram_manager.get_client(session_id)
        if not client:
            raise HTTPException(status_code=401, detail="Session not found")

        messages = await telegram_manager.get_messages(
            session_id,
            chat_id,
            limit=limit,
            offset_id=offset_id
        )
        return MessagesResponse(messages=messages, chat_id=chat_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send")
async def send_message(request: SendMessageRequest, session_id: str = Query(...)):
    """Send a text message"""
    try:
        client = telegram_manager.get_client(session_id)
        if not client:
            raise HTTPException(status_code=401, detail="Session not found")

        message = await telegram_manager.send_message(
            session_id,
            request.chat_id,
            request.text,
            reply_to=request.reply_to
        )
        return message
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/edit")
async def edit_message(request: EditMessageRequest, session_id: str = Query(...)):
    """Edit a message"""
    try:
        client = telegram_manager.get_client(session_id)
        if not client:
            raise HTTPException(status_code=401, detail="Session not found")

        message = await telegram_manager.edit_message(
            session_id,
            request.chat_id,
            request.message_id,
            request.text
        )
        return message
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/delete")
async def delete_messages(request: DeleteMessageRequest, session_id: str = Query(...)):
    """Delete messages"""
    try:
        client = telegram_manager.get_client(session_id)
        if not client:
            raise HTTPException(status_code=401, detail="Session not found")

        await telegram_manager.delete_messages(
            session_id,
            request.chat_id,
            request.message_ids
        )
        return {"success": True, "deleted_ids": request.message_ids}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/forward")
async def forward_messages(
    from_chat: int,
    to_chat: int,
    message_ids: List[int],
    session_id: str = Query(...)
):
    """Forward messages to another chat"""
    try:
        client = telegram_manager.get_client(session_id)
        if not client:
            raise HTTPException(status_code=401, detail="Session not found")

        messages = await telegram_manager.forward_message(
            session_id,
            from_chat,
            to_chat,
            message_ids
        )
        return {"success": True, "messages": messages}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
