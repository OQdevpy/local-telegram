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
    setContacts,
    setMessages,
    prependMessages,
    setIsLoading,
    setError,
    avatars,
    setAvatars,
    setAvatar,
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
    const sessionString = auth.sessionString;
    if (!sessionString) {
      console.log('No sessionString found');
      return false;
    }

    setIsLoading(true);
    setError(null);
    try {
      console.log('Restoring session...');
      const result = await authApi.restoreSession(sessionString);
      if (result.success) {
        setAuth({
          isAuthenticated: true,
          sessionId: result.session_id,
          sessionString: sessionString, // Keep the sessionString
          user: result.user,
        });
        setAuthStep('done');
        console.log('Session restored, sessionId:', result.session_id);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Session restore failed:', err);
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
      // Load up to 300 dialogs to get all chats
      const dialogs = await chatsApi.getDialogs(auth.sessionId, 300);
      console.log(`Loaded ${dialogs.length} dialogs`);
      setDialogs(dialogs);
    } catch (err) {
      console.error('Failed to load dialogs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dialogs');
    } finally {
      setIsLoading(false);
    }
  }, [auth.sessionId, setDialogs, setIsLoading, setError]);

  const loadContacts = useCallback(async () => {
    if (!auth.sessionId) return;

    try {
      const contacts = await chatsApi.getContacts(auth.sessionId);
      console.log(`Loaded ${contacts.length} contacts`);
      setContacts(contacts);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    }
  }, [auth.sessionId, setContacts]);

  // Load avatars for multiple entities
  const loadAvatars = useCallback(async (entityIds: number[]) => {
    if (!auth.sessionId) return;

    // Filter out already cached avatars
    const uncachedIds = entityIds.filter(id => !avatars[id]);
    if (uncachedIds.length === 0) return;

    try {
      const result = await chatsApi.getAvatars(auth.sessionId, uncachedIds);
      if (result && Object.keys(result).length > 0) {
        // Convert string keys to number keys (JSON serializes int keys as strings)
        const normalized: Record<number, string> = {};
        for (const [key, value] of Object.entries(result)) {
          normalized[Number(key)] = value;
        }
        setAvatars(normalized);
      }
    } catch (err) {
      console.error('Failed to load avatars:', err);
    }
  }, [auth.sessionId, avatars, setAvatars]);

  // Load single avatar
  const loadAvatar = useCallback(async (entityId: number) => {
    if (!auth.sessionId || avatars[entityId]) return;

    try {
      const avatar = await chatsApi.getAvatar(auth.sessionId, entityId);
      if (avatar) {
        setAvatar(entityId, avatar);
      }
    } catch (err) {
      console.error('Failed to load avatar:', err);
    }
  }, [auth.sessionId, avatars, setAvatar]);

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
    console.log('sendMessage called:', { chatId, text, replyTo, sessionId: auth.sessionId });

    if (!auth.sessionId) {
      console.error('sendMessage: No sessionId available!');
      setError('Session not found. Please refresh the page.');
      return null;
    }

    try {
      const result = await messagesApi.sendMessage(auth.sessionId, chatId, text, replyTo);
      console.log('sendMessage result:', result);
      return result;
    } catch (err) {
      console.error('sendMessage error:', err);
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
    loadContacts,
    loadAvatars,
    loadAvatar,
    loadMessages,
    loadMoreMessages,
    sendMessage,
    editMessage,
    deleteMessages,
    uploadFile,
    markAsRead,
  };
};
