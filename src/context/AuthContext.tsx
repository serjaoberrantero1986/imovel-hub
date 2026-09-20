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
  logout: () => Promise<void>; deleteAccount: () => Promise<boolean>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  verifyCreci: (creci: string, uf: string) => Promise<CreciVerificationResult>;
  switchUserRole: (role: 'broker' | 'buyer') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const GUEST_USER: UserProfile = { id: 'guest_buyer', name: 'Visitante Web Imóvel', email: '', role: 'buyer', verified: false };

const toProfile = (user: any, row: any): UserProfile => ({
  id: user.id, name: row.name, email: user.email || row.email, phone: row.phone, whatsapp: row.whatsapp,
  role: row.role, creci: row.creci, creciUf: row.creci_uf, agencyName: row.agency_name,
  agencyLogo: row.agency_logo, verified: row.verified, avatarUrl: row.avatar_url, bio: row.bio,
  city: row.city, state: row.state, website: row.website, instagram: row.instagram, linkedin: row.linkedin,
  creciStatus: row.verified ? 'verified' : (row.creci ? 'pending' : 'unverified'), authProvider: 'email'
});

export const AuthProvider: React.FC<{ children: React.ReactNode; addToast: (toast: Omit<Toast, 'id'>) => void }> = ({ children, addToast }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(GUEST_USER);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup' | 'forgot'>('login');

  const clearLegacy = useCallback(() => {
    ['imovelhub_is_authenticated','imovelhub_current_user','imovelhub_registered_accounts','imovelhub_deleted_accounts','imovelhub_supabase_url','imovelhub_supabase_anon_key','imovelhub_supabase_bucket'].forEach(k => localStorage.removeItem(k));
  }, []);
  const sync = useCallback(async (candidate?: any) => {
    if (!supabase) return;
    const user = candidate || (await supabase.auth.getUser()).data.user;
    if (!user) { setIsAuthenticated(false); setCurrentUser(GUEST_USER); return; }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (error || !data) { await supabase.auth.signOut(); setIsAuthenticated(false); setCurrentUser(GUEST_USER); return; }
    setCurrentUser(toProfile(user, data)); setIsAuthenticated(true);
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
      if (error || !data.user) { addToast({ type: 'error', title: 'Erro de autenticação', message: error?.message || 'Login não autorizado.' }); return false; }
      await sync(data.user); return true;
    } catch (e: any) { addToast({ type: 'error', title: 'Erro de conexão', message: e.message }); return false; }
  };
  const signUp = async (form: { name: string; email: string; password: string; role: 'broker' | 'buyer'; phone?: string; creci?: string }) => {
    try { const { data, error } = await client().auth.signUp({ email: form.email.trim().toLowerCase(), password: form.password, options: { data: { name: form.name.trim(), role: form.role, phone: form.phone || null, creci: form.creci || null } } });
      if (error || !data.user) { addToast({ type: 'error', title: 'Cadastro recusado', message: error?.message || 'Não foi possível criar a conta.' }); return false; }
      if (data.session) await sync(data.user); addToast({ type: 'success', title: 'Conta criada', message: 'Cadastro realizado com sucesso.' }); return true;
    } catch (e: any) { addToast({ type: 'error', title: 'Erro de conexão', message: e.message }); return false; }
  };
  const logout = async () => { if (supabase) await supabase.auth.signOut(); setIsAuthenticated(false); setCurrentUser(GUEST_USER); };
  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!isAuthenticated) throw new Error('Faça login para editar o perfil.');
    const payload: any = { name: updates.name, phone: updates.phone ?? null, whatsapp: updates.whatsapp ?? null, avatar_url: updates.avatarUrl ?? null, creci: updates.creci ?? null, creci_uf: updates.creciUf ?? null, agency_name: updates.agencyName ?? null, agency_logo: updates.agencyLogo ?? null, city: updates.city ?? null, state: updates.state ?? null, bio: updates.bio ?? null, website: updates.website ?? null, instagram: updates.instagram ?? null, linkedin: updates.linkedin ?? null };
    const { data, error } = await client().from('profiles').update(payload).eq('id', currentUser.id).select().single();
    if (error) throw error; setCurrentUser(toProfile({ id: currentUser.id, email: currentUser.email }, data));
  };
  const verifyCreci = async (creci: string, uf: string) => { const result = await verifyCreciNational(creci, uf, currentUser.name); if (result.isValid && result.isAccredited) await updateUserProfile({ creci: result.creciNumber, creciUf: result.creciUf }); return result; };
  const loginWithGoogle = async () => { throw new Error('Login Google ainda não foi configurado.'); };
  const deleteAccount = async () => { addToast({ type: 'warning', title: 'Exclusão indisponível', message: 'A exclusão será implementada por função segura no servidor.' }); return false; };
  const switchUserRole = (_role: 'broker' | 'buyer') => addToast({ type: 'info', title: 'Tipo de conta fixo', message: 'O tipo de conta é definido no cadastro.' });
  return <AuthContext.Provider value={{ currentUser, isAuthenticated, authModalOpen, setAuthModalOpen, authModalTab, setAuthModalTab, openAuthModal, closeAuthModal, login, loginWithGoogle, signUp, logout, deleteAccount, updateUserProfile, verifyCreci, switchUserRole }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used within an AuthProvider'); return context; };
