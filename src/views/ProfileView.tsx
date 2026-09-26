import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Camera, 
  Award, 
  ExternalLink, 
  Save, 
  LogOut, 
  Key, 
  Sparkles, 
  Globe, 
  Instagram, 
  Linkedin, 
  Clock, 
  Bell, 
  Heart, 
  Send, 
  Calendar,
  Layers,
  HelpCircle,
  RefreshCw,
  FileCheck,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserProfile, PropertyType, PropertyPurpose } from '../types';
import { 
  BRAZILIAN_CRECI_REGIONS, 
  formatCreciInput, 
  verifyCreciNational,
  CreciVerificationResult 
} from '../lib/creciVerification';
import { formatCurrency } from '../lib/utils';
import { BRAZILIAN_STATES } from '../lib/brazilianStates';
import { CreciDocumentManager } from '../components/profile/CreciDocumentManager';

export const ProfileView: React.FC = () => {
  const { 
    currentUser, 
    isAuthenticated,
    openAuthModal,
    updateUserProfile, 
    requestCreciReview,
    logout, 
    deleteAccount,
    refreshData,
    setCurrentView,
    addToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'general' | 'role_specific' | 'security'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifyingCreci, setIsVerifyingCreci] = useState(false);
  const [isRequestingCreciReview, setIsRequestingCreciReview] = useState(false);
  const [creciDocumentCount, setCreciDocumentCount] = useState(0);
  const [creciResult, setCreciResult] = useState<CreciVerificationResult | null>(null);

  // Delete account confirmation state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Form State initialized from currentUser
  const [formData, setFormData] = useState<UserProfile>({ ...currentUser });

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // File input ref for avatar
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData({ ...currentUser });
  }, [currentUser]);

  // Handle avatar upload
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        addToast({ type: 'warning', title: 'Arquivo muito grande', message: 'Envie uma foto com até 5MB.' });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setFormData(prev => ({ ...prev, avatarUrl: reader.result as string }));
        addToast({ type: 'info', title: 'Foto selecionada', message: 'Clique em Salvar Alterações para confirmar.' });
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle logo upload
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setFormData(prev => ({ ...prev, agencyLogo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Run CRECI national verification
  const handleVerifyCreci = async () => {
    const creciToVerify = formData.creci || '';
    const ufToVerify = formData.creciUf || formData.state || 'SP';

    if (!creciToVerify.trim()) {
      addToast({ type: 'warning', title: 'CRECI Não Informado', message: 'Digite o número do CRECI antes de verificar.' });
      return;
    }

    setIsVerifyingCreci(true);
    try {
      const result = await verifyCreciNational(creciToVerify, ufToVerify, formData.name);
      // Do not render simulated protocol/council data as an official result.
      setCreciResult(null);

      if (result.isValid && result.isAccredited) {
        setFormData(prev => ({
          ...prev,
          creci: result.creciNumber,
          creciUf: result.creciUf,
          creciType: result.category,
          // This browser check only validates formatting and regional mapping.
          // It is not an official COFECI/CRECI integration and must never grant
          // a verified badge or persist a fabricated protocol.
          creciStatus: 'pending',
          creciVerifiedAt: undefined,
          creciProtocol: undefined,
          verified: false
        }));
        addToast({
          type: 'success',
          title: 'Dados do CRECI preparados',
          message: 'O registro ficará pendente de análise oficial antes de receber o selo de verificação.'
        });
      } else {
        setFormData(prev => ({
          ...prev,
          creciStatus: 'invalid'
        }));
        addToast({
          type: 'error',
          title: 'Falha na Validação do CRECI',
          message: result.message
        });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Erro de Verificação', message: err.message || 'Falha ao consultar conselho.' });
    } finally {
      setIsVerifyingCreci(false);
    }
  };

  const handleRequestCreciReview = async () => {
    if (!formData.creci || !formData.creciUf) {
      addToast({ type: 'warning', title: 'Dados incompletos', message: 'Informe o número e a UF do CRECI antes de solicitar análise.' });
      return;
    }
    if (creciDocumentCount < 1) {
      addToast({ type: 'warning', title: 'Documento obrigatório', message: 'Anexe a CIRP ou uma certidão de regularidade antes de solicitar a análise.' });
      return;
    }
    setIsRequestingCreciReview(true);
    try {
      // Save edited registration data before asking the team to review it.
      await updateUserProfile(formData);
      await requestCreciReview();
      addToast({ type: 'success', title: 'Análise solicitada', message: 'Seu registro ficará pendente até a conferência em fonte oficial.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Solicitação não enviada', message: err.message || 'Não foi possível solicitar a análise.' });
    } finally {
      setIsRequestingCreciReview(false);
    }
  };

  // Test WhatsApp Link
  const handleTestWhatsApp = () => {
    const rawNumber = (formData.whatsapp || formData.phone || '').replace(/\D/g, '');
    if (!rawNumber) {
      addToast({ type: 'warning', title: 'Número Ausente', message: 'Preencha o campo WhatsApp com DDD.' });
      return;
    }
    const cleanNumber = rawNumber.startsWith('55') ? rawNumber : `55${rawNumber}`;
    const url = `https://wa.me/${cleanNumber}?text=Ol%C3%A1%20${encodeURIComponent(formData.name)}%2C%20teste%20de%20contato%20via%20Web%20Im%C3%B3vel!`;
    window.open(url, '_blank');
    addToast({ type: 'info', title: 'Testando WhatsApp', message: 'Abrindo link de atendimento...' });
  };

  // Save changes
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateUserProfile(formData);
      addToast({ 
        type: 'success', 
        title: 'Perfil Atualizado!', 
        message: 'Todas as alterações foram salvas com sucesso.' 
      });
    } catch (err: any) {
      addToast({ 
        type: 'error', 
        title: 'Erro ao Salvar', 
        message: 'Não foi possível salvar as alterações. Seus dados continuam no formulário; tente novamente.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle password update
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      addToast({ type: 'warning', title: 'Senha muito curta', message: 'A nova senha deve ter no mínimo 6 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast({ type: 'error', title: 'Senhas divergentes', message: 'A confirmação de senha não confere.' });
      return;
    }

    setIsChangingPassword(true);
    await new Promise(r => setTimeout(r, 600));
    setIsChangingPassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    addToast({ type: 'success', title: 'Senha Alterada', message: 'Sua senha de acesso foi atualizada com sucesso.' });
  };

  // Handle Logout
  const handleLogout = async () => {
    await logout();
    setCurrentView('portal');
  };

  // Handle Definitive Account Deletion
  const handleDeleteAccount = async () => {
    if (deleteConfirmationText.trim().toUpperCase() !== 'EXCLUIR') {
      addToast({
        type: 'warning',
        title: 'Confirmação Incorreta',
        message: 'Digite a palavra EXCLUIR para confirmar a exclusão definitiva da sua conta.'
      });
      return;
    }

    setIsDeletingAccount(true);
    try {
      await deleteAccount();
      await refreshData();
      setIsDeleteModalOpen(false);
      setDeleteConfirmationText('');
      setCurrentView('portal');
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao excluir conta',
        message: err?.message || 'Ocorreu um erro ao processar a exclusão. Tente novamente.'
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Available UF list
  const ufList = Object.keys(BRAZILIAN_CRECI_REGIONS);

  const isBroker = formData.role === 'broker' || formData.role === 'agency';

  // Visitor Gating: If user is not authenticated, show professional signup/login prompt instead of edit form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-16 px-4 sm:px-6 lg:px-8 transition-colors flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
            <User className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white font-['Outfit']">
              Acesso Exclusivo para Usuários
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Você está navegando como visitante. Para gerenciar seu perfil, anúncios cadastrados e preferências, faça login ou crie sua conta gratuitamente.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              id="btn-profile-signup-prompt"
              onClick={() => openAuthModal('signup')}
              className="w-full py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-sm shadow-lg shadow-rose-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Cadastre-se Gratuitamente</span>
            </button>

            <button
              id="btn-profile-login-prompt"
              onClick={() => openAuthModal('login')}
              className="w-full py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm transition-colors cursor-pointer"
            >
              Já tenho uma conta, fazer Login
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setCurrentView('portal')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              ← Voltar para a Página Inicial
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Breadcrumb & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <button onClick={() => setCurrentView('portal')} className="hover:text-rose-600 transition-colors">
                Início
              </button>
              <span>/</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">Gerenciar Perfil</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Meu Perfil {isBroker ? 'Profissional' : 'de Cliente'}
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              id="btn-logout-profile"
              onClick={handleLogout}
              className="px-3.5 py-2 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>

        {/* Profile Card Summary Banner */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-rose-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
            {/* Avatar with upload trigger */}
            <div className="relative group shrink-0">
              <img
                src={formData.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}
                alt={formData.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover ring-4 ring-rose-500/20 shadow-md"
              />
              <button
                id="btn-upload-avatar"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Trocar foto de perfil"
                className="absolute inset-0 bg-slate-900/50 rounded-3xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200 cursor-pointer"
              >
                <Camera className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-bold">Alterar Foto</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
            </div>

            {/* User details */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-1.5">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                  {formData.name || 'Usuário Web Imóvel'}
                </h2>
                
                {/* Role badge */}
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  isBroker 
                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}>
                  {isBroker ? 'Corretor Credenciado' : 'Comprador / Inquilino'}
                </span>

                {/* Verified badge */}
                {formData.verified && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    CRECI Verificado
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 flex flex-wrap items-center justify-center sm:justify-start gap-4">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {formData.email}
                </span>
                {formData.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {formData.phone}
                  </span>
                )}
                {(formData.city || formData.state) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {formData.city ? `${formData.city} - ${formData.state || 'SP'}` : formData.state}
                  </span>
                )}
              </p>

              {/* Quick stats for broker */}
              {isBroker && (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>CRECI: <strong>{formData.creci || 'Não informado'}</strong></span>
                  {formData.agencyName && (
                    <span>Imobiliária: <strong>{formData.agencyName}</strong></span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
          <button
            id="tab-profile-general"
            onClick={() => setActiveTab('general')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'general'
                ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Dados Gerais & Contato</span>
          </button>

          <button
            id="tab-profile-role-specific"
            onClick={() => setActiveTab('role_specific')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'role_specific'
                ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            {isBroker ? <Award className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
            <span>{isBroker ? 'CRECI & Perfil Profissional' : 'Preferências & Alertas'}</span>
          </button>

          <button
            id="tab-profile-security"
            onClick={() => setActiveTab('security')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'security'
                ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Segurança & Conta</span>
          </button>
        </div>

        {/* TAB 1: Dados Gerais & Contato */}
        {activeTab === 'general' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Informações Pessoais de Contato
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome Completo
                </label>
                <input
                  id="input-profile-name"
                  type="text"
                  value={formData.name || ''}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail Principal
                </label>
                <input
                  id="input-profile-email"
                  type="email"
                  value={formData.email || ''}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Telefone de Contato
                </label>
                <input
                  id="input-profile-phone"
                  type="tel"
                  placeholder="(15) 3232-9092"
                  value={formData.phone || ''}
                  onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    WhatsApp (com DDD)
                  </label>
                  <button
                    id="btn-test-whatsapp"
                    type="button"
                    onClick={handleTestWhatsApp}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    <span>Testar WhatsApp</span>
                  </button>
                </div>
                <input
                  id="input-profile-whatsapp"
                  type="tel"
                  placeholder="(15) 99123-4567"
                  value={formData.whatsapp || ''}
                  onChange={e => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isBroker ? 'Cidade de atuação' : 'Cidade'}
                </label>
                <input
                  id="input-profile-city"
                  type="text"
                  placeholder="Ex: Sorocaba"
                  value={formData.city || ''}
                  onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Estado (UF)
                </label>
                <select
                  id="select-profile-state"
                  value={formData.state || ''}
                  onChange={e => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                >
                  <option value="">Selecione o estado</option>
                  {Object.keys(BRAZILIAN_STATES).map(uf => (
                    <option key={uf} value={uf}>
                      {isBroker ? `${uf} - ${BRAZILIAN_CRECI_REGIONS[uf]?.fullName || BRAZILIAN_STATES[uf]}` : BRAZILIAN_STATES[uf]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Se Corretor - CRECI & Perfil Profissional */}
        {activeTab === 'role_specific' && isBroker && (
          <div className="space-y-6">
            
            {/* Registration preparation and human official review */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-500" />
                    <span>Análise de Registro CRECI</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Confira o formato do registro e solicite análise em fonte oficial. O selo só é liberado após aprovação da equipe.
                  </p>
                </div>

                {formData.creciReviewStatus === 'approved' && formData.verified ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    CRECI aprovado
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    {formData.creciReviewStatus === 'rejected' ? 'Revisão necessária' : formData.creciReviewStatus === 'pending' ? 'Em análise' : 'Aguardando solicitação'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-2">
                <div className="sm:col-span-6">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Número do CRECI (com sufixo F, J ou E)
                  </label>
                  <input
                    id="input-creci-number"
                    type="text"
                    placeholder="Ex: 185420-F ou 9835-J"
                    value={formData.creci || ''}
                    onChange={e => setFormData(prev => ({ ...prev, creci: formatCreciInput(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 uppercase"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Conselho Regional (UF)
                  </label>
                  <select
                    id="select-creci-uf"
                    value={formData.creciUf || formData.state || 'SP'}
                    onChange={e => setFormData(prev => ({ ...prev, creciUf: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {ufList.map(uf => (
                      <option key={uf} value={uf}>
                        {BRAZILIAN_CRECI_REGIONS[uf]?.name} ({uf})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3 space-y-2">
                  <button id="btn-trigger-creci-verify" type="button" onClick={handleVerifyCreci} disabled={isVerifyingCreci}
                    className="w-full py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60">
                    {isVerifyingCreci ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                    <span>{isVerifyingCreci ? 'Conferindo...' : 'Conferir formato'}</span>
                  </button>
                  <button type="button" onClick={handleRequestCreciReview}
                    disabled={isRequestingCreciReview || formData.creciReviewStatus === 'pending' || formData.creciReviewStatus === 'approved'}
                    className="w-full py-2.5 px-4 rounded-2xl border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                    {isRequestingCreciReview ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{isRequestingCreciReview ? 'Enviando...' : 'Solicitar análise'}</span>
                  </button>
                </div>
              </div>

              <CreciDocumentManager user={formData} addToast={addToast} onCountChange={setCreciDocumentCount} />

              {creciResult && (
                <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Conferência de preenchimento
                    </span>
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      NÃO É VALIDAÇÃO OFICIAL
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-slate-600 dark:text-slate-400">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Conselho informado</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {BRAZILIAN_CRECI_REGIONS[formData.creciUf || 'SP']?.name}
                      </strong>
                    </div>

                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Próxima etapa</span>
                      <strong className="text-slate-800 dark:text-slate-200">Solicite análise para conferência oficial.</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Box 2: Apresentação Profissional & Imobiliária */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Identidade da Imobiliária & Apresentação
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome da Imobiliária ou Consultoria
                  </label>
                  <input
                    id="input-agency-name"
                    type="text"
                    placeholder="Ex: Mendes Ortega Consultoria Imobiliária"
                    value={formData.agencyName || ''}
                    onChange={e => setFormData(prev => ({ ...prev, agencyName: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Website Oficial
                  </label>
                  <input
                    id="input-profile-website"
                    type="url"
                    placeholder="https://suaimobiliaria.com.br"
                    value={formData.website || ''}
                    onChange={e => setFormData(prev => ({ ...prev, website: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mini Bio / Apresentação Profissional (Exibida nos Anúncios)
                </label>
                <textarea
                  id="textarea-profile-bio"
                  rows={3}
                  placeholder="Conte um pouco sobre sua trajetória, anos de experiência e bairros de atuação..."
                  value={formData.bio || ''}
                  onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                ></textarea>
              </div>

              {/* Redes Sociais & Atendimento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Instagram className="w-3.5 h-3.5 text-rose-500" />
                    <span>Instagram Profissional</span>
                  </label>
                  <input
                    id="input-profile-instagram"
                    type="text"
                    placeholder="@seu.perfil.corretor"
                    value={formData.instagram || ''}
                    onChange={e => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Linkedin className="w-3.5 h-3.5 text-blue-500" />
                    <span>LinkedIn</span>
                  </label>
                  <input
                    id="input-profile-linkedin"
                    type="text"
                    placeholder="linkedin.com/in/seunome"
                    value={formData.linkedin || ''}
                    onChange={e => setFormData(prev => ({ ...prev, linkedin: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Toggle de Disponibilidade em Fins de Semana */}
              <label className="flex items-center gap-3 pt-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <input
                  id="checkbox-weekend-visits"
                  type="checkbox"
                  checked={formData.availableWeekendVisits ?? true}
                  onChange={e => setFormData(prev => ({ ...prev, availableWeekendVisits: e.target.checked }))}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Disponível para agendamento de visitas aos sábados e domingos
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Exibe a tag de "Atendimento aos Finais de Semana" em seus anúncios para aumentar contatos.
                  </span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* TAB 2: Se Cliente - Preferências de Imóveis & Alertas */}
        {activeTab === 'role_specific' && !isBroker && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Preferências de Imóvel Desejado
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Personalize o que você procura para receber recomendações sob medida dos corretores da região.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Objetivo Principal
                </label>
                <select
                  id="select-pref-purpose"
                  value={formData.preferences?.purpose || 'sale'}
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, purpose: e.target.value as any }
                  }))}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                >
                  <option value="sale">Comprar Imóvel</option>
                  <option value="rent">Alugar Imóvel</option>
                  <option value="all">Ambos (Comprar ou Alugar)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Preço Máximo Desejado (R$)
                </label>
                <input
                  id="input-pref-max-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex: 850000"
                  value={formData.preferences?.maxPrice ?? ''}
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, maxPrice: e.target.value === '' ? undefined : Number(e.target.value) }
                  }))}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Central de Alertas e Notificações */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Canais de Notificação & Alertas
              </h4>

              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 cursor-pointer">
                  <input
                    id="checkbox-pref-alert-email"
                    type="checkbox"
                    checked={formData.preferences?.alertEmail ?? true}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, alertEmail: e.target.checked }
                    }))}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Receber novos imóveis por E-mail
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Disparo automático quando surgirem lançamentos na sua faixa de preço.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 cursor-pointer">
                  <input
                    id="checkbox-pref-alert-whatsapp"
                    type="checkbox"
                    checked={formData.preferences?.alertWhatsapp ?? true}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, alertWhatsapp: e.target.checked }
                    }))}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Receber alertas prioritários no WhatsApp
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Notificações instantâneas de baixas de preço nos seus favoritos.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 cursor-pointer">
                  <input
                    id="checkbox-pref-allow-partners"
                    type="checkbox"
                    checked={formData.preferences?.allowPartnerContact ?? true}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, allowPartnerContact: e.target.checked }
                    }))}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Autorizar corretores parceiros com CRECI ativo a apresentarem imóveis
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Apenas profissionais com selo verificado poderão enviar propostas compatíveis.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Segurança & Conta */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            
            {/* Box: Alteração de Senha */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-500" />
                <span>Alterar Senha de Acesso</span>
              </h3>

              <form onSubmit={handleSavePassword} className="space-y-3.5 max-w-md">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Senha Atual
                  </label>
                  <input
                    id="input-current-password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nova Senha
                  </label>
                  <input
                    id="input-new-password"
                    type="password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Confirmar Nova Senha
                  </label>
                  <input
                    id="input-confirm-new-password"
                    type="password"
                    required
                    placeholder="Repita a nova senha"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <button
                  id="btn-submit-change-password"
                  type="submit"
                  disabled={isChangingPassword}
                  className="py-2.5 px-4 rounded-2xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  {isChangingPassword ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <span>Atualizar Senha</span>
                  )}
                </button>
              </form>
            </div>

            {/* Box: Zona de Perigo / Excluir Conta */}
            <div className="bg-red-50/50 dark:bg-red-950/20 rounded-3xl p-6 border border-red-200 dark:border-red-900/50 space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="p-3 rounded-2xl bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-red-950 dark:text-red-300">
                    Zona de Perigo: Excluir Minha Conta
                  </h3>
                  <p className="text-xs text-red-700/80 dark:text-red-400/80 leading-relaxed">
                    A exclusão da sua conta ({currentUser.email}) é <b>definitiva e irreversível</b>. Todos os seus dados pessoais, perfil, imóveis anunciados, fotos, localizações, mensagens e preferências serão completamente removidos do banco de dados de produção. Caso deseje retornar futuramente, será necessário realizar um novo cadastro do zero.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-start">
                <button
                  id="btn-open-delete-account-modal"
                  type="button"
                  onClick={() => {
                    setDeleteConfirmationText('');
                    setIsDeleteModalOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-red-600/20 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir Minha Conta Definitivamente</span>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Modal de Confirmação de Exclusão Definitiva de Conta */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 border border-red-200 dark:border-red-900/60 shadow-2xl space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950 border border-red-200 dark:border-red-900 flex items-center justify-center mx-auto text-red-600 dark:text-red-400">
                <AlertTriangle className="w-7 h-7" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Confirmar Exclusão de Conta?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Esta ação <b>apagará definitivamente</b> seus dados de perfil (<span className="font-semibold text-slate-800 dark:text-slate-200">{currentUser.email}</span>), anúncios, favoritos, leads e mensagens do banco de dados. O acesso a esta conta será desativado permanentemente.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 space-y-1.5">
                <label className="block text-[11px] font-bold text-red-900 dark:text-red-300">
                  Para confirmar, digite <span className="font-mono underline font-extrabold">EXCLUIR</span> no campo abaixo:
                </label>
                <input
                  id="input-confirm-delete-account"
                  type="text"
                  placeholder="EXCLUIR"
                  value={deleteConfirmationText}
                  onChange={e => setDeleteConfirmationText(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-red-300 dark:border-red-800 text-xs font-mono font-bold text-slate-900 dark:text-white uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  id="btn-cancel-delete-account"
                  type="button"
                  disabled={isDeletingAccount}
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeleteConfirmationText('');
                  }}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  id="btn-confirm-delete-account-permanently"
                  type="button"
                  disabled={isDeletingAccount || deleteConfirmationText.trim().toUpperCase() !== 'EXCLUIR'}
                  onClick={handleDeleteAccount}
                  className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-extrabold shadow-lg shadow-red-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeletingAccount ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>{isDeletingAccount ? 'Excluindo...' : 'Excluir Definitivamente'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating / Bottom Sticky Action Bar */}
        <div className="sticky bottom-6 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-xl flex items-center justify-between gap-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
            Lembre-se de salvar suas alterações para atualizar seus anúncios e dados de contato.
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              id="btn-cancel-profile-changes"
              type="button"
              onClick={() => setFormData({ ...currentUser })}
              className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Descartar
            </button>

            <button
              id="btn-save-profile-changes"
              type="button"
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white text-xs font-extrabold shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
            >
              {isSaving ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
