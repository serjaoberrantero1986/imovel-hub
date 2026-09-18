import React, { createContext, useContext, useState, useEffect } from 'react';
import { Conversation, Property } from '../types';
import { 
  fetchConversationsFromSupabase,
  insertConversationToSupabase,
  insertMessageToSupabase,
  deleteConversationFromSupabase,
  markConversationAsReadInSupabase
} from '../lib/supabaseCrud';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { Toast, AppView } from './appTypes';
import { UserProfile } from '../types';

export interface ChatContextType {
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  markAsRead: (conversationId: string) => Promise<void>;
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
  isAuthenticated?: boolean;
  openAuthModal?: (tab?: 'login' | 'signup' | 'forgot') => void;
  properties: Property[];
  setCurrentView: (view: AppView) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
}> = ({ children, currentUser, isAuthenticated = false, openAuthModal, properties, setCurrentView, addToast }) => {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    if (!isAuthenticated || currentUser.id === 'guest_buyer') {
      return [];
    }
    const storageKey = `imovelhub_conversations_${currentUser.id}`;
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Keep active conversation aligned
  useEffect(() => {
    if (conversations.length > 0) {
      if (!activeConversationId || !conversations.some(c => c.id === activeConversationId)) {
        setActiveConversationId(conversations[0].id);
      }
    } else {
      setActiveConversationId(null);
    }
  }, [conversations, activeConversationId]);

  const markAsRead = async (conversationId: string) => {
    if (!conversationId || !isAuthenticated || currentUser.id === 'guest_buyer') return;

    setConversations(prev => {
      let hasChanges = false;
      const updated = prev.map(c => {
        if (c.id === conversationId && (c.unreadCount > 0 || c.messages.some(m => !m.read))) {
          hasChanges = true;
          return {
            ...c,
            unreadCount: 0,
            messages: c.messages.map(m => ({ ...m, read: true }))
          };
        }
        return c;
      });

      if (hasChanges) {
        localStorage.setItem(`imovelhub_conversations_${currentUser.id}`, JSON.stringify(updated));
        return updated;
      }
      return prev;
    });

    if (isSupabaseConfigured) {
      await markConversationAsReadInSupabase(conversationId, currentUser.id);
    }
  };

  // Mark active conversation as read when selected or loaded
  useEffect(() => {
    if (!activeConversationId || !isAuthenticated || currentUser.id === 'guest_buyer') return;
    markAsRead(activeConversationId);
  }, [activeConversationId, isAuthenticated, currentUser.id]);

  // Sync state when user switches or logs in/out, and listen to lead events & periodic polling
  useEffect(() => {
    if (isAuthenticated && currentUser.id !== 'guest_buyer') {
      const storageKey = `imovelhub_conversations_${currentUser.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        try {
          const parsed = JSON.parse(saved);
          setConversations(Array.isArray(parsed) ? parsed : []);
        } catch {
          setConversations([]);
        }
      } else {
        setConversations([]);
      }
      refreshConversations();

      // Poll periodically (every 12 seconds) so badges refresh automatically if a lead arrives
      const pollTimer = setInterval(() => {
        refreshConversations();
      }, 12000);

      const handleLeadEvent = () => {
        refreshConversations();
      };
      window.addEventListener('imovelhub_lead_submitted', handleLeadEvent);

      return () => {
        clearInterval(pollTimer);
        window.removeEventListener('imovelhub_lead_submitted', handleLeadEvent);
      };
    } else {
      setConversations([]);
      setActiveConversationId(null);
    }
  }, [currentUser.id, isAuthenticated]);

  const refreshConversations = async () => {
    if (!isSupabaseConfigured || !isAuthenticated || currentUser.id === 'guest_buyer') return;
    try {
      const remoteConvs = await fetchConversationsFromSupabase(currentUser.id);
      if (remoteConvs !== null) {
        // If an active conversation is open, preserve unreadCount = 0 so polling doesn't reset it
        const sanitized = remoteConvs.map(c => {
          if (c.id === activeConversationId) {
            return {
              ...c,
              unreadCount: 0,
              messages: c.messages.map(m => ({ ...m, read: true }))
            };
          }
          return c;
        });

        setConversations(sanitized);
        localStorage.setItem(`imovelhub_conversations_${currentUser.id}`, JSON.stringify(sanitized));
      }
    } catch (e) {
      console.warn('Error fetching conversations from Supabase:', e);
    }
  };

  const sendMessage = async (conversationId: string, text: string) => {
    if (!text.trim()) return;
    if (!isAuthenticated || currentUser.id === 'guest_buyer') {
      addToast({
        type: 'warning',
        title: 'Login Necessário',
        message: 'Faça login na sua conta para enviar mensagens.'
      });
      if (openAuthModal) {
        openAuthModal('login');
      }
      return;
    }

    const now = new Date().toISOString();
    const msgId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `msg-${Date.now()}`;
    const newMsg = {
      id: msgId,
      conversationId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatarUrl,
      text,
      createdAt: now,
      read: true
    };

    const nextConversations = conversations.map(conv => {
      if (conv.id === conversationId) {
        return {
          ...conv,
          lastMessage: text,
          lastMessageTime: 'Agora',
          messages: [...conv.messages, newMsg]
        };
      }
      return conv;
    });

    setConversations(nextConversations);
    localStorage.setItem(`imovelhub_conversations_${currentUser.id}`, JSON.stringify(nextConversations));

    if (isSupabaseConfigured) {
      await insertMessageToSupabase(newMsg, conversationId);
    }
  };

  const startOrOpenConversation = (propertyId: string) => {
    if (!isAuthenticated || currentUser.id === 'guest_buyer') {
      addToast({
        type: 'warning',
        title: 'Login Necessário',
        message: 'Faça login na sua conta para iniciar uma conversa com o anunciante.'
      });
      if (openAuthModal) {
        openAuthModal('login');
      }
      return;
    }

    const prop = properties.find(p => p.id === propertyId);
    if (!prop) return;

    const conv = conversations.find(c => c.propertyId === propertyId);
    if (!conv) {
      const convId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `conv-${Date.now()}`;
      const msgId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `msg-${Date.now()}`;
      const firstMsg = {
        id: msgId,
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

      const nextConversations = [newConv, ...conversations];
      setConversations(nextConversations);
      setActiveConversationId(newConv.id);
      localStorage.setItem(`imovelhub_conversations_${currentUser.id}`, JSON.stringify(nextConversations));

      if (isSupabaseConfigured) {
        insertConversationToSupabase({
          id: convId,
          propertyId: prop.id,
          buyerId: currentUser.id,
          advertiserId: prop.advertiser?.id || prop.userId,
          lastMessageText: firstMsg.text
        }).then(() => {
          insertMessageToSupabase(firstMsg, convId);
        });
      }
    } else {
      setActiveConversationId(conv.id);
    }
    setCurrentView('messages');
  };

  const deleteConversation = async (conversationId: string) => {
    if (!isAuthenticated || currentUser.id === 'guest_buyer') {
      return;
    }

    const remaining = conversations.filter(c => c.id !== conversationId);
    setConversations(remaining);
    localStorage.setItem(`imovelhub_conversations_${currentUser.id}`, JSON.stringify(remaining));

    if (activeConversationId === conversationId) {
      setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
    }

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
        markAsRead,
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
