import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { verifyCreciNational, CreciVerificationResult } from '../lib/creciVerification';
import { Toast } from './appTypes';

export interface AuthContextType {
  currentUser: UserProfile; isAuthenticated: boolean; authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void; authModalTab: 'login' | 'signup' | 'forgot';
  setAuthModalTab: (tab: 'login' | 'signup' | 'forgot') => void;
  openAuthModal: (tab?: 'login' | 'signup' | 'forgot') => void; closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<boolean>; loginWithGoogle: () => Promise<void>;
  signUp: (data: { name: string; email: string; password: string; role: 'broker' | 'buyer'; phone?: string; creci?: string }) => Promise<boolean>;
  logout: () => Promise<void>; deleteAccount: (password: string) => Promise<boolean>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  verifyCreci: (creci: string, uf: string) => Promise<CreciVerificationResult>;
  requestCreciReview: () => Promise<void>;
  switchUserRole: (role: 'broker' | 'buyer') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const GUEST_USER: UserProfile = { id: 'guest_buyer', name: 'Visitante Web Imóvel', email: '', role: 'buyer', verified: false };

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
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup' | 'forgot'>('login');

  const clearLegacy = useCallback(() => {
    ['imovelhub_is_authenticated','imovelhub_current_user','imovelhub_registered_accounts','imovelhub_deleted_accounts','imovelhub_supabase_url','imovelhub_supabase_anon_key','imovelhub_supabase_bucket'].forEach(k => localStorage.removeItem(k));
  }, []);
  const sync = useCallback(async (candidate?: any) => {
    if (!supabase) return;
    const user = candidate || (await supabase.auth.getUser()).data.user;
    if (!user) { setIsAuthenticated(false); setCurrentUser(GUEST_USER); setPreferencesReady(false); return; }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (error || !data) { await supabase.auth.signOut(); setIsAuthenticated(false); setCurrentUser(GUEST_USER); return; }
    const { data: privateData, error: preferencesError } = await supabase
      .from('profile_preferences').select('preferences').eq('user_id', user.id).maybeSingle();
    setPreferencesReady(!preferencesError);
    if (preferencesError) {
      addToast({ type: 'warning', title: 'Preferências indisponíveis', message: 'Não foi possível carregar suas preferências. Recarregue a página antes de editar o perfil.' });
    }
    setCurrentUser(toProfile(user, data, privateData?.preferences || {})); setIsAuthenticated(true);
  }, []);
  useEffect(() => {
    clearLegacy();
    if (!isSupabaseConfigured || !supabase) return;
    void sync();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { void sync(session?.user); });
    return () => subscription.unsubscribe();
  }, [clearLegacy, sync]);

  const client = () => { if (!supabase || !isSupabaseConfigured) throw new Error('Supabase não configurado na implantação.'); return supabase; };
  const openAuthModal = useCallback((tab: 'login' | 'signup' | 'forgot' = 'login') => { setAuthModalTab(tab); setAuthModalOpen(true); }, []);
  const closeAuthModal = useCallback(() => setAuthModalOpen(false), []);
  const login = async (email: string, password: string) => {
    try { const { data, error } = await client().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error || !data.user) {
        if (error) console.warn('Authentication was not completed:', error.message);
        addToast({ type: 'error', title: 'Não foi possível entrar', message: 'E-mail ou senha incorretos. Confira os dados e tente novamente.' });
        return false;
      }
      await sync(data.user); return true;
    } catch (e: any) {
      console.warn('Authentication connection error:', e?.message || e);
      addToast({ type: 'error', title: 'Não foi possível entrar', message: 'Não foi possível conectar ao serviço de acesso. Tente novamente em instantes.' });
      return false;
    }
  };
  const signUp = async (form: { name: string; email: string; password: string; role: 'broker' | 'buyer'; phone?: string; creci?: string }) => {
    try { const { data, error } = await client().auth.signUp({ email: form.email.trim().toLowerCase(), password: form.password, options: { data: { name: form.name.trim(), role: form.role, phone: form.phone || null, creci: form.creci || null } } });
      if (error || !data.user) {
        if (error) console.warn('Account registration was not completed:', error.message);
        addToast({ type: 'error', title: 'Cadastro não concluído', message: 'Não foi possível criar a conta agora. Confira os dados e tente novamente.' });
        return false;
      }
      if (data.session) await sync(data.user); addToast({ type: 'success', title: 'Conta criada', message: 'Cadastro realizado com sucesso.' }); return true;
    } catch (e: any) { addToast({ type: 'error', title: 'Erro de conexão', message: e.message }); return false; }
  };
  const logout = async () => { if (supabase) await supabase.auth.signOut(); setIsAuthenticated(false); setCurrentUser(GUEST_USER); setPreferencesReady(false); };
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
  const loginWithGoogle = async () => { throw new Error('Login Google ainda não foi configurado.'); };
  const deleteAccount = async (password: string) => {
    if (!isAuthenticated || currentUser.id === 'guest_buyer') throw new Error('Faça login novamente para excluir sua conta.');
    if (currentUser.role === 'admin') throw new Error('Contas administrativas não podem ser excluídas. Transfira e remova o privilégio antes de continuar.');
    const authClient = client();
    const { error: authenticationError } = await authClient.auth.signInWithPassword({ email: currentUser.email, password });
    if (authenticationError) throw new Error('Senha incorreta. A conta não foi excluída.');
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
  return <AuthContext.Provider value={{ currentUser, isAuthenticated, authModalOpen, setAuthModalOpen, authModalTab, setAuthModalTab, openAuthModal, closeAuthModal, login, loginWithGoogle, signUp, logout, deleteAccount, updateUserProfile, verifyCreci, requestCreciReview, switchUserRole }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used within an AuthProvider'); return context; };
