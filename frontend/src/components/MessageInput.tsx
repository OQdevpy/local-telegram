import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../store/chatStore';
import { useTelegram } from '../hooks/useTelegram';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  Paperclip,
  Smile,
  Send,
  Mic,
  X,
  Image,
  FileText,
  Pencil,
} from 'lucide-react';

// Sender name colors for reply preview
const senderColors = [
  '#FC5C51', '#FA790F', '#895DD5', '#0FB297',
  '#00A1C4', '#4FABE9', '#B761E5', '#3DAEE9',
];

const getSenderColor = (id: number) => {
  const index = Math.abs(id) % senderColors.length;
  return senderColors[index];
};

export const MessageInput: React.FC = () => {
  const {
    activeChat,
    replyTo,
    setReplyTo,
    editingMessage,
    setEditingMessage,
    addMessage,
    updateMessage,
  } = useChatStore();
  const { sendMessage, editMessage, uploadFile } = useTelegram();
  const { startTyping } = useWebSocket();

  const [text, setText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text || '');
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  useEffect(() => {
    setText('');
    setReplyTo(null);
    setEditingMessage(null);
  }, [activeChat, setReplyTo, setEditingMessage]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }

    if (activeChat) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      startTyping(activeChat);
      typingTimeoutRef.current = setTimeout(() => {}, 3000);
    }
  };

  const handleSend = async () => {
    console.log('handleSend called:', { text: text.trim(), activeChat });

    if (!text.trim() || !activeChat) {
      console.log('handleSend: early return - no text or activeChat');
      return;
    }

    const messageText = text.trim();
    setText('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    if (editingMessage) {
      const result = await editMessage(activeChat, editingMessage.id, messageText);
      if (result) {
        updateMessage(activeChat, result);
      }
      setEditingMessage(null);
    } else {
      const result = await sendMessage(
        activeChat,
        messageText,
        replyTo?.id
      );
      if (result) {
        addMessage(activeChat, result);
      }
      setReplyTo(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setReplyTo(null);
      setEditingMessage(null);
      setText('');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;

    setIsUploading(true);
    setShowAttachMenu(false);
    try {
      const result = await uploadFile(activeChat, file, undefined, replyTo?.id);
      if (result) {
        addMessage(activeChat, result);
      }
      setReplyTo(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const cancelAction = () => {
    setReplyTo(null);
    setEditingMessage(null);
    setText('');
  };

  if (!activeChat) return null;

  const senderColor = replyTo?.sender_id ? getSenderColor(replyTo.sender_id) : '#6ab2f2';

  return (
    <div className="bg-[#17212b] border-t border-[#101921]">
      {/* Reply/Edit preview */}
      {(replyTo || editingMessage) && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-[#101921]">
          <div
            className="w-[3px] h-[38px] rounded-full"
            style={{ backgroundColor: editingMessage ? '#6ab2f2' : senderColor }}
          />
          <div className="flex-1 min-w-0">
            <p
              className="text-[14px] font-medium"
              style={{ color: editingMessage ? '#6ab2f2' : senderColor }}
            >
              {editingMessage ? (
                <span className="flex items-center gap-1">
                  <Pencil size={14} />
                  Tahrirlash
                </span>
              ) : (
                replyTo?.sender_name || 'Xabar'
              )}
            </p>
            <p className="text-[14px] text-[#6c7883] truncate">
              {editingMessage?.text || replyTo?.text || (replyTo?.media_type ? `[${replyTo.media_type}]` : '')}
            </p>
          </div>
          <button
            onClick={cancelAction}
            className="w-8 h-8 flex items-center justify-center hover:bg-[#232e3c] rounded-full"
          >
            <X size={20} className="text-[#6c7883]" />
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-1 p-2 relative">
        {/* Attach button */}
        <div className="relative">
          <button
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            disabled={isUploading}
            className="w-10 h-10 flex items-center justify-center hover:bg-[#232e3c] rounded-full transition-colors disabled:opacity-50"
          >
            <Paperclip
              size={22}
              className={`text-[#6c7883] ${isUploading ? 'animate-pulse' : ''}`}
            />
          </button>

          {/* Attach menu */}
          {showAttachMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowAttachMenu(false)}
              />
              <div className="absolute bottom-12 left-0 bg-[#17212b] rounded-lg shadow-2xl py-2 z-50 min-w-[180px] border border-[#232e3c]">
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full px-4 py-2.5 text-left text-white hover:bg-[#232e3c] flex items-center gap-3 text-[14px]"
                >
                  <Image size={20} className="text-[#6ab2f2]" />
                  Rasm yoki video
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-2.5 text-left text-white hover:bg-[#232e3c] flex items-center gap-3 text-[14px]"
                >
                  <FileText size={20} className="text-[#8774e1]" />
                  Fayl
                </button>
              </div>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Text input */}
        <div className="flex-1 bg-[#242f3d] rounded-[20px] flex items-end min-h-[44px]">
          <button className="w-10 h-11 flex items-center justify-center flex-shrink-0">
            <Smile size={22} className="text-[#6c7883]" />
          </button>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Xabar yozing..."
            className="flex-1 bg-transparent text-white py-[11px] pr-3 resize-none focus:outline-none max-h-[150px] text-[15px] placeholder:text-[#6c7883] leading-[22px]"
            rows={1}
          />
        </div>

        {/* Send/Mic button */}
        <button
          onClick={text.trim() ? handleSend : undefined}
          className="w-10 h-10 flex items-center justify-center hover:bg-[#232e3c] rounded-full transition-colors"
        >
          {text.trim() ? (
            <Send size={22} className="text-[#6ab2f2]" />
          ) : (
            <Mic size={22} className="text-[#6c7883]" />
          )}
        </button>
      </div>
    </div>
  );
};
