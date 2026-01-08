import React, { useEffect, useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { useTelegram } from '../hooks/useTelegram';
import { format, isToday, isYesterday } from 'date-fns';
import {
  Search,
  Users,
  Radio,
  LogOut,
  Menu,
  Settings,
  Moon,
  Bookmark,
  HelpCircle,
  X
} from 'lucide-react';

// Avatar gradient colors - Telegram style
const avatarColors = [
  ['#FF885E', '#FF516A'], // red-orange
  ['#FFCD6A', '#FFA85C'], // orange
  ['#82B1FF', '#665FFF'], // blue-purple
  ['#A0DE7E', '#54CB68'], // green
  ['#53EDD6', '#28C9B7'], // teal
  ['#72D5FD', '#2A9EF1'], // light blue
  ['#E0A2F3', '#D669ED'], // purple-pink
];

const getAvatarGradient = (id: number) => {
  const index = Math.abs(id) % avatarColors.length;
  return avatarColors[index];
};

export const ChatList: React.FC = () => {
  const { dialogs, activeChat, setActiveChat, auth } = useChatStore();
  const { loadDialogs, logout } = useTelegram();
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (auth.isAuthenticated) {
      loadDialogs();
    }
  }, [auth.isAuthenticated, loadDialogs]);

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Kecha';
    } else {
      return format(date, 'dd.MM.yy');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'group':
      case 'supergroup':
        return <Users size={14} className="text-gray-400" />;
      case 'channel':
        return <Radio size={14} className="text-gray-400" />;
      default:
        return null;
    }
  };

  const filteredDialogs = dialogs.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-[320px] h-full bg-[#17212b] flex flex-col border-r border-[#0e1621]">
      {/* Header */}
      <div className="h-[56px] flex items-center px-3 gap-2">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-10 h-10 flex items-center justify-center hover:bg-[#232e3c] rounded-full transition-colors"
        >
          {showMenu ? (
            <X size={22} className="text-gray-400" />
          ) : (
            <Menu size={22} className="text-gray-400" />
          )}
        </button>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#242f3d] text-white pl-10 pr-4 py-[9px] rounded-[22px] text-[15px] focus:outline-none placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Menu dropdown */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute top-[56px] left-0 w-[280px] bg-[#17212b] rounded-lg shadow-2xl z-50 py-2 border border-[#232e3c]">
            <div className="px-4 py-3 border-b border-[#232e3c]">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium text-lg"
                  style={{
                    background: `linear-gradient(135deg, ${getAvatarGradient(auth.user?.id || 0)[0]}, ${getAvatarGradient(auth.user?.id || 0)[1]})`
                  }}
                >
                  {auth.user?.first_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-medium">
                    {auth.user?.first_name} {auth.user?.last_name}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {auth.user?.phone || `@${auth.user?.username}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="py-1">
              <button className="w-full px-4 py-2.5 text-left text-white hover:bg-[#232e3c] flex items-center gap-4">
                <Bookmark size={20} className="text-gray-400" />
                <span>Saqlangan xabarlar</span>
              </button>
              <button className="w-full px-4 py-2.5 text-left text-white hover:bg-[#232e3c] flex items-center gap-4">
                <Settings size={20} className="text-gray-400" />
                <span>Sozlamalar</span>
              </button>
              <button className="w-full px-4 py-2.5 text-left text-white hover:bg-[#232e3c] flex items-center gap-4">
                <Moon size={20} className="text-gray-400" />
                <span>Tungi rejim</span>
              </button>
              <button className="w-full px-4 py-2.5 text-left text-white hover:bg-[#232e3c] flex items-center gap-4">
                <HelpCircle size={20} className="text-gray-400" />
                <span>Yordam</span>
              </button>
            </div>

            <div className="border-t border-[#232e3c] pt-1">
              <button
                onClick={() => {
                  logout();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2.5 text-left text-red-400 hover:bg-[#232e3c] flex items-center gap-4"
              >
                <LogOut size={20} />
                <span>Chiqish</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Dialog list */}
      <div className="flex-1 overflow-y-auto">
        {filteredDialogs.map((dialog) => {
          const gradient = getAvatarGradient(dialog.id);
          const isActive = activeChat === dialog.id;

          return (
            <div
              key={dialog.id}
              onClick={() => setActiveChat(dialog.id)}
              className={`h-[72px] px-2 cursor-pointer transition-colors ${
                isActive
                  ? 'bg-[#2b5278]'
                  : 'hover:bg-[#202b36]'
              }`}
            >
              <div className="h-full flex items-center gap-3 px-2">
                {/* Avatar */}
                <div
                  className="w-[54px] h-[54px] rounded-full flex items-center justify-center text-white font-medium text-xl flex-shrink-0"
                  style={{
                    background: dialog.avatar
                      ? undefined
                      : `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`
                  }}
                >
                  {dialog.avatar ? (
                    <img
                      src={`data:image/jpeg;base64,${dialog.avatar}`}
                      alt={dialog.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span>{dialog.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {getTypeIcon(dialog.type)}
                      <span className={`font-medium truncate ${isActive ? 'text-white' : 'text-white'}`}>
                        {dialog.name}
                      </span>
                    </div>
                    <span className={`text-xs flex-shrink-0 ml-2 ${
                      isActive ? 'text-[#7eb8e7]' : 'text-gray-500'
                    }`}>
                      {formatDate(dialog.last_message_date)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-[14px] truncate ${
                      isActive ? 'text-[#a0c5dd]' : 'text-gray-400'
                    }`}>
                      {dialog.last_message || 'Xabar yo\'q'}
                    </p>
                    {dialog.unread_count > 0 && (
                      <span className={`min-w-[22px] h-[22px] flex items-center justify-center rounded-full text-xs font-medium flex-shrink-0 ml-2 ${
                        dialog.is_muted
                          ? 'bg-gray-600 text-gray-300'
                          : 'bg-[#3390ec] text-white'
                      }`}>
                        {dialog.unread_count > 99 ? '99+' : dialog.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredDialogs.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            {searchQuery ? 'Hech narsa topilmadi' : 'Chatlar yo\'q'}
          </div>
        )}
      </div>
    </div>
  );
};
