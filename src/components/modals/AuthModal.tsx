import React, { useEffect, useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  Building2, 
  CheckCircle2, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Sparkles,
  Award,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AuthModal: React.FC = () => {
  const { 
    authModalOpen, 
    closeAuthModal, 
    authModalTab, 
    setAuthModalTab, 
    login, 
    signUp, 
    loginWithGoogle,
    openLegalPage
  } = useApp();

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [creci, setCreci] = useState('');
  const [role, setRole] = useState<'buyer' | 'broker'>('buyer');
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authModalOpen) return;

    try {
      const rawDraft = sessionStorage.getItem('imovelhub_pending_property_contact');
      if (!rawDraft) return;

      const draft = JSON.parse(rawDraft) as {
        name?: string;
        email?: string;
        phone?: string;
        createdAt?: number;
      };
      const isRecent = typeof draft.createdAt === 'number'
        && Date.now() - draft.createdAt <= 24 * 60 * 60 * 1000;

      if (!isRecent) {
        sessionStorage.removeItem('imovelhub_pending_property_contact');
        return;
      }

      if (draft.email) setEmail(draft.email);
      if (draft.name) setName(draft.name);
      if (draft.phone) setPhone(draft.phone);
    } catch {
      sessionStorage.removeItem('imovelhub_pending_property_contact');
    }
  }, [authModalOpen]);

  if (!authModalOpen) return null;

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setPhone('');
    setCreci('');
    setErrorMessage(null);
    setForgotSent(false);
  };

  const handleSwitchTab = (tab: 'login' | 'signup' | 'forgot') => {
    setAuthModalTab(tab);
    setErrorMessage(null);
    setForgotSent(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (authModalTab === 'forgot') {
      if (!email.trim() || !email.includes('@')) {
        setErrorMessage('Por favor, informe um e-mail válido para redefinição.');
        return;
      }
      setIsLoading(true);
      try {
        // Handle reset
        await new Promise(r => setTimeout(r, 600));
        setForgotSent(true);
      } catch (err: any) {
        setErrorMessage(err.message || 'Erro ao enviar e-mail de recuperação.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (authModalTab === 'signup') {
      if (!name.trim()) {
        setErrorMessage('Por favor, informe seu nome completo.');
        return;
      }
      if (!acceptedTerms) {
        setErrorMessage('Você deve concordar com os Termos de Uso e Política de Privacidade.');
        return;
      }

      setIsLoading(true);
      try {
        const success = await signUp({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          phone: phone.trim() || undefined,
          creci: role === 'broker' ? creci.trim() : undefined
        });

        if (success) {
          resetForm();
          closeAuthModal();
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Falha ao criar conta. Tente novamente.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Login
      setIsLoading(true);
      try {
        const success = await login(email.trim().toLowerCase(), password);
        if (success) {
          resetForm();
          closeAuthModal();
        } else {
          setErrorMessage('Não foi possível realizar o login. Verifique seus dados ou cadastre-se caso ainda não possua conta.');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Erro ao realizar login.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await loginWithGoogle();
      closeAuthModal();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao conectar com conta Google.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={closeAuthModal}
    >
      <div 
        id="auth-modal-dialog"
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header decoration */}
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-rose-50/50 via-white to-indigo-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30">
          <button
            id="btn-close-auth-modal"
            onClick={closeAuthModal}
            className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 via-rose-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Building2 className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white font-['Outfit']">
              Web <span className="text-rose-600 dark:text-rose-500">Imóvel</span>
            </span>
          </div>

          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            {authModalTab === 'login' && 'Acesse sua conta'}
            {authModalTab === 'signup' && 'Crie sua conta gratuita'}
            {authModalTab === 'forgot' && 'Recuperar senha'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {authModalTab === 'login' && 'Entre para gerenciar seus imóveis, leads e buscas salvas.'}
            {authModalTab === 'signup' && 'Junte-se a corretores, imobiliárias e compradores em todo o Brasil.'}
            {authModalTab === 'forgot' && 'Informe seu e-mail cadastrado para receber as instruções.'}
          </p>
        </div>

        {/* Tab switchers (Login vs Signup) */}
        {authModalTab !== 'forgot' && (
          <div className="p-4 pb-0">
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
              <button
                id="tab-auth-login"
                type="button"
                onClick={() => handleSwitchTab('login')}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${
                  authModalTab === 'login'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Entrar
              </button>
              <button
                id="tab-auth-signup"
                type="button"
                onClick={() => handleSwitchTab('signup')}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${
                  authModalTab === 'signup'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Cadastrar
              </button>
            </div>
          </div>
        )}

        <div className="p-6 pt-4 max-h-[75vh] overflow-y-auto scrollbar-thin">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {forgotSent ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">E-mail Enviado!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  Enviamos as instruções para redefinição de senha para <strong>{email}</strong>. Verifique sua caixa de entrada e spam.
                </p>
              </div>
              <button
                id="btn-back-to-login"
                type="button"
                onClick={() => handleSwitchTab('login')}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                Voltar para o Login
              </button>
            </div>
          ) : (
            <>
              {/* Google OAuth Quick Button */}
              {authModalTab !== 'forgot' && (
                <div className="space-y-3 mb-4">
                  <button
                    id="btn-google-oauth-login"
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-3 transition-colors shadow-xs"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>
                      {authModalTab === 'login' ? 'Continuar com Google' : 'Cadastre-se com Google'}
                    </span>
                  </button>

                  <div className="relative flex items-center justify-center my-3">
                    <div className="border-t border-slate-200 dark:border-slate-800 w-full"></div>
                    <span className="bg-white dark:bg-slate-900 px-3 text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                      ou
                    </span>
                    <div className="border-t border-slate-200 dark:border-slate-800 w-full"></div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Account Type Selector for Sign Up */}
                {authModalTab === 'signup' && (
                  <div className="space-y-1.5 mb-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Qual é o seu objetivo?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRole('buyer')}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          role === 'buyer'
                            ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <User className="w-4 h-4 text-rose-500" />
                          <span className="text-xs font-bold">Cliente / Comprador</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                          Buscar imóveis, salvar favoritos e receber alertas.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRole('broker')}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          role === 'broker'
                            ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-100 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <Award className="w-4 h-4 text-indigo-500" />
                          <span className="text-xs font-bold">Corretor / Imobiliária</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                          Anunciar imóveis, receber leads e validar CRECI.
                        </p>
                      </button>
                    </div>
                  </div>
                )}

                {/* Name (Sign Up only) */}
                {authModalTab === 'signup' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nome Completo
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="input-signup-name"
                        type="text"
                        required
                        placeholder="Ex: Carlos Mendes de Oliveira"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Email (All tabs) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="input-auth-email"
                      type="email"
                      required
                      placeholder="seu.email@exemplo.com.br"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                    />
                  </div>
                </div>

                {/* Password (Login and Signup) */}
                {authModalTab !== 'forgot' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Senha
                      </label>
                      {authModalTab === 'login' && (
                        <button
                          id="btn-forgot-password-link"
                          type="button"
                          onClick={() => handleSwitchTab('forgot')}
                          className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                        >
                          Esqueci minha senha
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="input-auth-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Additional fields for Broker on Sign Up */}
                {authModalTab === 'signup' && role === 'broker' && (
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        CRECI
                      </label>
                      <input
                        id="input-signup-creci"
                        type="text"
                        placeholder="Ex: 185420-F"
                        value={creci}
                        onChange={e => setCreci(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        WhatsApp
                      </label>
                      <input
                        id="input-signup-whatsapp"
                        type="tel"
                        placeholder="(15) 99123-4567"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}

                {/* LGPD Terms checkbox for Sign Up */}
                {authModalTab === 'signup' && (
                  <label className="flex items-start gap-2 pt-1 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      id="checkbox-accept-terms"
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={e => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span>
                      Concordo com os{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeAuthModal();
                          openLegalPage('terms');
                        }}
                        className="font-bold underline text-slate-900 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400"
                      >
                        Termos de Uso
                      </button>{' '}
                      e autorizo o tratamento de dados segundo a{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeAuthModal();
                          openLegalPage('privacy');
                        }}
                        className="font-bold underline text-slate-900 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400"
                      >
                        LGPD
                      </button>.
                    </span>
                  </label>
                )}

                {/* Submit button */}
                <button
                  id="btn-auth-submit"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white text-xs font-extrabold shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <span>
                        {authModalTab === 'login' && 'Entrar na Conta'}
                        {authModalTab === 'signup' && 'Concluir Cadastro'}
                        {authModalTab === 'forgot' && 'Enviar Instruções'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Bottom navigation link */}
                <div className="text-center pt-2">
                  {authModalTab === 'forgot' ? (
                    <button
                      type="button"
                      onClick={() => handleSwitchTab('login')}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Lembrou sua senha? <span className="text-rose-600 font-bold">Faça Login</span>
                    </button>
                  ) : authModalTab === 'login' ? (
                    <button
                      type="button"
                      onClick={() => handleSwitchTab('signup')}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Ainda não tem conta? <span className="text-rose-600 font-bold">Cadastre-se grátis</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSwitchTab('login')}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Já possui uma conta? <span className="text-rose-600 font-bold">Faça Login</span>
                    </button>
                  )}
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
