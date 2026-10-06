import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { verifyCreciNational, CreciVerificationResult } from '../lib/creciVerification';
import { Toast } from './appTypes';
import { isStrongPassword } from '../lib/passwordPolicy';

export type LoginResult = 'authenticated' | 'mfa_required' | 'security_error' | false;
export type SignupResult = 'authenticated' | 'confirmation_required' | false;
export interface TotpFactorSummary { id: string; friendlyName: string; createdAt?: string; }
export interface TotpEnrollment { factorId: string; qrCode: string; secret: string; }

export interface AuthContextType {
  currentUser: UserProfile; isAuthenticated: boolean; authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void; authModalTab: 'login' | 'signup' | 'forgot' | 'reset' | 'mfa';
  setAuthModalTab: (tab: 'login' | 'signup' | 'forgot' | 'reset' | 'mfa') => void;
  openAuthModal: (tab?: 'login' | 'signup' | 'forgot' | 'reset' | 'mfa') => void; closeAuthModal: () => void;
  login: (email: string, password: string, captchaToken: string) => Promise<LoginResult>;
  loginWithGoogle: () => Promise<boolean>;
  signUp: (data: { name: string; email: string; password: string; role: 'broker' | 'buyer'; phone?: string; creci?: string; captchaToken: string }) => Promise<SignupResult>;
  resendSignupConfirmation: (email: string, captchaToken: string) => Promise<boolean>;
  requestPasswordReset: (email: string, captchaToken: string) => Promise<boolean>;
  changePassword: (newPassword: string, currentPassword?: string) => Promise<boolean>;
  mfaChallengeFactors: TotpFactorSummary[];
  selectMfaChallengeFactor: (factorId: string) => void;
  verifyMfaChallenge: (code: string) => Promise<boolean>;
  cancelMfaChallenge: () => Promise<void>;
  listTotpFactors: () => Promise<TotpFactorSummary[]>;
  enrollTotp: () => Promise<TotpEnrollment>;
  verifyTotpEnrollment: (factorId: string, code: string) => Promise<boolean>;
  cancelTotpEnrollment: (factorId: string) => Promise<void>;
  unenrollTotp: (factorId: string) => Promise<boolean>;
  logout: () => Promise<void>; deleteAccount: (password: string, captchaToken: string, mfaCode?: string) => Promise<boolean>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  verifyCreci: (creci: string, uf: string) => Promise<CreciVerificationResult>;
  requestCreciReview: () => Promise<void>;
  switchUserRole: (role: 'broker' | 'buyer') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const GUEST_USER: UserProfile = { id: 'guest_buyer', name: 'Visitante Web Imóvel', email: '', role: 'buyer', verified: false };
const isCaptchaFailure = (error: any) => /captcha|turnstile|challenge/i.test(`${error?.code || ''} ${error?.message || ''}`);

const toProfile = (user: any, row: any, preferences: UserProfile['preferences'] = {}): UserProfile => ({
  id: user.id, name: row.name, email: user.email || row.email, phone: row.phone, whatsapp: row.whatsapp,
  role: row.role, creci: row.creci, creciUf: row.creci_uf, agencyName: row.agency_name,
  agencyLogo: row.agency_logo, verified: row.verified, avatarUrl: row.avatar_url, bio: row.bio,
  city: row.city, state: row.state, website: row.website, instagram: row.instagram, linkedin: row.linkedin,
  creciType: row.creci_type, creciStatus: row.creci_status || (row.creci ? 'pending' : 'unverified'),
  creciVerifiedAt: row.creci_verified_at, creciProtocol: row.creci_protocol,
  creciReviewStatus: row.creci_review_status || 'not_requested',
  creciReviewedAt: row.creci_reviewed_at, creciReviewExpiresAt: row.creci_review_expires_at,
  availableWeekendVisits: row.available_weekend_visits ?? false, authProvider: 'email', preferences
});

export const AuthProvider: React.FC<{ children: React.ReactNode; addToast: (toast: Omit<Toast, 'id'>) => void }> = ({ children, addToast }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(GUEST_USER);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup' | 'forgot' | 'reset' | 'mfa'>('login');
  const [mfaChallengeFactorId, setMfaChallengeFactorId] = useState<string | null>(null);
  const [mfaChallengeFactors, setMfaChallengeFactors] = useState<TotpFactorSummary[]>([]);
  const [mfaReturnTab, setMfaReturnTab] = useState<'reset' | null>(null);

  const clearLegacy = useCallback(() => {
    ['imovelhub_is_authenticated','imovelhub_current_user','imovelhub_registered_accounts','imovelhub_deleted_accounts','imovelhub_supabase_url','imovelhub_supabase_anon_key','imovelhub_supabase_bucket'].forEach(k => localStorage.removeItem(k));
  }, []);
  const sync = useCallback(async (candidate?: any) => {
    if (!supabase) return;
    const user = candidate || (await supabase.auth.getUser()).data.user;
    if (!user) { setIsAuthenticated(false); setCurrentUser(GUEST_USER); setPreferencesReady(false); return; }
    const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError) throw assuranceError;
    if (assurance?.nextLevel === 'aal2' && assurance.currentLevel !== 'aal2') {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;
      const verifiedFactor = factors.totp.find(factor => factor.status === 'verified');
      if (!verifiedFactor) throw new Error('Fator de autenticação não encontrado.');
      const availableFactors = factors.totp.map(factor => ({ id: factor.id, friendlyName: factor.friendly_name || 'Aplicativo autenticador', createdAt: factor.created_at }));
      setMfaChallengeFactors(availableFactors);
      setMfaChallengeFactorId(verifiedFactor.id);
      setIsAuthenticated(false);
      setCurrentUser(GUEST_USER);
      setPreferencesReady(false);
      setAuthModalTab('mfa');
      setAuthModalOpen(true);
      return false;
    }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (error || !data) { await supabase.auth.signOut(); setIsAuthenticated(false); setCurrentUser(GUEST_USER); return; }
    const { data: privateData, error: preferencesError } = await supabase
      .from('profile_preferences').select('preferences').eq('user_id', user.id).maybeSingle();
    setPreferencesReady(!preferencesError);
    if (preferencesError) {
      addToast({ type: 'warning', title: 'Preferências indisponíveis', message: 'Não foi possível carregar suas preferências. Recarregue a página antes de editar o perfil.' });
    }
    setMfaChallengeFactorId(null);
    setMfaChallengeFactors([]);
    setCurrentUser(toProfile(user, data, privateData?.preferences || {})); setIsAuthenticated(true);
    return true;
  }, []);
  useEffect(() => {
    clearLegacy();
    if (!isSupabaseConfigured || !supabase) return;
    void sync();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') { setMfaReturnTab('reset'); setAuthModalTab('reset'); setAuthModalOpen(true); }
      void sync(session?.user);
    });
    return () => subscription.unsubscribe();
  }, [clearLegacy, sync]);

  const client = () => { if (!supabase || !isSupabaseConfigured) throw new Error('Supabase não configurado na implantação.'); return supabase; };
  const openAuthModal = useCallback((tab: 'login' | 'signup' | 'forgot' | 'reset' | 'mfa' = 'login') => { setAuthModalTab(tab); setAuthModalOpen(true); }, []);
  const closeAuthModal = useCallback(() => setAuthModalOpen(false), []);
  const login = async (email: string, password: string, captchaToken: string): Promise<LoginResult> => {
    try { const { data, error } = await client().auth.signInWithPassword({ email: email.trim().toLowerCase(), password, options: { captchaToken } });
      if (error || !data.user) {
        if (error) console.warn('Authentication was not completed:', error.message);
        if (isCaptchaFailure(error)) {
          addToast({ type: 'error', title: 'Verificação de segurança recusada', message: 'Atualize a página, conclua novamente o Turnstile e tente entrar.' });
          return 'security_error';
        }
        addToast({ type: 'error', title: 'Não foi possível entrar', message: 'E-mail ou senha incorretos. Confira os dados e tente novamente.' });
        return false;
      }
      setMfaReturnTab(null);
      const fullyAuthenticated = await sync(data.user);
      return fullyAuthenticated ? 'authenticated' : 'mfa_required';
    } catch (e: any) {
      console.warn('Authentication connection error:', e?.message || e);
      addToast({ type: 'error', title: 'Não foi possível entrar', message: 'Não foi possível conectar ao serviço de acesso. Tente novamente em instantes.' });
      return false;
    }
  };
  const loginWithGoogle = async () => {
    try {
      const { error } = await client().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.warn('Google OAuth was not started:', error?.message || error);
      addToast({
        type: 'error',
        title: 'Acesso com Google indisponível',
        message: 'Não foi possível iniciar o Google OAuth. Verifique se o provedor está habilitado no Supabase.',
      });
      return false;
    }
  };
  const signUp = async (form: { name: string; email: string; password: string; role: 'broker' | 'buyer'; phone?: string; creci?: string; captchaToken: string }) => {
    if (!isStrongPassword(form.password)) { addToast({ type: 'warning', title: 'Senha insuficiente', message: 'Use pelo menos 10 caracteres, incluindo maiúscula, minúscula, número e símbolo.' }); return false; }
    try { const { data, error } = await client().auth.signUp({ email: form.email.trim().toLowerCase(), password: form.password, options: { captchaToken: form.captchaToken, emailRedirectTo: window.location.origin, data: { name: form.name.trim(), role: form.role, phone: form.phone || null, creci: form.creci || null } } });
      if (error || !data.user) {
        if (error) console.warn('Account registration was not completed:', error.message);
        addToast({ type: 'error', title: isCaptchaFailure(error) ? 'Verificação de segurança recusada' : 'Cadastro não concluído', message: isCaptchaFailure(error) ? 'Atualize a página, conclua novamente o Turnstile e tente cadastrar.' : 'Não foi possível criar a conta agora. Confira os dados e tente novamente.' });
        return false;
      }
      if (data.session) await sync(data.user);
      addToast({ type: 'success', title: data.session ? 'Conta criada' : 'Confirme seu e-mail', message: data.session ? 'Cadastro realizado com sucesso.' : 'Enviamos um link de uso único. Confirme o endereço antes de entrar.' });
      return data.session ? 'authenticated' : 'confirmation_required';
    } catch (e: any) { addToast({ type: 'error', title: 'Erro de conexão', message: e.message }); return false; }
  };
  const resendSignupConfirmation = async (email: string, captchaToken: string) => {
    const { error } = await client().auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: window.location.origin, captchaToken }
    });
    if (error) {
      addToast({ type: 'error', title: isCaptchaFailure(error) ? 'Verificação de segurança recusada' : 'Link não reenviado', message: isCaptchaFailure(error) ? 'Conclua novamente o Turnstile e tente reenviar.' : 'Aguarde alguns instantes e tente novamente.' });
      return false;
    }
    addToast({ type: 'success', title: 'Novo link enviado', message: 'Confira sua caixa de entrada e também a pasta de spam.' });
    return true;
  };
  const requestPasswordReset = async (email: string, captchaToken: string) => {
    const { error } = await client().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: window.location.origin, captchaToken });
    if (error) { addToast({ type: 'error', title: isCaptchaFailure(error) ? 'Verificação de segurança recusada' : 'Recuperação não enviada', message: isCaptchaFailure(error) ? 'Conclua novamente o Turnstile e tente outra vez.' : 'Aguarde alguns instantes e tente novamente.' }); return false; }
    return true;
  };
  const changePassword = async (newPassword: string, currentPassword?: string) => {
    if (!isStrongPassword(newPassword)) { addToast({ type: 'warning', title: 'Senha insuficiente', message: 'A nova senha não atende aos requisitos de segurança.' }); return false; }
    const authClient = client();
    const { error } = await authClient.auth.updateUser({ password: newPassword, ...(currentPassword ? { current_password: currentPassword } : {}) });
    if (error) { addToast({ type: 'error', title: 'Senha não alterada', message: currentPassword ? 'Confira a senha atual e tente novamente.' : 'O link pode ter expirado. Solicite uma nova recuperação.' }); return false; }
    addToast({ type: 'success', title: 'Senha alterada', message: 'Sua senha foi atualizada com segurança.' });
    return true;
  };
  const verifyMfaChallenge = async (code: string) => {
    if (!mfaChallengeFactorId) return false;
    const { error } = await client().auth.mfa.challengeAndVerify({ factorId: mfaChallengeFactorId, code: code.replace(/\D/g, '') });
    if (error) { addToast({ type: 'error', title: 'Código inválido', message: 'Confira o código do aplicativo autenticador e tente novamente.' }); return false; }
    const { data: userData } = await client().auth.getUser();
    await sync(userData.user);
    if (mfaReturnTab === 'reset') { setMfaReturnTab(null); setAuthModalTab('reset'); setAuthModalOpen(true); }
    else setAuthModalOpen(false);
    return true;
  };
  const cancelMfaChallenge = async () => {
    await client().auth.signOut();
    setMfaChallengeFactorId(null); setMfaChallengeFactors([]); setMfaReturnTab(null); setAuthModalOpen(false); setAuthModalTab('login');
    setIsAuthenticated(false); setCurrentUser(GUEST_USER); setPreferencesReady(false);
  };
  const listTotpFactors = async (): Promise<TotpFactorSummary[]> => {
    const { data, error } = await client().auth.mfa.listFactors();
    if (error) throw error;
    await Promise.all(data.all.filter(factor => factor.factor_type === 'totp' && factor.status === 'unverified').map(factor => client().auth.mfa.unenroll({ factorId: factor.id })));
    return data.totp.map(factor => ({ id: factor.id, friendlyName: factor.friendly_name || 'Aplicativo autenticador', createdAt: factor.created_at }));
  };
  const enrollTotp = async (): Promise<TotpEnrollment> => {
    const { data, error } = await client().auth.mfa.enroll({ factorType: 'totp', friendlyName: `Web Imóveis · ${new Date().toLocaleDateString('pt-BR')}` });
    if (error) throw error;
    return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
  };
  const verifyTotpEnrollment = async (factorId: string, code: string) => {
    const { error } = await client().auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\D/g, '') });
    if (error) { addToast({ type: 'error', title: 'Código não confirmado', message: 'Use o código atual do aplicativo autenticador.' }); return false; }
    addToast({ type: 'success', title: 'Autenticação em duas etapas ativada', message: 'Os próximos acessos exigirão o código do seu aplicativo.' });
    return true;
  };
  const cancelTotpEnrollment = async (factorId: string) => { const { error } = await client().auth.mfa.unenroll({ factorId }); if (error) throw error; };
  const unenrollTotp = async (factorId: string) => {
    const { error } = await client().auth.mfa.unenroll({ factorId });
    if (error) { addToast({ type: 'error', title: 'Não foi possível desativar', message: 'Confirme novamente sua sessão e tente outra vez.' }); return false; }
    addToast({ type: 'success', title: 'Autenticação em duas etapas desativada' }); return true;
  };
  const logout = async () => { if (supabase) await supabase.auth.signOut(); setMfaChallengeFactorId(null); setMfaChallengeFactors([]); setMfaReturnTab(null); setIsAuthenticated(false); setCurrentUser(GUEST_USER); setPreferencesReady(false); };
  const updateUserProfile = async (patch: Partial<UserProfile>) => {
    if (!isAuthenticated) throw new Error('Faça login para editar o perfil.');
    if (!preferencesReady) throw new Error('Recarregue suas preferências antes de salvar.');
    const updates = { ...currentUser, ...patch };
    if (updates.preferences?.maxPrice !== undefined &&
        (!Number.isFinite(updates.preferences.maxPrice) || updates.preferences.maxPrice < 0)) {
      throw new Error('Informe um preço máximo válido.');
    }
    const payload: any = { name: updates.name, phone: updates.phone ?? null, whatsapp: updates.whatsapp ?? null, avatar_url: updates.avatarUrl ?? null, creci: updates.creci ?? null, creci_uf: updates.creciUf ?? null, creci_type: updates.creciType ?? null, creci_status: updates.creciStatus ?? 'unverified', creci_verified_at: updates.creciVerifiedAt ?? null, creci_protocol: updates.creciProtocol ?? null, agency_name: updates.agencyName ?? null, agency_logo: updates.agencyLogo ?? null, city: updates.city ?? null, state: updates.state ?? null, bio: updates.bio ?? null, website: updates.website ?? null, instagram: updates.instagram ?? null, linkedin: updates.linkedin ?? null, available_weekend_visits: updates.availableWeekendVisits ?? false };
    const { data, error } = await client().rpc('save_my_profile', {
      p_profile: payload,
      p_preferences: {
        purpose: 'sale', alertEmail: true, alertWhatsapp: true, allowPartnerContact: true,
        ...updates.preferences
      }
    });
    if (error || !data?.profile || !data?.preferences) throw error || new Error('Salvamento não confirmado.');
    setCurrentUser(toProfile({ id: currentUser.id, email: currentUser.email }, data.profile, data.preferences));
  };
  const verifyCreci = async (creci: string, uf: string) => { const result = await verifyCreciNational(creci, uf, currentUser.name); if (result.isValid && result.isAccredited) await updateUserProfile({ creci: result.creciNumber, creciUf: result.creciUf }); return result; };
  const requestCreciReview = async () => {
    if (!isAuthenticated) throw new Error('Faça login para solicitar a análise.');
    const { error } = await client().rpc('request_my_creci_review');
    if (error) throw error;
    await sync();
  };
  const deleteAccount = async (password: string, captchaToken: string, mfaCode?: string) => {
    if (!isAuthenticated || currentUser.id === 'guest_buyer') throw new Error('Faça login novamente para excluir sua conta.');
    if (currentUser.role === 'admin') throw new Error('Contas administrativas não podem ser excluídas. Transfira e remova o privilégio antes de continuar.');
    const authClient = client();
    const { data: factorsData, error: factorsError } = await authClient.auth.mfa.listFactors();
    if (factorsError) throw factorsError;
    const verifiedTotp = factorsData.totp.find(factor => factor.status === 'verified');
    if (verifiedTotp) {
      if (!mfaCode) throw new Error('Informe o código do aplicativo autenticador.');
      const { error: mfaError } = await authClient.auth.mfa.challengeAndVerify({ factorId: verifiedTotp.id, code: mfaCode.replace(/\D/g, '') });
      if (mfaError) throw new Error('Código do aplicativo autenticador inválido.');
    } else {
      const { error: authenticationError } = await authClient.auth.signInWithPassword({ email: currentUser.email, password, options: { captchaToken } });
      if (authenticationError) throw new Error('Senha incorreta. A conta não foi excluída.');
    }
    const { data: prepared, error: preparationError } = await authClient.rpc('begin_my_account_deletion');
    if (preparationError || prepared !== true) throw preparationError || new Error('Não foi possível preparar a exclusão segura.');

    const { data: documents, error: documentsError } = await authClient
      .from('creci_verification_documents').select('storage_path');
    if (documentsError) throw documentsError;
    const documentPaths = (documents || []).map((item: any) => item.storage_path).filter(Boolean);
    if (documentPaths.length > 0) {
      const { error: storageError } = await authClient.storage.from('creci-verification').remove(documentPaths);
      if (storageError) throw new Error(`Não foi possível remover os documentos privados: ${storageError.message}`);
    }

    const { data: ownedProperties, error: propertiesError } = await authClient.from('properties').select('id').eq('user_id', currentUser.id);
    if (propertiesError) throw propertiesError;
    const propertyBucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'property-images';
    for (const property of ownedProperties || []) {
      const folder = `properties/${property.id}`;
      const { data: files, error: listError } = await authClient.storage.from(propertyBucket).list(folder, { limit: 1000 });
      if (listError) throw new Error(`Não foi possível conferir as imagens do anúncio: ${listError.message}`);
      const paths = (files || []).filter(file => file.name).map(file => `${folder}/${file.name}`);
      if (paths.length > 0) {
        const { error: removalError } = await authClient.storage.from(propertyBucket).remove(paths);
        if (removalError) throw new Error(`Não foi possível remover as imagens do anúncio: ${removalError.message}`);
      }
    }
    const { data, error } = await authClient.rpc('delete_my_account');
    if (error || data !== true) {
      console.warn('Account deletion was not confirmed:', error?.message || 'Unexpected server response');
      throw new Error('Não foi possível concluir a exclusão da conta. Tente novamente em instantes.');
    }
    try { await authClient.auth.signOut({ scope: 'local' }); } catch { /* The Auth row is already gone. */ }
    setIsAuthenticated(false);
    setCurrentUser(GUEST_USER);
    setPreferencesReady(false);
    addToast({ type: 'success', title: 'Conta excluída definitivamente' });
    return true;
  };
  const switchUserRole = (_role: 'broker' | 'buyer') => addToast({ type: 'info', title: 'Tipo de conta fixo', message: 'O tipo de conta é definido no cadastro.' });
  return <AuthContext.Provider value={{ currentUser, isAuthenticated, authModalOpen, setAuthModalOpen, authModalTab, setAuthModalTab, openAuthModal, closeAuthModal, login, loginWithGoogle, signUp, resendSignupConfirmation, requestPasswordReset, changePassword, mfaChallengeFactors, selectMfaChallengeFactor: setMfaChallengeFactorId, verifyMfaChallenge, cancelMfaChallenge, listTotpFactors, enrollTotp, verifyTotpEnrollment, cancelTotpEnrollment, unenrollTotp, logout, deleteAccount, updateUserProfile, verifyCreci, requestCreciReview, switchUserRole }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used within an AuthProvider'); return context; };
