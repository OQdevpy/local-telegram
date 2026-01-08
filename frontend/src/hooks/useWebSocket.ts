import { useEffect, useRef, useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import type { Message, WSMessage } from '../types';

export const useWebSocket = () => {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const { auth, addMessage, updateMessage, removeMessages, updateDialog } = useChatStore();

  const connect = useCallback(() => {
    if (!auth.sessionId || socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws?session_id=${auth.sessionId}`;

    socketRef.current = new WebSocket(wsUrl);

    socketRef.current.onopen = () => {
      console.log('WebSocket connected');
    };

    socketRef.current.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        handleMessage(message);
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    socketRef.current.onclose = () => {
      console.log('WebSocket disconnected');
      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    socketRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [auth.sessionId]);

  const handleMessage = useCallback((message: WSMessage) => {
    switch (message.event) {
      case 'new_message': {
        const msg = message.data as Message;
        addMessage(msg.chat_id, msg);
        // Update dialog last message
        updateDialog(msg.chat_id, {
          last_message: msg.text || '[Media]',
          last_message_date: msg.date,
        });
        break;
      }
      case 'message_edited': {
        const msg = message.data as Message;
        updateMessage(msg.chat_id, msg);
        break;
      }
      case 'message_deleted': {
        const data = message.data as { chat_id: number; message_ids: number[] };
        removeMessages(data.chat_id, data.message_ids);
        break;
      }
      case 'user_update': {
        // Handle online status updates
        console.log('User update:', message.data);
        break;
      }
      case 'pong': {
        // Heartbeat response
        break;
      }
      default:
        console.log('Unknown event:', message.event);
    }
  }, [addMessage, updateMessage, removeMessages, updateDialog]);

  const send = useCallback((event: string, data: unknown) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ event, data }));
    }
  }, []);

  const sendMessage = useCallback((chatId: number, text: string, replyTo?: number) => {
    send('send_message', { chat_id: chatId, text, reply_to: replyTo });
  }, [send]);

  const editMessage = useCallback((chatId: number, messageId: number, text: string) => {
    send('edit_message', { chat_id: chatId, message_id: messageId, text });
  }, [send]);

  const deleteMessage = useCallback((chatId: number, messageIds: number[]) => {
    send('delete_message', { chat_id: chatId, message_ids: messageIds });
  }, [send]);

  const markRead = useCallback((chatId: number) => {
    send('mark_read', { chat_id: chatId });
  }, [send]);

  const startTyping = useCallback((chatId: number) => {
    send('start_typing', { chat_id: chatId });
  }, [send]);

  useEffect(() => {
    if (auth.isAuthenticated && auth.sessionId) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [auth.isAuthenticated, auth.sessionId, connect]);

  // Heartbeat
  useEffect(() => {
    const interval = setInterval(() => {
      send('ping', {});
    }, 30000);

    return () => clearInterval(interval);
  }, [send]);

  return {
    sendMessage,
    editMessage,
    deleteMessage,
    markRead,
    startTyping,
    isConnected: socketRef.current?.readyState === WebSocket.OPEN,
  };
};
