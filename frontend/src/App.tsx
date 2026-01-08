import React, { useEffect, useState, useRef } from 'react';
import { useChatStore } from './store/chatStore';
import { useWebSocket } from './hooks/useWebSocket';
import { useTelegram } from './hooks/useTelegram';
import { LoginForm } from './components/LoginForm';
import { ChatList } from './components/ChatList';
import { ChatWindow } from './components/ChatWindow';

const App: React.FC = () => {
  const { auth, clearAuth } = useChatStore();
  const { restoreSession } = useTelegram();
  const [isInitializing, setIsInitializing] = useState(true);
  const initRef = useRef(false);

  // Restore session on app load
  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      // If we have a sessionString, restore the session
      if (auth.sessionString) {
        console.log('Found session, restoring...');
        const success = await restoreSession();
        if (!success) {
          console.log('Session restore failed, clearing auth');
          clearAuth();
        } else {
          console.log('Session restored successfully');
        }
      }
      setIsInitializing(false);
    };

    // Small delay to ensure zustand hydration is complete
    setTimeout(init, 100);
  }, []);

  // Initialize WebSocket when authenticated
  useWebSocket();

  // Show loading only on initial load
  if (isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0e1621]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#3390ec] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#6c7883]">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!auth.isAuthenticated) {
    return <LoginForm />;
  }

  // Show main app
  return (
    <div className="h-screen flex bg-telegram-bg-darker text-white">
      <ChatList />
      <ChatWindow />
    </div>
  );
};

export default App;
