import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { useTelegram } from '../hooks/useTelegram';
import { MessageInput } from './MessageInput';
import { mediaApi } from '../services/api';
import { format } from 'date-fns';
import {
  MoreVertical,
  Phone,
  Search,
  Image,
  FileText,
  Mic,
  Video,
  Reply,
  Pencil,
  Trash2,
  Check,
  CheckCheck,
  Copy,
  Forward,
  Pin,
  Download,
  Play,
  Users,
} from 'lucide-react';
import type { Message } from '../types';

// Avatar gradient colors - Telegram style
const avatarColors = [
  ['#FF885E', '#FF516A'],
  ['#FFCD6A', '#FFA85C'],
  ['#82B1FF', '#665FFF'],
  ['#A0DE7E', '#54CB68'],
  ['#53EDD6', '#28C9B7'],
  ['#72D5FD', '#2A9EF1'],
  ['#E0A2F3', '#D669ED'],
];

const getAvatarGradient = (id: number) => {
  const index = Math.abs(id) % avatarColors.length;
  return avatarColors[index];
};

// Sender name colors
const senderColors = [
  '#FC5C51', '#FA790F', '#895DD5', '#0FB297',
  '#00A1C4', '#4FABE9', '#B761E5', '#3DAEE9',
];

const getSenderColor = (id: number) => {
  const index = Math.abs(id) % senderColors.length;
  return senderColors[index];
};

export const ChatWindow: React.FC = () => {
  const {
    activeChat,
    messages,
    dialogs,
    auth,
    avatars,
    setReplyTo,
    setEditingMessage,
  } = useChatStore();
  const { loadMessages, loadMoreMessages, markAsRead, deleteMessages } = useTelegram();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    message: Message;
  } | null>(null);
  const [mediaPreviews, setMediaPreviews] = useState<Record<string, string>>({});
  const loadingPreviewsRef = useRef<Set<string>>(new Set());

  const activeDialog = dialogs.find((d) => d.id === activeChat);
  const chatMessages = activeChat ? messages[activeChat] || [] : [];

  // Load media previews for photo messages
  const loadMediaPreview = useCallback(async (chatId: number, messageId: number) => {
    const key = `${chatId}-${messageId}`;
    if (loadingPreviewsRef.current.has(key) || !auth.sessionId) return;

    // Check if already loaded
    setMediaPreviews(prev => {
      if (prev[key]) return prev;

      // Not loaded, start loading
      loadingPreviewsRef.current.add(key);

      mediaApi.getPreview(auth.sessionId!, chatId, messageId)
        .then(result => {
          if (result?.preview) {
            setMediaPreviews(p => ({ ...p, [key]: result.preview }));
          }
        })
        .catch(err => console.error('Failed to load preview:', err))
        .finally(() => {
          loadingPreviewsRef.current.delete(key);
        });

      return prev;
    });
  }, [auth.sessionId]);

  // Load previews for visible photo messages
  useEffect(() => {
    if (!activeChat) return;
    chatMessages.forEach(msg => {
      if (msg.media_type === 'photo') {
        loadMediaPreview(activeChat, msg.id);
      }
    });
  }, [activeChat, chatMessages, loadMediaPreview]);

  useEffect(() => {
    if (activeChat) {
      loadMessages(activeChat);
      markAsRead(activeChat);
    }
  }, [activeChat, loadMessages, markAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current || !activeChat) return;

    const { scrollTop } = containerRef.current;
    if (scrollTop < 100 && chatMessages.length > 0) {
      const oldestMessage = chatMessages[chatMessages.length - 1];
      if (oldestMessage) {
        loadMoreMessages(activeChat, oldestMessage.id);
      }
    }
  }, [activeChat, chatMessages, loadMoreMessages]);

  const handleContextMenu = (e: React.MouseEvent, message: Message) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, message });
  };

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    document.addEventListener('click', closeContextMenu);
    return () => document.removeEventListener('click', closeContextMenu);
  }, []);

  const getMediaIcon = (mediaType: string | undefined) => {
    switch (mediaType) {
      case 'photo':
        return <Image size={16} className="text-[#6ab2f2]" />;
      case 'video':
      case 'video_note':
        return <Video size={16} className="text-[#6ab2f2]" />;
      case 'voice':
      case 'audio':
        return <Mic size={16} className="text-[#6ab2f2]" />;
      case 'document':
        return <FileText size={16} className="text-[#6ab2f2]" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    if (!activeDialog) return '';

    if (activeDialog.type === 'supergroup' || activeDialog.type === 'group') {
      if (activeDialog.members_count) {
        return `${activeDialog.members_count.toLocaleString()} a'zo`;
      }
      return activeDialog.type === 'supergroup' ? 'superguruh' : 'guruh';
    }

    if (activeDialog.type === 'channel') {
      if (activeDialog.members_count) {
        return `${activeDialog.members_count.toLocaleString()} obunachi`;
      }
      return 'kanal';
    }

    // User - show status
    if (activeDialog.status) {
      return activeDialog.status;
    }

    return 'last seen recently';
  };

  if (!activeChat || !activeDialog) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0e1621]">
        <div className="text-center">
          <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-[#17212b] flex items-center justify-center">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <path
                d="M40 0C17.91 0 0 17.91 0 40s17.91 40 40 40 40-17.91 40-40S62.09 0 40 0zm18.13 29.17L47.56 56.3c-1.13 3.37-4.15 4.55-6.69 2.69l-11.23-8.28-5.42 5.22c-.6.58-1.1.68-1.63.68l.8-11.38 20.77-18.77c.9-.8-.2-1.25-1.4-.45L18.46 42.05l-10.99-3.43c-2.4-.75-2.44-2.4.5-3.55l42.94-16.55c1.99-.72 3.74.48 3.22 2.65z"
                fill="#3390ec"
                fillOpacity="0.3"
              />
            </svg>
          </div>
          <p className="text-[#6c7883] text-lg">Xabar yuborish uchun chat tanlang</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0e1621]">
      {/* Header */}
      <div className="h-[56px] bg-[#17212b] flex items-center justify-between px-4 border-b border-[#101921]">
        <div className="flex items-center gap-3">
          <div
            className="w-[42px] h-[42px] rounded-full flex items-center justify-center text-white font-medium overflow-hidden"
            style={{
              background: avatars[activeDialog.id]
                ? undefined
                : `linear-gradient(135deg, ${getAvatarGradient(activeDialog.id)[0]}, ${getAvatarGradient(activeDialog.id)[1]})`
            }}
          >
            {avatars[activeDialog.id] ? (
              <img
                src={`data:image/jpeg;base64,${avatars[activeDialog.id]}`}
                alt={activeDialog.name}
                className="w-full h-full object-cover"
              />
            ) : (
              activeDialog.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              {(activeDialog.type === 'supergroup' || activeDialog.type === 'group') && (
                <Users size={16} className="text-[#6c7883]" />
              )}
              <h2 className="font-medium text-white text-[16px]">{activeDialog.name}</h2>
            </div>
            <p className={`text-[13px] ${activeDialog.status === 'online' ? 'text-[#3390ec]' : 'text-[#6c7883]'}`}>
              {getStatusText()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="w-10 h-10 flex items-center justify-center hover:bg-[#232e3c] rounded-full transition-colors">
            <Search size={20} className="text-[#6c7883]" />
          </button>
          <button className="w-10 h-10 flex items-center justify-center hover:bg-[#232e3c] rounded-full transition-colors">
            <Phone size={20} className="text-[#6c7883]" />
          </button>
          <button className="w-10 h-10 flex items-center justify-center hover:bg-[#232e3c] rounded-full transition-colors">
            <MoreVertical size={20} className="text-[#6c7883]" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-2"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23182533' fill-opacity='0.5'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundColor: '#0e1621'
        }}
      >
        <div className="max-w-[780px] mx-auto">
          {[...chatMessages].reverse().map((message, index, arr) => {
            const prevMessage = arr[index - 1];
            const showDate =
              !prevMessage ||
              new Date(message.date).toDateString() !==
                new Date(prevMessage.date).toDateString();

            const senderColor = message.sender_id ? getSenderColor(message.sender_id) : '#6ab2f2';

            return (
              <React.Fragment key={message.id}>
                {showDate && (
                  <div className="flex justify-center my-3">
                    <span className="bg-[#182533]/90 text-[#6c7883] text-[13px] px-3 py-1 rounded-full">
                      {format(new Date(message.date), 'dd MMMM yyyy')}
                    </span>
                  </div>
                )}
                <div
                  className={`flex mb-1 ${message.is_outgoing ? 'justify-end' : 'justify-start'}`}
                  onContextMenu={(e) => handleContextMenu(e, message)}
                >
                  <div
                    className={`max-w-[480px] rounded-lg px-[10px] py-[6px] relative ${
                      message.is_outgoing
                        ? 'bg-[#2b5278] rounded-br-[4px]'
                        : 'bg-[#182533] rounded-bl-[4px]'
                    }`}
                  >
                    {/* Sender name for groups */}
                    {!message.is_outgoing && message.sender_name && (activeDialog.type === 'group' || activeDialog.type === 'supergroup') && (
                      <p
                        className="text-[14px] font-medium mb-[2px]"
                        style={{ color: senderColor }}
                      >
                        {message.sender_name}
                      </p>
                    )}

                    {/* Reply preview */}
                    {message.reply_to_msg_id && (
                      <div className="flex items-stretch gap-2 mb-[6px] cursor-pointer hover:opacity-80">
                        <div className="w-[3px] rounded-full bg-[#6ab2f2]" />
                        <div className="py-[2px]">
                          <p className="text-[13px] text-[#6ab2f2] font-medium">
                            Reply to message
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Photo preview */}
                    {message.media_type === 'photo' && activeChat && (
                      <div className="mb-[6px] -mx-[10px] -mt-[6px] rounded-t-lg overflow-hidden">
                        {mediaPreviews[`${activeChat}-${message.id}`] ? (
                          <div className="relative group cursor-pointer">
                            <img
                              src={`data:image/jpeg;base64,${mediaPreviews[`${activeChat}-${message.id}`]}`}
                              alt="Photo"
                              className="max-w-full max-h-[400px] object-contain"
                            />
                            <a
                              href={mediaApi.getDownloadUrl(auth.sessionId!, activeChat, message.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Download size={16} className="text-white" />
                            </a>
                          </div>
                        ) : (
                          <div className="w-[300px] h-[200px] bg-[#1a2836] flex items-center justify-center">
                            <div className="animate-pulse flex items-center gap-2">
                              <Image size={24} className="text-[#3390ec]" />
                              <span className="text-[#6c7883]">Yuklanmoqda...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Video indicator */}
                    {(message.media_type === 'video' || message.media_type === 'video_note') && (
                      <div className="mb-[6px] -mx-[10px] -mt-[6px] rounded-t-lg overflow-hidden">
                        <div className="w-[300px] h-[200px] bg-[#1a2836] flex items-center justify-center relative cursor-pointer group">
                          <div className="w-14 h-14 bg-black/50 rounded-full flex items-center justify-center group-hover:bg-[#3390ec] transition-colors">
                            <Play size={28} className="text-white ml-1" />
                          </div>
                          <a
                            href={auth.sessionId ? mediaApi.getDownloadUrl(auth.sessionId, activeChat!, message.id) : '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download size={16} className="text-white" />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Other media types */}
                    {message.media_type && !['photo', 'video', 'video_note'].includes(message.media_type) && (
                      <div className="flex items-center gap-2 mb-[4px]">
                        {getMediaIcon(message.media_type)}
                        <span className="text-[14px] text-[#6ab2f2]">
                          {message.media_type === 'document' ? (message.media_info || 'Document') :
                           message.media_type === 'voice' ? 'Voice message' :
                           message.media_type === 'audio' ? 'Audio' :
                           message.media_type === 'sticker' ? 'Sticker' :
                           message.media_type}
                        </span>
                        {message.media_type === 'document' && auth.sessionId && (
                          <a
                            href={mediaApi.getDownloadUrl(auth.sessionId, activeChat!, message.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#3390ec] hover:underline text-[13px]"
                          >
                            Yuklab olish
                          </a>
                        )}
                      </div>
                    )}

                    {/* Message text */}
                    {message.text && (
                      <div className="flex items-end gap-2">
                        <p className="text-[15px] text-white whitespace-pre-wrap break-words leading-[21px]">
                          {message.text}
                        </p>
                        <div className="flex items-center gap-1 flex-shrink-0 translate-y-[3px]">
                          {message.is_edited && (
                            <span className="text-[12px] text-[#6c7883]">edited</span>
                          )}
                          <span className="text-[12px] text-[#6c7883]">
                            {format(new Date(message.date), 'HH:mm')}
                          </span>
                          {message.is_outgoing && (
                            <CheckCheck size={16} className="text-[#6ab2f2]" />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Time only for media-only messages */}
                    {!message.text && (
                      <div className="flex items-center justify-end gap-1 mt-1">
                        {message.is_edited && (
                          <span className="text-[12px] text-[#6c7883]">edited</span>
                        )}
                        <span className="text-[12px] text-[#6c7883]">
                          {format(new Date(message.date), 'HH:mm')}
                        </span>
                        {message.is_outgoing && (
                          <CheckCheck size={16} className="text-[#6ab2f2]" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-[#17212b] rounded-lg shadow-2xl py-2 z-50 min-w-[180px] border border-[#232e3c]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              setReplyTo(contextMenu.message);
              closeContextMenu();
            }}
            className="w-full px-4 py-2 text-left text-white hover:bg-[#232e3c] flex items-center gap-3 text-[14px]"
          >
            <Reply size={18} className="text-[#6c7883]" />
            Javob berish
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.message.text || '');
              closeContextMenu();
            }}
            className="w-full px-4 py-2 text-left text-white hover:bg-[#232e3c] flex items-center gap-3 text-[14px]"
          >
            <Copy size={18} className="text-[#6c7883]" />
            Nusxa olish
          </button>
          <button className="w-full px-4 py-2 text-left text-white hover:bg-[#232e3c] flex items-center gap-3 text-[14px]">
            <Pin size={18} className="text-[#6c7883]" />
            Pin qilish
          </button>
          <button className="w-full px-4 py-2 text-left text-white hover:bg-[#232e3c] flex items-center gap-3 text-[14px]">
            <Forward size={18} className="text-[#6c7883]" />
            Forward
          </button>
          {contextMenu.message.is_outgoing && (
            <button
              onClick={() => {
                setEditingMessage(contextMenu.message);
                closeContextMenu();
              }}
              className="w-full px-4 py-2 text-left text-white hover:bg-[#232e3c] flex items-center gap-3 text-[14px]"
            >
              <Pencil size={18} className="text-[#6c7883]" />
              Tahrirlash
            </button>
          )}
          <div className="border-t border-[#232e3c] my-1" />
          <button
            onClick={() => {
              if (activeChat) {
                deleteMessages(activeChat, [contextMenu.message.id]);
              }
              closeContextMenu();
            }}
            className="w-full px-4 py-2 text-left text-[#e53935] hover:bg-[#232e3c] flex items-center gap-3 text-[14px]"
          >
            <Trash2 size={18} />
            O'chirish
          </button>
        </div>
      )}

      {/* Message Input */}
      <MessageInput />
    </div>
  );
};
