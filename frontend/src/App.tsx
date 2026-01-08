import React from 'react';
import { useChatStore } from './store/chatStore';
import { useWebSocket } from './hooks/useWebSocket';
import { LoginForm } from './components/LoginForm';
import { ChatList } from './components/ChatList';
import { ChatWindow } from './components/ChatWindow';

const App: React.FC = () => {
  const { auth } = useChatStore();

  // Initialize WebSocket when authenticated
  useWebSocket();

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
