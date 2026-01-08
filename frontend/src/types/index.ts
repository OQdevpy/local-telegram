export interface User {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  phone?: string;
  is_bot: boolean;
}

export interface Dialog {
  id: number;
  name: string;
  type: 'user' | 'group' | 'channel' | 'supergroup';
  username?: string;
  status?: string;
  members_count?: number;
  avatar?: string;
  last_message?: string;
  last_message_date?: string;
  unread_count: number;
  is_pinned: boolean;
  is_muted: boolean;
}

export interface Message {
  id: number;
  chat_id: number;
  sender_id?: number;
  sender_name?: string;
  text?: string;
  date: string;
  is_outgoing: boolean;
  reply_to_msg_id?: number;
  media_type?: 'photo' | 'video' | 'document' | 'voice' | 'sticker' | 'video_note' | 'audio';
  media_info?: string;
  is_edited: boolean;
  views?: number;
  forwards?: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  sessionId?: string;
  sessionString?: string;
  user?: User;
  phone?: string;
  phoneCodeHash?: string;
  needs2FA: boolean;
}

export interface WSMessage {
  event: string;
  data: unknown;
}
