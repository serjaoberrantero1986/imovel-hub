import React, { useState, useEffect, useRef } from 'react';
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
  User,
  Archive,
  RotateCcw,
  LogIn,
  ArrowRight,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDateTime } from '../lib/utils';

export const MessagesChatView: React.FC = () => {
  const { 
    conversations, 
    activeConversationId, 
    setActiveConversationId,
    markAsRead, 
    sendMessage, 
    setConversationArchived,
    currentUser,
    isAuthenticated,
    openAuthModal,
    setCurrentView,
    openPropertyDetail 
  } = useApp();

  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [changingArchive, setChangingArchive] = useState(false);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  const visibleConversations = conversations.filter(c => Boolean(c.isArchived) === showArchived);
  const activeConversation = visibleConversations.find(c => c.id === activeConversationId) || visibleConversations[0];
  const participantLabels = { buyer: 'Comprador / Inquilino', broker: 'Corretor', agency: 'Imobiliária', owner: 'Proprietário', admin: 'Equipe do portal' };

  const handleArchive = async () => {
    if (!activeConversation || changingArchive) return;
    setChangingArchive(true);
    try {
      if (await setConversationArchived(activeConversation.id, !activeConversation.isArchived)) {
        setConfirmDeleteId(null);
        setMobileThreadOpen(false);
      }
    } finally {
      setChangingArchive(false);
    }
  };

  // When active conversation changes, mark as read immediately
  useEffect(() => {
    if (activeConversation?.id && activeConversation.unreadCount > 0 && document.visibilityState === 'visible' &&
        (mobileThreadOpen || window.matchMedia('(min-width: 768px)').matches)) {
      markAsRead(activeConversation.id);
    }
  }, [activeConversation?.id, activeConversation?.unreadCount, mobileThreadOpen]);

  // Scroll to bottom of message list on updates
  useEffect(() => {
    const panel = messagesScrollRef.current;
    if (panel) panel.scrollTo({ top: panel.scrollHeight, behavior: 'smooth' });
  }, [activeConversation?.id, activeConversation?.messages?.length]);

  const filteredConversations = visibleConversations.filter(c =>
    c.otherUser.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.propertyTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeConversation) return;
    sendMessage(activeConversation.id, messageInput);
    setMessageInput('');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-100px)] bg-slate-50 dark:bg-slate-950 py-10 transition-colors flex items-center justify-center">
        <div className="max-w-lg mx-auto px-4 text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
            <MessageSquare className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-bold uppercase tracking-wider">
              Atendimento Online
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit']">
              Chat & Mensagens Diretas
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
              Faça login na sua conta para conversar em tempo real com corretores credenciados, proprietários e imobiliárias parceiras da região.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-left flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Suas mensagens e conversas com anunciantes ficam sincronizadas com segurança em seu perfil após o login.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Entrar na Minha Conta</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentView('search')}
              className="px-6 py-3 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-bold shadow-sm transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Ver Imóveis Disponíveis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 dark:bg-slate-950 py-2 sm:py-6 transition-colors">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 h-[calc(100dvh-130px)] sm:h-[calc(100vh-140px)]">
        
        <div className="h-full bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
          
          {/* LEFT SIDEBAR (4 cols): Conversations List */}
          <div className={`md:col-span-5 lg:col-span-4 border-r border-slate-100 dark:border-slate-800 flex flex-col h-full ${
            mobileThreadOpen ? 'hidden md:flex' : 'flex'
          }`}>
            
            {/* Search Header */}
            <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-['Outfit'] flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-rose-500" />
                  <span>Mensagens</span>
                </h2>
                <span className="text-[11px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  {visibleConversations.length} {visibleConversations.length === 1 ? 'conversa' : 'conversas'}
                </span>
              </div>

              <div className="flex gap-2" aria-label="Pastas de conversas">
                {[false, true].map(archived => (
                  <button key={String(archived)} type="button" aria-pressed={showArchived === archived}
                    onClick={() => { setShowArchived(archived); setConfirmDeleteId(null); setMobileThreadOpen(false); }}
                    className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold ${showArchived === archived ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                    {archived ? 'Arquivadas' : 'Conversas'}
                  </button>
                ))}
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
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 min-h-0">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                  <MessageSquare className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">{searchTerm ? 'Nenhuma conversa encontrada' : showArchived ? 'Nenhuma conversa arquivada' : 'Nenhuma conversa ativa'}</p>
                  <p className="text-[11px]">{showArchived ? 'Conversas arquivadas ficam guardadas aqui e podem ser restauradas.' : 'Inicie uma conversa na página de um imóvel ou consulte suas conversas arquivadas.'}</p>
                </div>
              ) : (
                filteredConversations.map(conv => {
                  const isActive = activeConversation?.id === conv.id;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setActiveConversationId(conv.id);
                        markAsRead(conv.id);
                        setMobileThreadOpen(true);
                      }}
                      className={`p-3.5 sm:p-4 cursor-pointer transition-all flex items-start gap-3 ${
                        isActive
                          ? 'bg-rose-50/60 dark:bg-rose-950/30 border-l-4 border-rose-600'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <img
                        src={conv.otherUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                        alt={conv.otherUser.name}
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl object-cover ring-2 ring-rose-500/20 shrink-0"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {conv.otherUser.name}
                          </h4>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-slate-400">{conv.lastMessageTime}</span>
                            {conv.unreadCount > 0 && (
                              <span className="min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center shadow-xs animate-pulse">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
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
                })
              )}
            </div>

          </div>

          {/* RIGHT PANEL (8 cols): Active Chat Thread */}
          {activeConversation ? (
            <div className={`md:col-span-7 lg:col-span-8 flex flex-col h-full bg-slate-50/30 dark:bg-slate-900/30 ${
              mobileThreadOpen ? 'flex' : 'hidden md:flex'
            }`}>
              
              {/* Chat Top Banner & Property Info */}
              <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 sm:gap-4 shrink-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    type="button"
                    onClick={() => setMobileThreadOpen(false)}
                    className="md:hidden p-1.5 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
                    title="Voltar para a lista de conversas"
                    aria-label="Voltar para a lista"
                  >
                    <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                  </button>

                  <img
                    src={activeConversation.otherUser.avatarUrl || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80'}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover shrink-0"
                    alt={activeConversation.otherUser.name}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {activeConversation.otherUser.name}
                      </h3>
                      {activeConversation.otherUser.verified && ['broker', 'agency'].includes(activeConversation.otherUser.role) && (
                        <ShieldCheck aria-label="Profissional verificado" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 block truncate">
                      {participantLabels[activeConversation.otherUser.role] || 'Usuário'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {/* Property quick badge */}
                  <div 
                    onClick={() => openPropertyDetail(activeConversation.propertyId)}
                    className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-rose-500 transition-colors"
                  >
                    {activeConversation.propertyImage && (
                      <img src={activeConversation.propertyImage} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover" />
                    )}
                    <div className="text-left hidden sm:block">
                      <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate max-w-[130px]">
                        {activeConversation.propertyTitle}
                      </div>
                      <div className="text-[10px] text-rose-600 font-extrabold">
                        {formatCurrency(activeConversation.propertyPrice)}
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </div>

                  {/* Botão discreto para exclusão da conversa */}
                  {confirmDeleteId === activeConversation.id ? (
                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs">
                      <span className="text-[10px] text-rose-700 dark:text-rose-300 font-medium pl-1">{activeConversation.isArchived ? 'Restaurar?' : 'Arquivar?'}</span>
                      <button
                        type="button"
                        onClick={handleArchive}
                        disabled={changingArchive}
                        className="px-2 py-0.5 text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors cursor-pointer"
                        title="Confirmar apenas na minha lista; preservar o histórico"
                      >
                        {changingArchive ? 'Aguarde...' : 'Sim'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-1.5 py-0.5 text-[10px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        title="Cancelar"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(activeConversation.id)}
                      className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                      title={activeConversation.isArchived ? 'Restaurar na minha lista' : 'Arquivar só para mim; manter o histórico'}
                      aria-label={activeConversation.isArchived ? 'Restaurar conversa' : 'Arquivar conversa apenas para mim'}
                    >
                      {activeConversation.isArchived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Chat Messages History */}
              <div ref={messagesScrollRef} className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
                {activeConversation.messages.map(msg => {
                  const isMine = msg.senderId === currentUser.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isMine && (
                        <img
                          src={msg.senderAvatar || activeConversation.otherUser.avatarUrl}
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                          alt="Avatar"
                        />
                      )}

                      <div
                        className={`max-w-[85%] sm:max-w-md p-3 sm:p-3.5 rounded-2xl text-xs leading-relaxed ${
                          isMine
                            ? 'bg-rose-600 text-white rounded-br-xs shadow-md shadow-rose-600/20'
                            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-xs border border-slate-100 dark:border-slate-700 shadow-sm'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                          isMine ? 'text-rose-200' : 'text-slate-400'
                        }`}>
                          <span>{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Agora'}</span>
                          {isMine && <CheckCheck className="w-3 h-3" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSend} className="shrink-0 p-2.5 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Escreva sua mensagem..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer shrink-0"
                  title="Enviar mensagem"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

            </div>
          ) : (
            <div className={`md:col-span-7 lg:col-span-8 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-4 ${
              mobileThreadOpen ? 'flex' : 'hidden md:flex'
            }`}>
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Nenhuma conversa selecionada</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Escolha uma conversa na lista ao lado ou explore os imóveis para falar com os corretores parceiros.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentView('search')}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Explorar Imóveis</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
