import React, { createContext, useContext, useState, useEffect } from 'react';
import { Conversation, Property } from '../types';
import { INITIAL_CONVERSATIONS } from '../lib/mockData';
import { 
  fetchConversationsFromSupabase,
  insertMessageToSupabase,
  deleteConversationFromSupabase
} from '../lib/supabaseCrud';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { Toast, AppView } from './appTypes';
import { UserProfile } from '../types';

export interface ChatContextType {
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  sendMessage: (conversationId: string, text: string) => Promise<void>;
  startOrOpenConversation: (propertyId: string) => void;
  deleteConversation: (conversationId: string) => Promise<void>;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  refreshConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{
  children: React.ReactNode;
  currentUser: UserProfile;
  properties: Property[];
  setCurrentView: (view: AppView) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
}> = ({ children, currentUser, properties, setCurrentView, addToast }) => {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('imovelhub_conversations');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return INITIAL_CONVERSATIONS;
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('imovelhub_conversations', JSON.stringify(conversations));
  }, [conversations]);

  const refreshConversations = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const remoteConvs = await fetchConversationsFromSupabase(currentUser.id);
      if (remoteConvs && remoteConvs.length > 0) {
        setConversations(remoteConvs);
      }
    } catch (e) {
      console.warn('Error fetching conversations from Supabase:', e);
    }
  };

  const sendMessage = async (conversationId: string, text: string) => {
    if (!text.trim()) return;
    const now = new Date().toISOString();
    const newMsg = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatarUrl,
      text,
      createdAt: now,
      read: true
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id === conversationId) {
        return {
          ...conv,
          lastMessage: text,
          lastMessageTime: 'Agora',
          messages: [...conv.messages, newMsg]
        };
      }
      return conv;
    }));

    if (isSupabaseConfigured) {
      await insertMessageToSupabase(newMsg, conversationId);
    }
  };

  const startOrOpenConversation = (propertyId: string) => {
    const prop = properties.find(p => p.id === propertyId);
    if (!prop) return;

    const conv = conversations.find(c => c.propertyId === propertyId);
    if (!conv) {
      const convId = `conv-${Date.now()}`;
      const firstMsg = {
        id: `msg-${Date.now()}`,
        conversationId: convId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatarUrl,
        text: `Olá! Tenho interesse no imóvel ${prop.code} (${prop.title}). Poderia me passar mais informações?`,
        createdAt: new Date().toISOString(),
        read: true
      };

      const newConv: Conversation = {
        id: convId,
        propertyId: prop.id,
        propertyTitle: prop.title,
        propertyImage: prop.media[0]?.thumbnailUrl || prop.media[0]?.url,
        propertyPrice: prop.price,
        otherUser: prop.advertiser,
        lastMessage: 'Conversa iniciada',
        lastMessageTime: 'Hoje',
        unreadCount: 0,
        messages: [firstMsg]
      };

      setConversations(prev => [newConv, ...prev]);
      setActiveConversationId(newConv.id);

      if (isSupabaseConfigured) {
        insertMessageToSupabase(firstMsg, convId);
      }
    } else {
      setActiveConversationId(conv.id);
    }
    setCurrentView('messages');
  };

  const deleteConversation = async (conversationId: string) => {
    setConversations(prev => {
      const remaining = prev.filter(c => c.id !== conversationId);
      if (activeConversationId === conversationId) {
        setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
      }
      return remaining;
    });

    if (isSupabaseConfigured) {
      await deleteConversationFromSupabase(conversationId);
    }

    addToast({ type: 'info', title: 'Conversa excluída com sucesso' });
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversationId,
        setActiveConversationId,
        sendMessage,
        startOrOpenConversation,
        deleteConversation,
        setConversations,
        refreshConversations
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
