
import { useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import ChatInterface from '@/components/ChatInterface';
import ChatSidebar from '@/components/ChatSidebar';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft } from 'lucide-react';

const Chat = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-gray-50">
      {/* Main Chat Interface - 70% width */}
      <div className="flex-1 flex flex-col bg-white">
        <ChatInterface />
      </div>

      {/* Sidebar Toggle */}
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="h-full rounded-none border-l px-2"
        >
          {sidebarOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Right Sidebar - 30% width, collapsible */}
      <div className={`transition-all duration-300 bg-gray-50 border-l ${sidebarOpen ? 'w-80' : 'w-0 overflow-hidden'}`}>
        {sidebarOpen && <ChatSidebar />}
      </div>
    </div>
  );
};

export default Chat;
