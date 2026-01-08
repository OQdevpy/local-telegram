import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Dialog, Message, User, AuthState } from '../types';

interface ChatStore {
  // Auth state
  auth: AuthState;
  setAuth: (auth: Partial<AuthState>) => void;
  clearAuth: () => void;

  // Dialogs state
  dialogs: Dialog[];
  setDialogs: (dialogs: Dialog[]) => void;
  updateDialog: (dialogId: number, updates: Partial<Dialog>) => void;

  // Active chat
  activeChat: number | null;
  setActiveChat: (chatId: number | null) => void;

  // Messages state (per chat)
  messages: Record<number, Message[]>;
  setMessages: (chatId: number, messages: Message[]) => void;
  addMessage: (chatId: number, message: Message) => void;
  updateMessage: (chatId: number, message: Message) => void;
  removeMessages: (chatId: number, messageIds: number[]) => void;
  prependMessages: (chatId: number, messages: Message[]) => void;

  // Avatars cache
  avatars: Record<number, string>;
  setAvatar: (entityId: number, avatar: string) => void;
  setAvatars: (avatars: Record<number, string>) => void;

  // UI state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;

  // Reply state
  replyTo: Message | null;
  setReplyTo: (message: Message | null) => void;

  // Edit state
  editingMessage: Message | null;
  setEditingMessage: (message: Message | null) => void;
}

const initialAuthState: AuthState = {
  isAuthenticated: false,
  needs2FA: false,
};

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // Auth
      auth: initialAuthState,
      setAuth: (auth) =>
        set((state) => ({
          auth: { ...state.auth, ...auth },
        })),
      clearAuth: () =>
        set({
          auth: initialAuthState,
          dialogs: [],
          messages: {},
          activeChat: null,
          avatars: {},
        }),

      // Dialogs
      dialogs: [],
      setDialogs: (dialogs) => set({ dialogs }),
      updateDialog: (dialogId, updates) =>
        set((state) => ({
          dialogs: state.dialogs.map((d) =>
            d.id === dialogId ? { ...d, ...updates } : d
          ),
        })),

      // Active chat
      activeChat: null,
      setActiveChat: (chatId) => set({ activeChat: chatId, replyTo: null, editingMessage: null }),

      // Messages
      messages: {},
      setMessages: (chatId, messages) =>
        set((state) => ({
          messages: { ...state.messages, [chatId]: messages },
        })),
      addMessage: (chatId, message) =>
        set((state) => {
          const existing = state.messages[chatId] || [];
          // Check if message already exists
          if (existing.some((m) => m.id === message.id)) {
            return state;
          }
          return {
            messages: {
              ...state.messages,
              [chatId]: [message, ...existing],
            },
          };
        }),
      updateMessage: (chatId, message) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [chatId]: (state.messages[chatId] || []).map((m) =>
              m.id === message.id ? message : m
            ),
          },
        })),
      removeMessages: (chatId, messageIds) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [chatId]: (state.messages[chatId] || []).filter(
              (m) => !messageIds.includes(m.id)
            ),
          },
        })),
      prependMessages: (chatId, messages) =>
        set((state) => {
          const existing = state.messages[chatId] || [];
          const existingIds = new Set(existing.map((m) => m.id));
          const newMessages = messages.filter((m) => !existingIds.has(m.id));
          return {
            messages: {
              ...state.messages,
              [chatId]: [...existing, ...newMessages],
            },
          };
        }),

      // Avatars
      avatars: {},
      setAvatar: (entityId, avatar) =>
        set((state) => ({
          avatars: { ...state.avatars, [entityId]: avatar },
        })),
      setAvatars: (avatars) =>
        set((state) => ({
          avatars: { ...state.avatars, ...avatars },
        })),

      // UI
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),
      error: null,
      setError: (error) => set({ error }),

      // Reply
      replyTo: null,
      setReplyTo: (message) => set({ replyTo: message, editingMessage: null }),

      // Edit
      editingMessage: null,
      setEditingMessage: (message) => set({ editingMessage: message, replyTo: null }),
    }),
    {
      name: 'telegram-clone-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        auth: {
          sessionString: state.auth.sessionString,
          sessionId: state.auth.sessionId,
          isAuthenticated: state.auth.isAuthenticated,
          user: state.auth.user,
        },
        dialogs: state.dialogs,
        avatars: state.avatars,
        activeChat: state.activeChat,
      }),
    }
  )
);
