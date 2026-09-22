import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Conversation, Property } from '../types';
import { 
  fetchConversationsFromSupabase,
  insertConversationToSupabase,
  insertMessageToSupabase,
  deleteConversationFromSupabase,
  markConversationAsReadInSupabase
} from '../lib/supabaseCrud';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
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
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const previousUnreadCount = useRef<number | null>(null);
  const refreshVersion = useRef(0);
  const sessionUserId = useRef(currentUser.id);
  sessionUserId.current = currentUser.id;

  const playNotificationSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const context = new AudioCtx();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.24);
    } catch {}
  };

  useEffect(() => {
    const unread = conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);
    if (previousUnreadCount.current !== null && unread > previousUnreadCount.current) playNotificationSound();
    previousUnreadCount.current = unread;
  }, [conversations]);

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
    if (!await markConversationAsReadInSupabase(conversationId, currentUser.id)) return;
    if (sessionUserId.current !== currentUser.id) return;
    refreshVersion.current++;

    setConversations(prev => {
      let hasChanges = false;
      const updated = prev.map(c => {
        if (c.id === conversationId && (c.unreadCount > 0 || c.messages.some(m => !m.read))) {
          hasChanges = true;
          return {
            ...c,
            unreadCount: 0,
            messages: c.messages.map(m => m.senderId !== currentUser.id ? { ...m, read: true } : m)
          };
        }
        return c;
      });

      if (hasChanges) return updated;
      return prev;
    });

  };

  // Sync state when user switches or logs in/out, and listen to lead events & periodic polling
  useEffect(() => {
    if (isAuthenticated && currentUser.id !== 'guest_buyer') {
      setConversations([]);
      refreshConversations();

      // Keep a short polling fallback for browsers that do not receive Realtime events.
      const pollTimer = setInterval(() => {
        refreshConversations();
      }, 5000);
      const channel = supabase?.channel(`messages-${currentUser.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, refreshConversations)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, refreshConversations)
        .subscribe();

      const handleLeadEvent = () => {
        refreshConversations();
      };
      window.addEventListener('imovelhub_lead_submitted', handleLeadEvent);

      return () => {
        clearInterval(pollTimer);
        if (channel) void supabase?.removeChannel(channel);
        window.removeEventListener('imovelhub_lead_submitted', handleLeadEvent);
      };
    } else {
      setConversations([]);
      setActiveConversationId(null);
    }
  }, [currentUser.id, isAuthenticated]);

  const refreshConversations = async () => {
    if (!isSupabaseConfigured || !isAuthenticated || currentUser.id === 'guest_buyer') return;
    if (sessionUserId.current !== currentUser.id) return;
    const version = ++refreshVersion.current;
    try {
      const remoteConvs = await fetchConversationsFromSupabase(currentUser.id);
      if (remoteConvs !== null && version === refreshVersion.current && sessionUserId.current === currentUser.id) {
        setConversations(remoteConvs);
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
      read: false
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

    if (isSupabaseConfigured) {
      const sent = await insertMessageToSupabase(newMsg, conversationId);
      if (!sent) {
        addToast({ type: 'error', title: 'Mensagem não enviada', message: 'O banco de dados não confirmou o envio.' });
        return;
      }
    }
    if (sessionUserId.current !== currentUser.id) return;
    refreshVersion.current++;
    setConversations(previous => previous.map(conversation =>
      conversation.id === conversationId ? {
        ...conversation, lastMessage: text, lastMessageTime: 'Agora',
        messages: conversation.messages.some(message => message.id === newMsg.id)
          ? conversation.messages : [...conversation.messages, newMsg]
      } : conversation
    ));
    await refreshConversations();
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
