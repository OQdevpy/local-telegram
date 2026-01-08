from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


# Auth schemas
class SendCodeRequest(BaseModel):
    phone: str


class SendCodeResponse(BaseModel):
    phone_code_hash: str
    session_id: str


class SignInRequest(BaseModel):
    session_id: str
    phone: str
    code: str
    phone_code_hash: str
    password: Optional[str] = None


class SignInResponse(BaseModel):
    success: bool
    session_string: Optional[str] = None
    needs_2fa: bool = False
    user: Optional[dict] = None


class RestoreSessionRequest(BaseModel):
    session_string: str


# Chat schemas
class Dialog(BaseModel):
    id: int
    name: str
    type: str  # user, group, channel
    avatar: Optional[str] = None
    last_message: Optional[str] = None
    last_message_date: Optional[datetime] = None
    unread_count: int = 0
    is_pinned: bool = False
    is_muted: bool = False


class DialogsResponse(BaseModel):
    dialogs: List[Dialog]


# Message schemas
class Message(BaseModel):
    id: int
    chat_id: int
    sender_id: Optional[int] = None
    sender_name: Optional[str] = None
    text: Optional[str] = None
    date: datetime
    is_outgoing: bool = False
    reply_to_msg_id: Optional[int] = None
    media_type: Optional[str] = None  # photo, video, document, voice, sticker
    media_url: Optional[str] = None
    is_edited: bool = False
    views: Optional[int] = None
    forwards: Optional[int] = None


class MessagesResponse(BaseModel):
    messages: List[Message]
    chat_id: int


class SendMessageRequest(BaseModel):
    chat_id: int
    text: str
    reply_to: Optional[int] = None


class EditMessageRequest(BaseModel):
    chat_id: int
    message_id: int
    text: str


class DeleteMessageRequest(BaseModel):
    chat_id: int
    message_ids: List[int]


# User schemas
class User(BaseModel):
    id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    phone: Optional[str] = None
    is_bot: bool = False
    is_online: bool = False
    last_seen: Optional[datetime] = None


# WebSocket event schemas
class WSMessage(BaseModel):
    event: str
    data: Any


class TypingEvent(BaseModel):
    chat_id: int
    user_id: int
    action: str = "typing"  # typing, recording_voice, uploading_photo, etc.
