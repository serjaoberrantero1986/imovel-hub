import React, { useState } from 'react';
import { 
  MessageSquare, 
  Send, 
  Search, 
  Building2, 
  Phone, 
  ShieldCheck, 
  CheckCheck, 
  ExternalLink,
  ChevronRight,
  User
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDateTime } from '../lib/utils';

export const MessagesChatView: React.FC = () => {
  const { 
    conversations, 
    activeConversationId, 
    setActiveConversationId, 
    sendMessage, 
    currentUser,
    openPropertyDetail 
  } = useApp();

  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const activeConversation = conversations.find(c => c.id === activeConversationId) || conversations[0];

  const filteredConversations = conversations.filter(c => 
    c.otherUser.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.propertyTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeConversation) return;
    sendMessage(activeConversation.id, messageInput);
    setMessageInput('');
  };

  return (
    <div className="min-h-[calc(100vh-100px)] bg-slate-50 dark:bg-slate-950 py-6 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[calc(100vh-140px)]">
        
        <div className="h-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
          
          {/* LEFT SIDEBAR (4 cols): Conversations List */}
          <div className="md:col-span-5 lg:col-span-4 border-r border-slate-100 dark:border-slate-800 flex flex-col h-full">
            
            {/* Search Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white font-['Outfit'] flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-rose-500" />
                  <span>Mensagens</span>
                </h2>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  {conversations.length} conversas
                </span>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar conversa ou imóvel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Conversation Items List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredConversations.map(conv => {
                const isActive = activeConversation?.id === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`p-4 cursor-pointer transition-all flex items-start gap-3 ${
                      isActive
                        ? 'bg-rose-50/60 dark:bg-rose-950/30 border-l-4 border-rose-600'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <img
                      src={conv.otherUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                      alt={conv.otherUser.name}
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-rose-500/20 shrink-0"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {conv.otherUser.name}
                        </h4>
                        <span className="text-[10px] text-slate-400">{conv.lastMessageTime}</span>
                      </div>

                      <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 truncate mt-0.5">
                        {conv.propertyTitle}
                      </p>

                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {conv.lastMessage}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* RIGHT PANEL (8 cols): Active Chat Thread */}
          {activeConversation ? (
            <div className="md:col-span-7 lg:col-span-8 flex flex-col h-full bg-slate-50/30 dark:bg-slate-900/30">
              
              {/* Chat Top Banner & Property Info */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={activeConversation.otherUser.avatarUrl || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80'}
                    className="w-10 h-10 rounded-xl object-cover"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {activeConversation.otherUser.name}
                      </h3>
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    </div>
                    <span className="text-xs text-slate-400">
                      {activeConversation.otherUser.agencyName || 'Corretor Associado'}
                    </span>
                  </div>
                </div>

                {/* Property quick badge */}
                <div 
                  onClick={() => openPropertyDetail(activeConversation.propertyId)}
                  className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-rose-500 transition-colors"
                >
                  {activeConversation.propertyImage && (
                    <img src={activeConversation.propertyImage} className="w-8 h-8 rounded-lg object-cover" />
                  )}
                  <div className="text-left hidden sm:block">
                    <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                      {activeConversation.propertyTitle}
                    </div>
                    <div className="text-[10px] text-rose-600 font-extrabold">
                      {formatCurrency(activeConversation.propertyPrice)}
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              {/* Chat Messages History */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {activeConversation.messages.map(msg => {
                  const isMine判定 = msg.senderId === currentUser.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2.5 ${isMine判定 ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isMine判定 && (
                        <img
                          src={msg.senderAvatar || activeConversation.otherUser.avatarUrl}
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                      )}

                      <div
                        className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                          isMine判定
                            ? 'bg-rose-600 text-white rounded-br-xs shadow-md shadow-rose-600/20'
                            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-xs border border-slate-100 dark:border-slate-700 shadow-sm'
                        }`}
                      >
                        <p>{msg.text}</p>
                        <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                          isMine判定 ? 'text-rose-200' : 'text-slate-400'
                        }`}>
                          <span>10:42</span>
                          {isMine判定 && <CheckCheck className="w-3 h-3" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSend} className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Escreva sua mensagem para o corretor..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="p-3 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white shadow-md shadow-rose-600/20 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

            </div>
          ) : (
            <div className="md:col-span-7 lg:col-span-8 flex items-center justify-center p-8 text-center text-slate-400">
              Selecione uma conversa para iniciar o atendimento.
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
