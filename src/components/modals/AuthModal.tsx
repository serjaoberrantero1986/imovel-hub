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
import { isStrongPassword, PASSWORD_REQUIREMENTS, passwordChecks } from '../../lib/passwordPolicy';
import { TurnstileWidget, TURNSTILE_SITE_KEY } from '../auth/TurnstileWidget';

export const AuthModal: React.FC = () => {
  const { 
    authModalOpen, 
    closeAuthModal, 
    authModalTab, 
    setAuthModalTab, 
    login, 
    loginWithGoogle,
    signUp, 
    resendSignupConfirmation,
    requestPasswordReset,
    changePassword,
    mfaChallengeFactors,
    selectMfaChallengeFactor,
    verifyMfaChallenge,
    cancelMfaChallenge,
    openLegalPage
  } = useApp();

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [creci, setCreci] = useState('');
  const [role, setRole] = useState<'buyer' | 'broker'>('buyer');
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [signupConfirmationSent, setSignupConfirmationSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);
  const [mfaCode, setMfaCode] = useState('');

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
    setConfirmPassword('');
    setName('');
    setPhone('');
    setCreci('');
    setErrorMessage(null);
    setForgotSent(false);
    setSignupConfirmationSent(false);
    setCaptchaToken(null);
    setMfaCode('');
  };

  const handleSwitchTab = (tab: 'login' | 'signup' | 'forgot' | 'reset') => {
    setAuthModalTab(tab);
    setErrorMessage(null);
    setForgotSent(false);
    setSignupConfirmationSent(false);
    setCaptchaToken(null);
    setCaptchaResetSignal(value => value + 1);
  };

  const handleClose = () => {
    if (authModalTab === 'mfa') void cancelMfaChallenge();
    else closeAuthModal();
  };

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const started = await loginWithGoogle();
      if (!started) setErrorMessage('Não foi possível iniciar o acesso com Google. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (authModalTab === 'mfa') {
      if (mfaCode.replace(/\D/g, '').length !== 6) {
        setErrorMessage('Digite o código de 6 dígitos do aplicativo autenticador.');
        return;
      }
      setIsLoading(true);
      try { await verifyMfaChallenge(mfaCode); }
      finally { setIsLoading(false); }
      return;
    }

    if (authModalTab !== 'reset') {
      if (!TURNSTILE_SITE_KEY) {
        setErrorMessage('A verificação Cloudflare não foi configurada. Contate o suporte.');
        return;
      }
      if (!captchaToken) {
        setErrorMessage('Conclua a verificação de segurança antes de continuar.');
        return;
      }
    }

    if (authModalTab === 'forgot') {
      if (!email.trim() || !email.includes('@')) {
        setErrorMessage('Por favor, informe um e-mail válido para redefinição.');
        return;
      }
      setIsLoading(true);
      try {
        const sent = await requestPasswordReset(email, captchaToken);
        if (sent) setForgotSent(true);
      } catch (err: any) {
        setErrorMessage(err.message || 'Erro ao enviar e-mail de recuperação.');
      } finally {
        setIsLoading(false);
        setCaptchaToken(null);
        setCaptchaResetSignal(value => value + 1);
      }
      return;
    }

    if (authModalTab === 'reset') {
      if (!isStrongPassword(password)) {
        setErrorMessage('Use pelo menos 10 caracteres, com letra maiúscula, minúscula, número e símbolo.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('A confirmação não corresponde à nova senha.');
        return;
      }
      setIsLoading(true);
      try {
        const changed = await changePassword(password);
        if (changed) {
          resetForm();
          closeAuthModal();
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Não foi possível redefinir a senha. Solicite um novo link.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    if (authModalTab === 'login' && password.length < 6) {
      setErrorMessage('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (authModalTab === 'signup') {
      if (!name.trim()) {
        setErrorMessage('Por favor, informe seu nome completo.');
        return;
      }
      if (!isStrongPassword(password)) {
        setErrorMessage('Use pelo menos 10 caracteres, com letra maiúscula, minúscula, número e símbolo.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('A confirmação não corresponde à senha.');
        return;
      }
      if (!acceptedTerms) {
        setErrorMessage('Você deve concordar com os Termos de Uso e Política de Privacidade.');
        return;
      }

      setIsLoading(true);
      try {
        const result = await signUp({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          phone: phone.trim() || undefined,
          creci: role === 'broker' ? creci.trim() : undefined,
          captchaToken
        });

        if (result === 'authenticated') {
          resetForm();
          closeAuthModal();
        } else if (result === 'confirmation_required') {
          setSignupConfirmationSent(true);
          setPassword('');
          setConfirmPassword('');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Falha ao criar conta. Tente novamente.');
      } finally {
        setIsLoading(false);
        setCaptchaToken(null);
        setCaptchaResetSignal(value => value + 1);
      }
    } else {
      // Login
      setIsLoading(true);
      try {
        const result = await login(email.trim().toLowerCase(), password, captchaToken);
        if (result === 'authenticated') {
          resetForm();
          closeAuthModal();
        } else if (result === 'mfa_required') {
          setPassword('');
          setErrorMessage(null);
        } else if (result === 'security_error') {
          setErrorMessage('A verificação Cloudflare não foi aceita. Atualize a página e conclua um novo desafio antes de entrar.');
        } else {
          setErrorMessage('Não foi possível realizar o login. Verifique seus dados ou cadastre-se caso ainda não possua conta.');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Erro ao realizar login.');
      } finally {
        setIsLoading(false);
        setCaptchaToken(null);
        setCaptchaResetSignal(value => value + 1);
      }
    }
  };

  const handleResendSignupConfirmation = async () => {
    setErrorMessage(null);
    if (!captchaToken) {
      setErrorMessage('Conclua a verificação de segurança antes de reenviar o link.');
      return;
    }
    setIsLoading(true);
    try {
      await resendSignupConfirmation(email, captchaToken);
    } catch (err: any) {
      setErrorMessage(err.message || 'Não foi possível reenviar o link de confirmação.');
    } finally {
      setIsLoading(false);
      setCaptchaToken(null);
      setCaptchaResetSignal(value => value + 1);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleClose}
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
            onClick={handleClose}
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
            {authModalTab === 'reset' && 'Defina uma nova senha'}
            {authModalTab === 'mfa' && 'Confirme sua identidade'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {authModalTab === 'login' && 'Entre para gerenciar seus imóveis, leads e buscas salvas.'}
            {authModalTab === 'signup' && 'Junte-se a corretores, imobiliárias e compradores em todo o Brasil.'}
            {authModalTab === 'forgot' && 'Informe seu e-mail cadastrado para receber as instruções.'}
            {authModalTab === 'reset' && 'Crie uma senha forte e exclusiva para proteger sua conta.'}
            {authModalTab === 'mfa' && 'Digite o código atual de 6 dígitos do seu aplicativo autenticador.'}
          </p>
        </div>

        {/* Tab switchers (Login vs Signup) */}
        {(authModalTab === 'login' || authModalTab === 'signup') && (
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

          {authModalTab === 'mfa' ? (
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
                  <ShieldCheck className="h-7 w-7" />
                </div>
              </div>
              <div>
                {mfaChallengeFactors.length > 1 && (
                  <div className="mb-3">
                    <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Aplicativo autenticador</label>
                    <select
                      onChange={event => selectMfaChallengeFactor(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {mfaChallengeFactors.map(factor => <option key={factor.id} value={factor.id}>{factor.friendlyName}</option>)}
                    </select>
                  </div>
                )}
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Código de autenticação</label>
                <input
                  id="input-mfa-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  autoFocus
                  value={mfaCode}
                  onChange={event => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center font-mono text-2xl font-black tracking-[0.35em] text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <button type="submit" disabled={isLoading || mfaCode.length !== 6} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-xs font-extrabold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                {isLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <><span>Verificar e Entrar</span><ArrowRight className="h-4 w-4" /></>}
              </button>
              <button type="button" onClick={() => void cancelMfaChallenge()} className="w-full text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">Cancelar acesso</button>
            </form>
          ) : signupConfirmationSent ? (
            <div className="space-y-4 py-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirme seu e-mail</h3>
                <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
                  Enviamos um link de uso único para <strong>{email}</strong>. Abra o link antes de entrar no portal.
                </p>
              </div>
              <TurnstileWidget
                action="signup"
                resetSignal={captchaResetSignal}
                onToken={setCaptchaToken}
                onError={setErrorMessage}
              />
              <button
                type="button"
                disabled={isLoading || !captchaToken}
                onClick={() => void handleResendSignupConfirmation()}
                className="w-full rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {isLoading ? 'Reenviando...' : 'Reenviar link de confirmação'}
              </button>
              <button
                type="button"
                onClick={() => handleSwitchTab('login')}
                className="w-full text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Já confirmou? <span className="font-bold text-rose-600">Fazer login</span>
              </button>
            </div>
          ) : forgotSent ? (
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
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {(authModalTab === 'login' || authModalTab === 'signup') && (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleGoogleLogin()}
                      disabled={isLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                        <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z" />
                        <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.3l-3.3-2.6c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.6A10.1 10.1 0 0 0 12 22Z" />
                        <path fill="#FBBC05" d="M6.5 14a6.1 6.1 0 0 1 0-3.9V7.4H3.1a10.1 10.1 0 0 0 0 9.2L6.5 14Z" />
                        <path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2a10.1 10.1 0 0 0-8.9 5.4l3.4 2.7A5.9 5.9 0 0 1 12 5.9Z" />
                      </svg>
                      {authModalTab === 'login' ? 'Continuar com Google' : 'Cadastre-se com Google'}
                    </button>
                    <div className="flex items-center gap-3">
                      <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                      <span className="text-[10px] font-semibold uppercase text-slate-400">ou</span>
                      <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                    </div>
                  </>
                )}
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

                {/* Email (login, signup and password request) */}
                {authModalTab !== 'reset' && <div>
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
                </div>}

                {/* Password (Login and Signup) */}
                {authModalTab !== 'forgot' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        {authModalTab === 'reset' ? 'Nova senha' : 'Senha'}
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
                        placeholder={authModalTab === 'login' ? 'Sua senha' : 'Mínimo 10 caracteres'}
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

                {(authModalTab === 'signup' || authModalTab === 'reset') && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Confirmar senha
                      </label>
                      <div className="relative">
                        <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          id="input-auth-confirm-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
                          placeholder="Repita a senha"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700">
                      {PASSWORD_REQUIREMENTS.map(([key, label]) => {
                        const met = passwordChecks(password)[key];
                        return (
                          <span key={key} className={`flex items-center gap-1.5 text-[10px] font-semibold ${met ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                            {met ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-current" />}
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </>
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

                {(authModalTab === 'login' || authModalTab === 'signup' || authModalTab === 'forgot') && (
                  <TurnstileWidget
                    action={authModalTab === 'forgot' ? 'password_reset' : authModalTab}
                    resetSignal={captchaResetSignal}
                    onToken={setCaptchaToken}
                    onError={setErrorMessage}
                  />
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
                        {authModalTab === 'reset' && 'Salvar Nova Senha'}
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
                  ) : authModalTab === 'reset' ? null : authModalTab === 'login' ? (
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
