import React, { useEffect, useState, useMemo } from 'react';
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
  X,
  User,
  MessageCircle,
  Megaphone
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

type FilterTab = 'all' | 'users' | 'groups' | 'channels';

export const ChatList: React.FC = () => {
  const { dialogs, contacts, activeChat, setActiveChat, auth, avatars } = useChatStore();
  const { loadDialogs, loadContacts, loadAvatars, logout } = useTelegram();
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  useEffect(() => {
    if (auth.isAuthenticated) {
      loadDialogs();
      loadContacts();
    }
  }, [auth.isAuthenticated, loadDialogs, loadContacts]);

  // Load avatars after dialogs are loaded
  useEffect(() => {
    if (dialogs.length > 0 && auth.isAuthenticated) {
      loadAvatars(dialogs.map(d => d.id));
    }
  }, [dialogs.length, auth.isAuthenticated, loadAvatars]);

  // Load avatars for contacts
  useEffect(() => {
    if (contacts.length > 0 && auth.isAuthenticated) {
      loadAvatars(contacts.map(c => c.id));
    }
  }, [contacts.length, auth.isAuthenticated, loadAvatars]);

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

  // Filter dialogs based on active tab and search query
  const filteredDialogs = useMemo(() => {
    let filtered = dialogs;

    // Filter by tab
    switch (activeTab) {
      case 'users':
        // Use contacts list for users tab
        filtered = contacts;
        break;
      case 'groups':
        filtered = dialogs.filter(d => d.type === 'group' || d.type === 'supergroup');
        break;
      case 'channels':
        filtered = dialogs.filter(d => d.type === 'channel');
        break;
      default:
        break;
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(d =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [dialogs, contacts, activeTab, searchQuery]);

  // Count by type
  const counts = useMemo(() => ({
    all: dialogs.length,
    users: contacts.length,
    groups: dialogs.filter(d => d.type === 'group' || d.type === 'supergroup').length,
    channels: dialogs.filter(d => d.type === 'channel').length,
  }), [dialogs, contacts]);

  const tabs: { key: FilterTab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'all', label: 'Hammasi', icon: <MessageCircle size={18} />, count: counts.all },
    { key: 'users', label: 'Kontaktlar', icon: <User size={18} />, count: counts.users },
    { key: 'groups', label: 'Guruhlar', icon: <Users size={18} />, count: counts.groups },
    { key: 'channels', label: 'Kanallar', icon: <Megaphone size={18} />, count: counts.channels },
  ];

  return (
    <div className="w-[320px] h-full bg-[#17212b] flex flex-col border-r border-[#0e1621]">
      {/* Header */}
      <div className="h-[56px] flex items-center px-3 gap-2 flex-shrink-0">
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

      {/* Tabs */}
      <div className="flex border-b border-[#232e3c] flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 px-2 flex flex-col items-center gap-1 transition-colors relative ${
              activeTab === tab.key
                ? 'text-[#3390ec]'
                : 'text-[#6c7883] hover:text-white'
            }`}
          >
            {tab.icon}
            <span className="text-[11px] font-medium">{tab.label}</span>
            {tab.count > 0 && (
              <span className={`absolute top-1 right-2 text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full ${
                activeTab === tab.key ? 'bg-[#3390ec] text-white' : 'bg-[#232e3c] text-[#6c7883]'
              }`}>
                {tab.count > 99 ? '99+' : tab.count}
              </span>
            )}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#3390ec]" />
            )}
          </button>
        ))}
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
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium text-lg overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${getAvatarGradient(auth.user?.id || 0)[0]}, ${getAvatarGradient(auth.user?.id || 0)[1]})`
                  }}
                >
                  {auth.user?.id && avatars[auth.user.id] ? (
                    <img
                      src={`data:image/jpeg;base64,${avatars[auth.user.id]}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    auth.user?.first_name?.charAt(0).toUpperCase()
                  )}
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
          const avatarUrl = avatars[dialog.id];

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
                  className="w-[54px] h-[54px] rounded-full flex items-center justify-center text-white font-medium text-xl flex-shrink-0 overflow-hidden"
                  style={{
                    background: avatarUrl
                      ? undefined
                      : `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`
                  }}
                >
                  {avatarUrl ? (
                    <img
                      src={`data:image/jpeg;base64,${avatarUrl}`}
                      alt={dialog.name}
                      className="w-full h-full object-cover"
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
                      {activeTab === 'users' && dialog.status ? (
                        <span className={dialog.status === 'online' ? 'text-[#3390ec]' : ''}>
                          {dialog.status === 'online' ? 'online' : dialog.status}
                        </span>
                      ) : (dialog.type === 'supergroup' || dialog.type === 'group') && dialog.members_count ? (
                        `${dialog.members_count.toLocaleString()} a'zo`
                      ) : dialog.type === 'channel' && dialog.members_count ? (
                        `${dialog.members_count.toLocaleString()} obunachi`
                      ) : (
                        dialog.last_message || 'Xabar yo\'q'
                      )}
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
            {searchQuery ? 'Hech narsa topilmadi' :
             activeTab === 'users' ? 'Kontaktlar yo\'q' :
             activeTab === 'groups' ? 'Guruhlar yo\'q' :
             activeTab === 'channels' ? 'Kanallar yo\'q' :
             'Chatlar yo\'q'}
          </div>
        )}
      </div>
    </div>
  );
};
