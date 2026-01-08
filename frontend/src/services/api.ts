import axios from 'axios';
import type { Dialog, Message, User } from '../types';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth API
export const authApi = {
  sendCode: async (phone: string): Promise<{ phone_code_hash: string; session_id: string }> => {
    const response = await api.post('/auth/send-code', { phone });
    return response.data;
  },

  signIn: async (
    sessionId: string,
    phone: string,
    code: string,
    phoneCodeHash: string,
    password?: string
  ): Promise<{
    success: boolean;
    session_string?: string;
    needs_2fa?: boolean;
    user?: User;
  }> => {
    const response = await api.post('/auth/sign-in', {
      session_id: sessionId,
      phone,
      code,
      phone_code_hash: phoneCodeHash,
      password,
    });
    return response.data;
  },

  signIn2FA: async (
    sessionId: string,
    password: string
  ): Promise<{ success: boolean; session_string: string; user: User }> => {
    const response = await api.post('/auth/sign-in-2fa', null, {
      params: { session_id: sessionId, password },
    });
    return response.data;
  },

  restoreSession: async (
    sessionString: string
  ): Promise<{ success: boolean; session_id: string; user: User }> => {
    const response = await api.post('/auth/restore-session', {
      session_string: sessionString,
    });
    return response.data;
  },

  logout: async (sessionId: string): Promise<void> => {
    await api.post('/auth/logout', null, { params: { session_id: sessionId } });
  },

  getMe: async (sessionId: string): Promise<User> => {
    const response = await api.get('/auth/me', { params: { session_id: sessionId } });
    return response.data;
  },
};

// Chats API
export const chatsApi = {
  getDialogs: async (sessionId: string, limit = 100): Promise<Dialog[]> => {
    const response = await api.get('/chats/dialogs', {
      params: { session_id: sessionId, limit },
    });
    return response.data.dialogs;
  },

  getDialog: async (sessionId: string, chatId: number): Promise<Dialog> => {
    const response = await api.get(`/chats/dialog/${chatId}`, {
      params: { session_id: sessionId },
    });
    return response.data;
  },

  getAvatar: async (sessionId: string, entityId: number): Promise<string | null> => {
    const response = await api.get(`/chats/avatar/${entityId}`, {
      params: { session_id: sessionId },
    });
    return response.data.avatar;
  },

  getAvatars: async (sessionId: string, entityIds: number[]): Promise<Record<number, string>> => {
    const response = await api.post('/chats/avatars', {
      entity_ids: entityIds,
    }, {
      params: { session_id: sessionId },
    });
    return response.data.avatars;
  },

  markAsRead: async (sessionId: string, chatId: number): Promise<void> => {
    await api.post(`/chats/mark-read/${chatId}`, null, {
      params: { session_id: sessionId },
    });
  },

  sendTyping: async (sessionId: string, chatId: number): Promise<void> => {
    await api.post(`/chats/typing/${chatId}`, null, {
      params: { session_id: sessionId },
    });
  },
};

// Messages API
export const messagesApi = {
  getMessages: async (
    sessionId: string,
    chatId: number,
    limit = 50,
    offsetId = 0
  ): Promise<Message[]> => {
    const response = await api.get(`/messages/${chatId}`, {
      params: { session_id: sessionId, limit, offset_id: offsetId },
    });
    return response.data.messages;
  },

  sendMessage: async (
    sessionId: string,
    chatId: number,
    text: string,
    replyTo?: number
  ): Promise<Message> => {
    const response = await api.post(
      '/messages/send',
      { chat_id: chatId, text, reply_to: replyTo },
      { params: { session_id: sessionId } }
    );
    return response.data;
  },

  editMessage: async (
    sessionId: string,
    chatId: number,
    messageId: number,
    text: string
  ): Promise<Message> => {
    const response = await api.put(
      '/messages/edit',
      { chat_id: chatId, message_id: messageId, text },
      { params: { session_id: sessionId } }
    );
    return response.data;
  },

  deleteMessages: async (
    sessionId: string,
    chatId: number,
    messageIds: number[]
  ): Promise<void> => {
    await api.delete('/messages/delete', {
      data: { chat_id: chatId, message_ids: messageIds },
      params: { session_id: sessionId },
    });
  },
};

// Media API
export const mediaApi = {
  uploadFile: async (
    sessionId: string,
    chatId: number,
    file: File,
    caption?: string,
    replyTo?: number
  ): Promise<Message> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/media/upload', formData, {
      params: { session_id: sessionId, chat_id: chatId, caption, reply_to: replyTo },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getDownloadUrl: (sessionId: string, chatId: number, messageId: number): string => {
    return `${API_BASE}/media/download/${chatId}/${messageId}?session_id=${sessionId}`;
  },

  getPreview: async (
    sessionId: string,
    chatId: number,
    messageId: number
  ): Promise<{ preview: string; type: string }> => {
    const response = await api.get(`/media/preview/${chatId}/${messageId}`, {
      params: { session_id: sessionId },
    });
    return response.data;
  },
};
