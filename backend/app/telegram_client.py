from telethon import TelegramClient, events
from telethon.sessions import StringSession
from telethon.errors import SessionPasswordNeededError, PhoneCodeInvalidError
from telethon.tl.types import (
    User, Chat, Channel,
    MessageMediaPhoto, MessageMediaDocument,
    DocumentAttributeFilename, DocumentAttributeAudio,
    DocumentAttributeVideo, DocumentAttributeSticker,
    UserStatusOnline, UserStatusOffline, UserStatusRecently
)
from telethon.tl.functions.messages import SetTypingRequest, GetDialogsRequest
from telethon.tl.functions.contacts import GetContactsRequest
from telethon.tl.functions.channels import GetFullChannelRequest
from telethon.tl.types import SendMessageTypingAction, InputPeerEmpty
from typing import Optional, Callable, Dict, List, Any
from datetime import datetime
import asyncio
import uuid
import base64
import os
import json

from app.config import get_settings

SESSIONS_FILE = "sessions.json"


class TelegramManager:
    def __init__(self):
        self.clients: Dict[str, TelegramClient] = {}
        self.sessions: Dict[str, str] = {}  # session_id -> phone
        self.session_strings: Dict[str, str] = {}  # session_id -> session_string
        self.ws_callbacks: Dict[str, Callable] = {}
        settings = get_settings()
        self.api_id = settings.telegram_api_id
        self.api_hash = settings.telegram_api_hash
        self._load_sessions()

    def _load_sessions(self):
        """Load saved sessions from file"""
        try:
            if os.path.exists(SESSIONS_FILE):
                with open(SESSIONS_FILE, 'r') as f:
                    self.session_strings = json.load(f)
                print(f"Loaded {len(self.session_strings)} saved sessions")
        except Exception as e:
            print(f"Error loading sessions: {e}")
            self.session_strings = {}

    def _save_sessions(self):
        """Save sessions to file"""
        try:
            with open(SESSIONS_FILE, 'w') as f:
                json.dump(self.session_strings, f)
        except Exception as e:
            print(f"Error saving sessions: {e}")

    async def _auto_restore_session(self, session_id: str) -> Optional[TelegramClient]:
        """Auto-restore a session from saved session_string"""
        if session_id not in self.session_strings:
            return None

        try:
            session_string = self.session_strings[session_id]
            session = StringSession(session_string)
            client = TelegramClient(session, self.api_id, self.api_hash)
            await client.connect()

            if await client.is_user_authorized():
                self.clients[session_id] = client
                print(f"Auto-restored session: {session_id}")
                return client
            else:
                # Session expired, remove it
                del self.session_strings[session_id]
                self._save_sessions()
                await client.disconnect()
        except Exception as e:
            print(f"Error auto-restoring session {session_id}: {e}")

        return None

    async def create_client(self, session_id: str = None, session_string: str = None) -> tuple[str, TelegramClient]:
        """Create a new Telegram client"""
        if session_id is None:
            session_id = str(uuid.uuid4())

        session = StringSession(session_string) if session_string else StringSession()
        client = TelegramClient(session, self.api_id, self.api_hash)
        await client.connect()
        self.clients[session_id] = client
        return session_id, client

    def get_client(self, session_id: str) -> Optional[TelegramClient]:
        """Get existing client by session ID"""
        return self.clients.get(session_id)

    async def get_client_or_restore(self, session_id: str) -> Optional[TelegramClient]:
        """Get existing client or auto-restore from saved session"""
        client = self.clients.get(session_id)
        if client:
            return client

        # Try to auto-restore
        return await self._auto_restore_session(session_id)

    async def send_code(self, session_id: str, phone: str) -> str:
        """Send verification code to phone number"""
        client = self.clients.get(session_id)
        if not client:
            raise ValueError("Client not found")

        self.sessions[session_id] = phone
        result = await client.send_code_request(phone)
        return result.phone_code_hash

    async def sign_in(
        self,
        session_id: str,
        phone: str,
        code: str,
        phone_code_hash: str,
        password: str = None
    ) -> tuple[bool, str, dict]:
        """Sign in with code and optional 2FA password"""
        client = self.clients.get(session_id)
        if not client:
            raise ValueError("Client not found")

        try:
            user = await client.sign_in(phone, code, phone_code_hash=phone_code_hash)
            session_string = client.session.save()
            # Save session to file
            self.session_strings[session_id] = session_string
            self._save_sessions()
            return True, session_string, self._format_user(user)
        except SessionPasswordNeededError:
            if password:
                user = await client.sign_in(password=password)
                session_string = client.session.save()
                # Save session to file
                self.session_strings[session_id] = session_string
                self._save_sessions()
                return True, session_string, self._format_user(user)
            return False, None, {"needs_2fa": True}
        except PhoneCodeInvalidError:
            raise ValueError("Invalid code")

    async def sign_in_2fa(self, session_id: str, password: str) -> tuple[str, dict]:
        """Complete 2FA sign in"""
        client = self.clients.get(session_id)
        if not client:
            raise ValueError("Client not found")

        user = await client.sign_in(password=password)
        session_string = client.session.save()
        # Save session to file
        self.session_strings[session_id] = session_string
        self._save_sessions()
        return session_string, self._format_user(user)

    async def restore_session(self, session_string: str) -> tuple[str, dict]:
        """Restore session from saved session string"""
        session_id, client = await self.create_client(session_string=session_string)

        if not await client.is_user_authorized():
            raise ValueError("Session expired or invalid")

        # Save session to file
        self.session_strings[session_id] = session_string
        self._save_sessions()

        me = await client.get_me()
        return session_id, self._format_user(me)

    async def logout(self, session_id: str):
        """Logout and cleanup"""
        client = self.clients.get(session_id)
        if client:
            await client.log_out()
            await client.disconnect()
            del self.clients[session_id]
            if session_id in self.sessions:
                del self.sessions[session_id]
            if session_id in self.ws_callbacks:
                del self.ws_callbacks[session_id]
            # Remove saved session
            if session_id in self.session_strings:
                del self.session_strings[session_id]
                self._save_sessions()

    async def disconnect_all(self):
        """Disconnect all clients on shutdown"""
        for session_id, client in list(self.clients.items()):
            try:
                await client.disconnect()
            except:
                pass
        self.clients.clear()
        self.sessions.clear()

    # Contacts methods
    async def get_contacts(self, session_id: str) -> List[dict]:
        """Get all contacts from Telegram"""
        client = self.clients.get(session_id)
        if not client:
            raise ValueError("Client not found")

        result = await client(GetContactsRequest(hash=0))
        contacts = []

        for user in result.users:
            if isinstance(user, User) and not user.bot and not user.deleted:
                status = self._get_user_status(user)
                contacts.append({
                    "id": user.id,
                    "name": f"{user.first_name or ''} {user.last_name or ''}".strip() or "Unknown",
                    "type": "user",
                    "username": user.username,
                    "phone": user.phone,
                    "status": status,
                    "last_message": None,
                    "last_message_date": None,
                    "unread_count": 0,
                    "is_pinned": False,
                    "is_muted": False,
                })

        return contacts

    def _get_user_status(self, user) -> str:
        """Get user online status"""
        if not user.status:
            return "last seen a long time ago"
        if isinstance(user.status, UserStatusOnline):
            return "online"
        elif isinstance(user.status, UserStatusRecently):
            return "last seen recently"
        elif isinstance(user.status, UserStatusOffline):
            was_online = user.status.was_online
            if was_online:
                return f"last seen {was_online.strftime('%d.%m.%Y %H:%M')}"
            return "offline"
        return "last seen a long time ago"

    # Dialog/Chat methods
    async def get_dialogs(self, session_id: str, limit: int = 100) -> List[dict]:
        """Get list of dialogs"""
        client = self.clients.get(session_id)
        if not client:
            raise ValueError("Client not found")

        dialogs = await client.get_dialogs(limit=limit)
        result = []

        for d in dialogs:
            dialog_data = await self._format_dialog(client, d)
            result.append(dialog_data)

        return result

    async def get_dialog_by_id(self, session_id: str, chat_id: int) -> dict:
        """Get single dialog by ID"""
        client = self.clients.get(session_id)
        if not client:
            raise ValueError("Client not found")

        entity = await client.get_entity(chat_id)
        return await self._format_entity_full(client, entity)

    # Message methods
    async def get_messages(
        self,
        session_id: str,
        chat_id: int,
        limit: int = 50,
        offset_id: int = 0
    ) -> List[dict]:
        """Get messages from a chat"""
        client = self.clients.get(session_id)
        if not client:
            raise ValueError("Client not found")

        messages = await client.get_messages(
            chat_id,
            limit=limit,
            offset_id=offset_id
        )
        return [await self._format_message(client, m) for m in messages]

    async def send_message(
        self,
        session_id: str,
        chat_id: int,
        text: str,
        reply_to: int = None
    ) -> dict:
        """Send a text message"""
        client = self.clients.get(session_id)
        if not client:
            raise ValueError("Client not found")

        msg = await client.send_message(
            chat_id,
            text,
            reply_to=reply_to
        )
        return await self._format_message(client, msg)

    async def edit_message(
        self,
        session_id: str,
        chat_id: int,
        message_id: int,
        text: str
    ) -> dict:
        """Edit a message"""
        client = self.clients.get(session_id)
        if not client:
            raise ValueError("Client not found")

        msg = await client.edit_message(chat_id, message_id, text)
        return await self._format_message(client, msg)

    async def delete_messages(
        self,
        session_id: str,
        chat_id: int,
        message_ids: List[int]
    ) -> bool:
        """Delete messages"""
        client = self.clients.get(session_id)
        if not client:
            raise ValueError("Client not found")

        await client.delete_messages(chat_id, message_ids)
        return True

    async def forward_message(
        self,
        session_id: str,
        from_chat: int,
        to_chat: int,
        message_ids: List[int]
    ) -> List[dict]:
        """Forward messages"""
        client = self.clients.get(session_id)
        if not client:
            raise ValueError("Client not found")

        messages = await client.forward_messages(to_chat, message_ids, from_chat)
        return [await self._format_message(client, m) for m in messages]

    async def mark_as_read(self, session_id: str, chat_id: int):
        """Mark all messages in chat as read"""
        client = self.clients.get(session_id)
        if not client:
            raise ValueError("Client not found")

        await client.send_read_acknowledge(chat_id)

    async def send_typing(self, session_id: str, chat_id: int):
        """Send typing indicator"""
        client = self.clients.get(session_id)
        if not client:
            raise ValueError("Client not found")

        await client(SetTypingRequest(chat_id, SendMessageTypingAction()))

    # Media methods
    async def send_file(
        self,
        session_id: str,
        chat_id: int,
        file_path: str,
        caption: str = None,
        reply_to: int = None
    ) -> dict:
        """Send a file/media"""
        client = self.clients.get(session_id)
        if not client:
            raise ValueError("Client not found")

        msg = await client.send_file(
            chat_id,
            file_path,
            caption=caption,
            reply_to=reply_to
        )
        return await self._format_message(client, msg)

    async def download_media(
        self,
        session_id: str,
        chat_id: int,
        message_id: int,
        download_path: str = None
    ) -> str:
        """Download media from a message"""
        client = self.clients.get(session_id)
        if not client:
            raise ValueError("Client not found")

        message = await client.get_messages(chat_id, ids=message_id)
        if message and message.media:
            path = await client.download_media(message, download_path or "downloads/")
            return path
        return None

    async def get_profile_photo(self, session_id: str, entity_id: int) -> Optional[str]:
        """Get profile photo as base64"""
        client = self.clients.get(session_id)
        if not client:
            return None

        try:
            photo = await client.download_profile_photo(entity_id, bytes)
            if photo:
                return base64.b64encode(photo).decode()
        except Exception as e:
            print(f"Error downloading photo for {entity_id}: {e}")
        return None

    async def get_profile_photos_batch(self, session_id: str, entity_ids: List[int]) -> Dict[int, str]:
        """Get multiple profile photos as base64"""
        client = self.clients.get(session_id)
        if not client:
            return {}

        result = {}

        # Process in smaller batches to avoid rate limiting
        batch_size = 5
        for i in range(0, len(entity_ids), batch_size):
            batch = entity_ids[i:i + batch_size]
            tasks = []

            for entity_id in batch:
                tasks.append(self._get_single_photo(client, entity_id))

            photos = await asyncio.gather(*tasks, return_exceptions=True)

            for entity_id, photo in zip(batch, photos):
                if isinstance(photo, str) and photo:
                    result[entity_id] = photo

            # Delay between batches
            if i + batch_size < len(entity_ids):
                await asyncio.sleep(0.2)

        return result

    async def _get_single_photo(self, client: TelegramClient, entity_id: int) -> Optional[str]:
        """Helper to get single photo"""
        try:
            photo = await client.download_profile_photo(entity_id, bytes)
            if photo:
                return base64.b64encode(photo).decode()
        except Exception as e:
            pass
        return None

    # Event handlers setup
    def setup_handlers(self, session_id: str, ws_callback: Callable):
        """Setup event handlers for real-time updates"""
        client = self.clients.get(session_id)
        if not client:
            raise ValueError("Client not found")

        self.ws_callbacks[session_id] = ws_callback

        @client.on(events.NewMessage)
        async def new_message_handler(event):
            if session_id in self.ws_callbacks:
                msg_data = await self._format_message(client, event.message)
                await self.ws_callbacks[session_id]("new_message", msg_data)

        @client.on(events.MessageEdited)
        async def edit_handler(event):
            if session_id in self.ws_callbacks:
                msg_data = await self._format_message(client, event.message)
                await self.ws_callbacks[session_id]("message_edited", msg_data)

        @client.on(events.MessageDeleted)
        async def delete_handler(event):
            if session_id in self.ws_callbacks:
                await self.ws_callbacks[session_id]("message_deleted", {
                    "chat_id": event.chat_id,
                    "message_ids": event.deleted_ids
                })

        @client.on(events.UserUpdate)
        async def user_update_handler(event):
            if session_id in self.ws_callbacks:
                await self.ws_callbacks[session_id]("user_update", {
                    "user_id": event.user_id,
                    "online": event.online,
                    "last_seen": event.last_seen.isoformat() if event.last_seen else None
                })

        @client.on(events.ChatAction)
        async def chat_action_handler(event):
            if session_id in self.ws_callbacks:
                await self.ws_callbacks[session_id]("chat_action", {
                    "chat_id": event.chat_id,
                    "user_id": event.user_id,
                    "action": str(event.action_message) if event.action_message else None
                })

    def remove_handlers(self, session_id: str):
        """Remove event handlers"""
        if session_id in self.ws_callbacks:
            del self.ws_callbacks[session_id]

    # Formatting helpers
    def _format_user(self, user) -> dict:
        """Format Telethon User to dict"""
        if not user:
            return None
        return {
            "id": user.id,
            "first_name": user.first_name or "",
            "last_name": user.last_name or "",
            "username": user.username,
            "phone": user.phone,
            "is_bot": user.bot if hasattr(user, 'bot') else False,
        }

    def _format_entity(self, entity) -> dict:
        """Format any entity to dict"""
        if isinstance(entity, User):
            return {
                "id": entity.id,
                "type": "user",
                "name": f"{entity.first_name or ''} {entity.last_name or ''}".strip(),
                "username": entity.username,
            }
        elif isinstance(entity, Chat):
            return {
                "id": entity.id,
                "type": "group",
                "name": entity.title,
            }
        elif isinstance(entity, Channel):
            return {
                "id": entity.id,
                "type": "channel" if entity.broadcast else "supergroup",
                "name": entity.title,
                "username": entity.username,
            }
        return {"id": getattr(entity, 'id', 0), "type": "unknown", "name": "Unknown"}

    async def _format_entity_full(self, client: TelegramClient, entity) -> dict:
        """Format entity with full info"""
        base = self._format_entity(entity)

        # Get member count for groups/channels
        if isinstance(entity, Channel):
            try:
                full = await client(GetFullChannelRequest(entity))
                base["members_count"] = full.full_chat.participants_count
            except:
                base["members_count"] = 0

        return base

    async def _format_dialog(self, client: TelegramClient, dialog) -> dict:
        """Format Telethon Dialog to dict"""
        entity = dialog.entity
        entity_type = "user"
        members_count = None
        status = None
        username = None

        if isinstance(entity, User):
            entity_type = "user"
            status = self._get_user_status(entity)
            username = entity.username
        elif isinstance(entity, Chat):
            entity_type = "group"
            members_count = entity.participants_count if hasattr(entity, 'participants_count') else None
        elif isinstance(entity, Channel):
            entity_type = "channel" if entity.broadcast else "supergroup"
            username = entity.username
            # Get member count for supergroups/channels
            try:
                full = await client(GetFullChannelRequest(entity))
                members_count = full.full_chat.participants_count
            except Exception:
                # Fallback to basic participants_count
                if hasattr(entity, 'participants_count'):
                    members_count = entity.participants_count

        last_msg = dialog.message
        last_message_text = ""
        if last_msg:
            if last_msg.text:
                last_message_text = last_msg.text[:100]
            elif last_msg.media:
                if isinstance(last_msg.media, MessageMediaPhoto):
                    last_message_text = "📷 Photo"
                elif isinstance(last_msg.media, MessageMediaDocument):
                    last_message_text = "📎 Document"
                else:
                    last_message_text = "📎 Media"

        return {
            "id": dialog.id,
            "name": dialog.name or "Unknown",
            "type": entity_type,
            "username": username,
            "status": status,
            "members_count": members_count,
            "last_message": last_message_text,
            "last_message_date": last_msg.date.isoformat() if last_msg and last_msg.date else None,
            "unread_count": dialog.unread_count,
            "is_pinned": dialog.pinned,
            "is_muted": dialog.archived,
        }

    async def _format_message(self, client: TelegramClient, message) -> dict:
        """Format Telethon Message to dict"""
        if not message:
            return None

        sender_name = ""
        sender_id = None
        if message.sender:
            sender_id = message.sender_id
            if isinstance(message.sender, User):
                sender_name = f"{message.sender.first_name or ''} {message.sender.last_name or ''}".strip()
            else:
                sender_name = getattr(message.sender, 'title', 'Unknown')

        media_type = None
        media_info = None
        if message.media:
            if isinstance(message.media, MessageMediaPhoto):
                media_type = "photo"
            elif isinstance(message.media, MessageMediaDocument):
                doc = message.media.document
                if doc:
                    for attr in doc.attributes:
                        if isinstance(attr, DocumentAttributeSticker):
                            media_type = "sticker"
                            break
                        elif isinstance(attr, DocumentAttributeAudio):
                            media_type = "voice" if attr.voice else "audio"
                            break
                        elif isinstance(attr, DocumentAttributeVideo):
                            media_type = "video" if not attr.round_message else "video_note"
                            break
                    if not media_type:
                        media_type = "document"
                        for attr in doc.attributes:
                            if isinstance(attr, DocumentAttributeFilename):
                                media_info = attr.file_name
                                break

        return {
            "id": message.id,
            "chat_id": message.chat_id,
            "sender_id": sender_id,
            "sender_name": sender_name,
            "text": message.text or "",
            "date": message.date.isoformat() if message.date else None,
            "is_outgoing": message.out,
            "reply_to_msg_id": message.reply_to_msg_id if message.reply_to else None,
            "media_type": media_type,
            "media_info": media_info,
            "is_edited": message.edit_date is not None,
            "views": message.views,
            "forwards": message.forwards,
        }


# Global instance
telegram_manager = TelegramManager()
