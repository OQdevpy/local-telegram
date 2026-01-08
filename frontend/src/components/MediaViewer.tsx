import React, { useState, useEffect } from 'react';
import { X, Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { mediaApi } from '../services/api';
import { useChatStore } from '../store/chatStore';

interface MediaViewerProps {
  chatId: number;
  messageId: number;
  mediaType: string;
  onClose: () => void;
}

export const MediaViewer: React.FC<MediaViewerProps> = ({
  chatId,
  messageId,
  mediaType,
  onClose,
}) => {
  const { auth } = useChatStore();
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPreview = async () => {
      if (!auth.sessionId) return;

      setLoading(true);
      setError(null);

      try {
        const result = await mediaApi.getPreview(auth.sessionId, chatId, messageId);
        setPreview(`data:${result.type};base64,${result.preview}`);
      } catch (err) {
        setError('Failed to load preview');
        console.error('Failed to load preview:', err);
      } finally {
        setLoading(false);
      }
    };

    if (mediaType === 'photo' || mediaType === 'video') {
      loadPreview();
    }
  }, [auth.sessionId, chatId, messageId, mediaType]);

  const handleDownload = () => {
    if (!auth.sessionId) return;
    const url = mediaApi.getDownloadUrl(auth.sessionId, chatId, messageId);
    window.open(url, '_blank');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent">
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <X size={24} className="text-white" />
        </button>
        <button
          onClick={handleDownload}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <Download size={24} className="text-white" />
        </button>
      </div>

      {/* Content */}
      <div
        className="max-w-4xl max-h-[80vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <Loader2 size={48} className="text-white animate-spin" />
        ) : error ? (
          <div className="text-white text-center">
            <p className="text-lg mb-2">{error}</p>
            <button
              onClick={handleDownload}
              className="bg-telegram-blue hover:bg-telegram-blue-dark px-4 py-2 rounded-lg transition-colors"
            >
              Download instead
            </button>
          </div>
        ) : preview ? (
          mediaType === 'photo' ? (
            <img
              src={preview}
              alt="Media preview"
              className="max-w-full max-h-[80vh] object-contain"
            />
          ) : mediaType === 'video' ? (
            <video
              src={preview}
              controls
              autoPlay
              className="max-w-full max-h-[80vh]"
            />
          ) : null
        ) : (
          <div className="text-white text-center">
            <p className="text-lg mb-2">Preview not available</p>
            <button
              onClick={handleDownload}
              className="bg-telegram-blue hover:bg-telegram-blue-dark px-4 py-2 rounded-lg transition-colors"
            >
              Download file
            </button>
          </div>
        )}
      </div>

      {/* Navigation hints */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-white/50 text-sm">
        Press ESC to close
      </div>
    </div>
  );
};
