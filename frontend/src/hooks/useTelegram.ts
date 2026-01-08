import { useCallback, useState } from 'react';
import { authApi, chatsApi, messagesApi, mediaApi } from '../services/api';
import { useChatStore } from '../store/chatStore';
import type { Message } from '../types';

export const useTelegram = () => {
  const {
    auth,
    setAuth,
    clearAuth,
    setDialogs,
    setMessages,
    prependMessages,
    setIsLoading,
    setError,
  } = useChatStore();
  const [authStep, setAuthStep] = useState<'phone' | 'code' | '2fa' | 'done'>('phone');

  // Auth methods
  const sendCode = useCallback(async (phone: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authApi.sendCode(phone);
      setAuth({
        sessionId: result.session_id,
        phoneCodeHash: result.phone_code_hash,
        phone,
      });
      setAuthStep('code');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setAuth, setIsLoading, setError]);

  const signIn = useCallback(async (code: string, password?: string) => {
    if (!auth.sessionId || !auth.phone || !auth.phoneCodeHash) {
      setError('Missing authentication data');
      return false;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await authApi.signIn(
        auth.sessionId,
        auth.phone,
        code,
        auth.phoneCodeHash,
        password
      );

      if (result.needs_2fa) {
        setAuth({ needs2FA: true });
        setAuthStep('2fa');
        return false;
      }

      if (result.success && result.session_string && result.user) {
        setAuth({
          isAuthenticated: true,
          sessionString: result.session_string,
          user: result.user,
          needs2FA: false,
        });
        setAuthStep('done');
        return true;
      }

      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [auth, setAuth, setIsLoading, setError]);

  const signIn2FA = useCallback(async (password: string) => {
    if (!auth.sessionId) {
      setError('Missing session');
      return false;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await authApi.signIn2FA(auth.sessionId, password);
      if (result.success) {
        setAuth({
          isAuthenticated: true,
          sessionString: result.session_string,
          user: result.user,
          needs2FA: false,
        });
        setAuthStep('done');
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid password');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [auth.sessionId, setAuth, setIsLoading, setError]);

  const restoreSession = useCallback(async () => {
    if (!auth.sessionString) {
      return false;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await authApi.restoreSession(auth.sessionString);
      if (result.success) {
        setAuth({
          isAuthenticated: true,
          sessionId: result.session_id,
          user: result.user,
        });
        setAuthStep('done');
        return true;
      }
      return false;
    } catch (err) {
      // Session invalid, clear it
      clearAuth();
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [auth.sessionString, setAuth, clearAuth, setIsLoading, setError]);

  const logout = useCallback(async () => {
    if (auth.sessionId) {
      try {
        await authApi.logout(auth.sessionId);
      } catch {
        // Ignore logout errors
      }
    }
    clearAuth();
    setAuthStep('phone');
  }, [auth.sessionId, clearAuth]);

  // Chat methods
  const loadDialogs = useCallback(async () => {
    if (!auth.sessionId) return;

    setIsLoading(true);
    try {
      const dialogs = await chatsApi.getDialogs(auth.sessionId);
      setDialogs(dialogs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dialogs');
    } finally {
      setIsLoading(false);
    }
  }, [auth.sessionId, setDialogs, setIsLoading, setError]);

  const loadMessages = useCallback(async (chatId: number, limit = 50) => {
    if (!auth.sessionId) return;

    setIsLoading(true);
    try {
      const messages = await messagesApi.getMessages(auth.sessionId, chatId, limit);
      setMessages(chatId, messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [auth.sessionId, setMessages, setIsLoading, setError]);

  const loadMoreMessages = useCallback(async (chatId: number, offsetId: number) => {
    if (!auth.sessionId) return;

    try {
      const messages = await messagesApi.getMessages(auth.sessionId, chatId, 50, offsetId);
      prependMessages(chatId, messages);
    } catch (err) {
      console.error('Failed to load more messages:', err);
    }
  }, [auth.sessionId, prependMessages]);

  const sendMessage = useCallback(async (chatId: number, text: string, replyTo?: number): Promise<Message | null> => {
    if (!auth.sessionId) return null;

    try {
      return await messagesApi.sendMessage(auth.sessionId, chatId, text, replyTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      return null;
    }
  }, [auth.sessionId, setError]);

  const editMessage = useCallback(async (chatId: number, messageId: number, text: string): Promise<Message | null> => {
    if (!auth.sessionId) return null;

    try {
      return await messagesApi.editMessage(auth.sessionId, chatId, messageId, text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to edit message');
      return null;
    }
  }, [auth.sessionId, setError]);

  const deleteMessages = useCallback(async (chatId: number, messageIds: number[]) => {
    if (!auth.sessionId) return;

    try {
      await messagesApi.deleteMessages(auth.sessionId, chatId, messageIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete messages');
    }
  }, [auth.sessionId, setError]);

  const uploadFile = useCallback(async (chatId: number, file: File, caption?: string, replyTo?: number): Promise<Message | null> => {
    if (!auth.sessionId) return null;

    try {
      return await mediaApi.uploadFile(auth.sessionId, chatId, file, caption, replyTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
      return null;
    }
  }, [auth.sessionId, setError]);

  const markAsRead = useCallback(async (chatId: number) => {
    if (!auth.sessionId) return;

    try {
      await chatsApi.markAsRead(auth.sessionId, chatId);
    } catch {
      // Silent fail
    }
  }, [auth.sessionId]);

  return {
    // Auth
    authStep,
    sendCode,
    signIn,
    signIn2FA,
    restoreSession,
    logout,

    // Chats
    loadDialogs,
    loadMessages,
    loadMoreMessages,
    sendMessage,
    editMessage,
    deleteMessages,
    uploadFile,
    markAsRead,
  };
};
