import React, { useEffect, useState } from 'react';
import { useChatStore } from './store/chatStore';
import { useWebSocket } from './hooks/useWebSocket';
import { useTelegram } from './hooks/useTelegram';
import { LoginForm } from './components/LoginForm';
import { ChatList } from './components/ChatList';
import { ChatWindow } from './components/ChatWindow';

const App: React.FC = () => {
  const { auth } = useChatStore();
  const { restoreSession } = useTelegram();
  const [isRestoring, setIsRestoring] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);

  // Restore session on app load
  useEffect(() => {
    const restore = async () => {
      if (auth.sessionString) {
        const success = await restoreSession();
        setSessionReady(success);
      }
      setIsRestoring(false);
    };
    restore();
  }, []); // Run only once on mount

  // Initialize WebSocket when authenticated and session is ready
  useWebSocket();

  // Show loading while restoring session
  if (isRestoring) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0e1621]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#3390ec] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#6c7883]">Sessiya tiklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div className="h-screen flex bg-telegram-bg-darker text-white">
      <ChatList />
      <ChatWindow />
    </div>
  );
};

export default App;
