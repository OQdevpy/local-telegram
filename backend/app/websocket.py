from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json
import asyncio
from app.telegram_client import telegram_manager


class ConnectionManager:
    def __init__(self):
        # session_id -> set of websockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # websocket -> session_id
        self.websocket_sessions: Dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        """Connect a websocket for a session"""
        await websocket.accept()

        if session_id not in self.active_connections:
            self.active_connections[session_id] = set()

        self.active_connections[session_id].add(websocket)
        self.websocket_sessions[websocket] = session_id

        # Setup Telegram event handlers if client exists (try to auto-restore)
        client = await telegram_manager.get_client_or_restore(session_id)
        if client:
            telegram_manager.setup_handlers(session_id, self._create_callback(session_id))

    def disconnect(self, websocket: WebSocket):
        """Disconnect a websocket"""
        session_id = self.websocket_sessions.get(websocket)
        if session_id:
            if session_id in self.active_connections:
                self.active_connections[session_id].discard(websocket)
                if not self.active_connections[session_id]:
                    del self.active_connections[session_id]
                    telegram_manager.remove_handlers(session_id)
            del self.websocket_sessions[websocket]

    async def send_to_session(self, session_id: str, event: str, data: dict):
        """Send message to all websockets of a session"""
        if session_id in self.active_connections:
            message = json.dumps({"event": event, "data": data})
            dead_connections = set()

            for websocket in self.active_connections[session_id]:
                try:
                    await websocket.send_text(message)
                except:
                    dead_connections.add(websocket)

            # Cleanup dead connections
            for ws in dead_connections:
                self.disconnect(ws)

    async def broadcast(self, event: str, data: dict):
        """Broadcast to all connected websockets"""
        message = json.dumps({"event": event, "data": data})
        for session_id, connections in self.active_connections.items():
            for websocket in connections:
                try:
                    await websocket.send_text(message)
                except:
                    pass

    def _create_callback(self, session_id: str):
        """Create callback for Telegram events"""
        async def callback(event: str, data: dict):
            await self.send_to_session(session_id, event, data)
        return callback


# Global connection manager
manager = ConnectionManager()


async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """Main WebSocket endpoint handler"""
    await manager.connect(websocket, session_id)

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            event = message.get("event")
            payload = message.get("data", {})

            # Handle client events
            if event == "send_message":
                await handle_send_message(session_id, payload)
            elif event == "edit_message":
                await handle_edit_message(session_id, payload)
            elif event == "delete_message":
                await handle_delete_message(session_id, payload)
            elif event == "mark_read":
                await handle_mark_read(session_id, payload)
            elif event == "start_typing":
                await handle_typing(session_id, payload)
            elif event == "ping":
                await websocket.send_text(json.dumps({"event": "pong", "data": {}}))

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)


async def handle_send_message(session_id: str, data: dict):
    """Handle send message event"""
    try:
        chat_id = data.get("chat_id")
        text = data.get("text")
        reply_to = data.get("reply_to")

        if chat_id and text:
            message = await telegram_manager.send_message(
                session_id, chat_id, text, reply_to
            )
            # Response will come through Telegram event handler
    except Exception as e:
        await manager.send_to_session(session_id, "error", {
            "action": "send_message",
            "error": str(e)
        })


async def handle_edit_message(session_id: str, data: dict):
    """Handle edit message event"""
    try:
        chat_id = data.get("chat_id")
        message_id = data.get("message_id")
        text = data.get("text")

        if chat_id and message_id and text:
            await telegram_manager.edit_message(
                session_id, chat_id, message_id, text
            )
    except Exception as e:
        await manager.send_to_session(session_id, "error", {
            "action": "edit_message",
            "error": str(e)
        })


async def handle_delete_message(session_id: str, data: dict):
    """Handle delete message event"""
    try:
        chat_id = data.get("chat_id")
        message_ids = data.get("message_ids", [])

        if chat_id and message_ids:
            await telegram_manager.delete_messages(
                session_id, chat_id, message_ids
            )
    except Exception as e:
        await manager.send_to_session(session_id, "error", {
            "action": "delete_message",
            "error": str(e)
        })


async def handle_mark_read(session_id: str, data: dict):
    """Handle mark as read event"""
    try:
        chat_id = data.get("chat_id")
        if chat_id:
            await telegram_manager.mark_as_read(session_id, chat_id)
    except Exception as e:
        pass  # Silent fail for mark read


async def handle_typing(session_id: str, data: dict):
    """Handle typing indicator event"""
    try:
        chat_id = data.get("chat_id")
        if chat_id:
            await telegram_manager.send_typing(session_id, chat_id)
    except Exception as e:
        pass  # Silent fail for typing indicator
