import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  vulnerabilities?: any[];
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  runId?: string;
  status?: 'uploading' | 'analyzing' | 'completed' | 'error';
}

interface ChatContextType {
  messages: Message[];
  uploadedFiles: UploadedFile[];
  currentThreadId: string | null;
  isLoading: boolean;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  addUploadedFile: (file: UploadedFile) => void;
  setCurrentThreadId: (threadId: string | null) => void;
  setLoading: (loading: boolean) => void;
  clearChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const addUploadedFile = (file: UploadedFile) => {
    setUploadedFiles(prev => [...prev, file]);
  };

  const setLoading = (loading: boolean) => {
    setIsLoading(loading);
  };

  const clearChat = () => {
    setMessages([]);
    setUploadedFiles([]);
    setCurrentThreadId(null);
  };

  return (
    <ChatContext.Provider value={{
      messages,
      uploadedFiles,
      currentThreadId,
      isLoading,
      addMessage,
      addUploadedFile,
      setCurrentThreadId,
      setLoading,
      clearChat,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
