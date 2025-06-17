import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatLogger } from '@/lib/chatLogger';

interface DependencyGraphNode {
  id: string;
  label: string;
  version?: string;
  ecosystem: string;
  hasVulnerabilities: boolean;
  vulnerabilityCount: number;
}

interface DependencyGraphEdge {
  from: string;
  to: string;
  label: string;
  relationship: string;
}

interface DependencyGraphData {
  nodes: DependencyGraphNode[];
  edges: DependencyGraphEdge[];
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  vulnerabilities?: any[];
  totalVulnerabilities?: number;
  dependencyGraph?: DependencyGraphData;
  useMarkdown?: boolean;
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
  sessionId: string;
  messageIndex: number;
  isLoading: boolean;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  addUploadedFile: (file: UploadedFile) => void;
  setCurrentThreadId: (threadId: string | null) => void;
  setLoading: (loading: boolean) => void;
  clearChat: () => void;
  logChatMessage: (
    messageType: 'user' | 'assistant' | 'file_upload',
    userMessage?: string,
    aiResponse?: string,
    fileName?: string,
    fileSize?: number,
    vulnerabilityCount?: number
  ) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [sessionId] = useState<string>(() => uuidv4());
  const [messageIndex, setMessageIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize session on component mount
  useEffect(() => {
    const initSession = async () => {
      await ChatLogger.initializeSession(sessionId);
    };
    initSession();
  }, [sessionId]);

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    setMessageIndex(prev => prev + 1);
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
    setMessageIndex(0);
  };

  const logChatMessage = async (
    messageType: 'user' | 'assistant' | 'file_upload',
    userMessage?: string,
    aiResponse?: string,
    fileName?: string,
    fileSize?: number,
    vulnerabilityCount?: number
  ) => {
    try {
      await ChatLogger.logMessage({
        sessionId,
        threadId: currentThreadId,
        messageIndex,
        messageType,
        userMessage,
        aiResponse,
        fileName,
        fileSize,
        vulnerabilityCount,
      });
    } catch (error) {
      console.error('Error logging chat message:', error);
    }
  };

  return (
    <ChatContext.Provider value={{
      messages,
      uploadedFiles,
      currentThreadId,
      sessionId,
      messageIndex,
      isLoading,
      addMessage,
      addUploadedFile,
      setCurrentThreadId,
      setLoading,
      clearChat,
      logChatMessage,
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
