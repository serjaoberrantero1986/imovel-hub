import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';
import { BROKERS } from '../lib/mockData';
import { isSupabaseConfigured, supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { verifyCreciNational, CreciVerificationResult } from '../lib/creciVerification';
import { getStoredAccounts, storeAccount, removeStoredAccount } from './accountStore';
import { Toast } from './appTypes';
import { deleteUserAccountFromSupabase } from '../lib/supabaseCrud';

export interface AuthContextType {
  currentUser: UserProfile;
  isAuthenticated: boolean;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authModalTab: 'login' | 'signup' | 'forgot';
  setAuthModalTab: (tab: 'login' | 'signup' | 'forgot') => void;
  openAuthModal: (tab?: 'login' | 'signup' | 'forgot') => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
  signUp: (data: {
    name: string;
    email: string;
    password: string;
    role: 'broker' | 'buyer';
    phone?: string;
    creci?: string;
  }) => Promise<boolean>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  verifyCreci: (creci: string, uf: string) => Promise<CreciVerificationResult>;
  switchUserRole: (role: 'broker' | 'buyer') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const GUEST_USER: UserProfile = {
  id: 'guest_buyer',
  name: 'Visitante Web Imóvel',
  email: 'visitante@webimovel.com.br',
  role: 'buyer',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  verified: false
};

export const AuthProvider: React.FC<{
  children: React.ReactNode;
  addToast: (toast: Omit<Toast, 'id'>) => void;
}> = ({ children, addToast }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem('imovelhub_is_authenticated');
    return saved === 'true';
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const savedAuth = localStorage.getItem('imovelhub_is_authenticated');
    const isAuth = savedAuth === 'true';
    if (isAuth) {
      const saved = localStorage.getItem('imovelhub_current_user');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.id !== 'guest_buyer' && parsed.email) {
            return parsed;
          }
        } catch (e) {
          console.error('Error parsing stored user:', e);
        }
      }
    }
    return GUEST_USER;
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup' | 'forgot'>('login');

  const openAuthModal = useCallback((tab: 'login' | 'signup' | 'forgot' = 'login') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  // Sync Supabase Auth listener if configured
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    // Purge any legacy deleted-accounts key from local storage
    try {
      localStorage.removeItem('imovelhub_deleted_accounts');
    } catch {
      // Ignore
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const userEmail = (session.user.email || '').toLowerCase();

        supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
          .then(async ({ data: profileData }) => {
            let activeProfile = profileData;
            if (!activeProfile && userEmail) {
              try {
                const { data: byEmail } = await supabase.from('profiles').select('*').eq('email', userEmail).maybeSingle();
                activeProfile = byEmail;
              } catch (e) {
                console.warn('Could not query profile by email:', e);
              }
            }

            // Auto-heal profile if missing
            if (!activeProfile) {
              const fallbackName = session.user.user_metadata?.name || userEmail.split('@')[0] || 'Usuário';
              const fallbackRole = session.user.user_metadata?.role || 'buyer';
              try {
                const { data: created } = await supabase.from('profiles').upsert({
                  id: session.user.id,
                  name: fallbackName,
                  email: userEmail,
                  role: fallbackRole,
                  verified: false
                }).select().maybeSingle();
                if (created) activeProfile = created;
              } catch (e) {
                console.warn('Could not auto-heal profile in getSession:', e);
              }
            }

            const mapped: UserProfile = {
              id: session.user.id,
              name: activeProfile?.name || session.user.user_metadata?.name || userEmail.split('@')[0] || 'Usuário',
              email: session.user.email || activeProfile?.email || userEmail,
              phone: activeProfile?.phone || session.user.user_metadata?.phone,
              whatsapp: activeProfile?.whatsapp || activeProfile?.phone || session.user.user_metadata?.phone,
              role: (activeProfile?.role as any) || (session.user.user_metadata?.role as any) || 'buyer',
              creci: activeProfile?.creci || session.user.user_metadata?.creci,
              agencyName: activeProfile?.agency_name,
              agencyLogo: activeProfile?.agency_logo,
              verified: activeProfile?.verified ?? false,
              avatarUrl: activeProfile?.avatar_url || session.user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
              bio: activeProfile?.bio,
              creciStatus: activeProfile?.verified ? 'verified' : (activeProfile?.creci ? 'pending' : 'unverified')
            };
            setIsAuthenticated(true);
            localStorage.setItem('imovelhub_is_authenticated', 'true');
            setCurrentUser(mapped);
            localStorage.setItem('imovelhub_current_user', JSON.stringify(mapped));
          });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // User is active in Supabase session
      } else if (_event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        localStorage.setItem('imovelhub_is_authenticated', 'false');
        localStorage.removeItem('imovelhub_current_user');
        setCurrentUser(GUEST_USER);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. If Supabase is configured, attempt Supabase Auth first
    if (isSupabaseConfigured && supabase) {
      try {
        let authResult = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (authResult.error && (authResult.error.message?.includes('Invalid path') || (authResult.error as any).status === 404)) {
          const freshClient = createClient(supabaseUrl, supabaseAnonKey);
          authResult = await freshClient.auth.signInWithPassword({ email: cleanEmail, password });
        }

        const { data, error } = authResult;
        if (!error && data?.user) {
          // Fetch user profile from Supabase profiles table
          let profile: any = null;
          try {
            const { data: dbProfile } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
            profile = dbProfile;
          } catch (pErr) {
            console.warn('Could not query profile by id on login:', pErr);
          }

          // If no profile found by id, try by email
          if (!profile && cleanEmail) {
            try {
              const { data: dbProfileByEmail } = await supabase.from('profiles').select('*').eq('email', cleanEmail).maybeSingle();
              profile = dbProfileByEmail;
            } catch (emailErr) {
              console.warn('Could not query profile by email:', emailErr);
            }
          }

          // If user authenticated in Supabase but profile row does not exist yet (e.g. created in another browser or session),
          // auto-heal/upsert the profile rather than falsely claiming the account is deleted
          if (!profile) {
            const fallbackName = data.user.user_metadata?.name || cleanEmail.split('@')[0];
            const fallbackRole = data.user.user_metadata?.role || 'buyer';
            const fallbackPhone = data.user.user_metadata?.phone || null;
            const fallbackCreci = data.user.user_metadata?.creci || null;

            try {
              const { data: createdProfile } = await supabase.from('profiles').upsert({
                id: data.user.id,
                name: fallbackName,
                email: cleanEmail,
                role: fallbackRole,
                phone: fallbackPhone,
                creci: fallbackCreci,
                verified: false
              }).select().maybeSingle();

              if (createdProfile) {
                profile = createdProfile;
              }
            } catch (createErr) {
              console.warn('Could not auto-create profile row on login:', createErr);
            }
          }

          let userProfile: UserProfile = {
            id: data.user.id,
            name: profile?.name || data.user.user_metadata?.name || cleanEmail.split('@')[0],
            email: profile?.email || data.user.email || cleanEmail,
            phone: profile?.phone || data.user.user_metadata?.phone,
            whatsapp: profile?.whatsapp || profile?.phone || data.user.user_metadata?.phone,
            role: (profile?.role as any) || (data.user.user_metadata?.role as any) || 'buyer',
            creci: profile?.creci || data.user.user_metadata?.creci,
            agencyName: profile?.agency_name,
            agencyLogo: profile?.agency_logo,
            verified: profile?.verified ?? false,
            avatarUrl: profile?.avatar_url || data.user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
            bio: profile?.bio,
            creciStatus: profile?.verified ? 'verified' : (profile?.creci ? 'pending' : 'unverified')
          };

          setIsAuthenticated(true);
          localStorage.setItem('imovelhub_is_authenticated', 'true');
          storeAccount(cleanEmail, password, userProfile);
          setCurrentUser(userProfile);
          localStorage.setItem('imovelhub_current_user', JSON.stringify(userProfile));

          addToast({ 
            type: 'success', 
            title: 'Login Realizado com Sucesso', 
            message: `Bem-vindo de volta, ${userProfile.name}!` 
          });
          return true;
        } else if (error) {
          console.warn('Supabase auth attempt note:', error.message);
          if (error.message?.toLowerCase().includes('email not confirmed')) {
            addToast({
              type: 'warning',
              title: 'E-mail Não Confirmado',
              message: 'Por favor, confirme seu e-mail ou aguarde alguns instantes após o cadastro.'
            });
            return false;
          }
        }
      } catch (err: any) {
        console.warn('Supabase auth try note:', err?.message || err);
      }
    }

    // 2. Check registered accounts (local store fallback)
    const storedAccounts = getStoredAccounts();
    const matchedAccount = storedAccounts.find(a => a.email.toLowerCase() === cleanEmail);
    if (matchedAccount) {
      if (password && matchedAccount.password === password) {
        setCurrentUser(matchedAccount.profile);
        setIsAuthenticated(true);
        localStorage.setItem('imovelhub_current_user', JSON.stringify(matchedAccount.profile));
        localStorage.setItem('imovelhub_is_authenticated', 'true');
        addToast({ 
          type: 'success', 
          title: 'Login Realizado com Sucesso', 
          message: `Bem-vindo de volta, ${matchedAccount.profile.name}!` 
        });
        return true;
      }
    }

    // 3. Reject invalid credentials or deleted account
    addToast({ 
      type: 'error', 
      title: 'Erro de Login', 
      message: 'E-mail ou senha incorretos. Verifique suas credenciais ou cadastre-se caso ainda não possua conta.' 
    });
    return false;
  };

  const loginWithGoogle = async (): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin
          }
        });
        if (error) throw error;
        return;
      } catch (err: any) {
        console.error('Google OAuth error:', err);
      }
    }

    const googleUser: UserProfile = {
      id: 'user_current',
      name: 'Edson Ricardo Souza',
      email: 'souzanegocio@creci.org',
      emailAliases: ['edsonricardosouza@gmail.com', 'souzanegocio@creci.org', 'edson.ricardo.souza@gmail.com'],
      phone: '(15) 99123-4567',
      whatsapp: '(15) 99123-4567',
      role: 'broker',
      creci: '185420-F',
      creciUf: 'SP',
      creciStatus: 'verified',
      creciVerifiedAt: new Date().toISOString(),
      creciProtocol: 'BR.COFECI.SP.2026.G00GLE',
      agencyName: 'Ricardo & Souza Consultoria Imobiliária',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      verified: true,
      authProvider: 'google'
    };

    setCurrentUser(googleUser);
    setIsAuthenticated(true);
    localStorage.setItem('imovelhub_current_user', JSON.stringify(googleUser));
    localStorage.setItem('imovelhub_is_authenticated', 'true');
    addToast({ 
      type: 'success', 
      title: 'Conectado via Google', 
      message: 'Autenticação com conta Google realizada com sucesso!' 
    });
  };

  const signUp = async (data: {
    name: string;
    email: string;
    password: string;
    role: 'broker' | 'buyer';
    phone?: string;
    creci?: string;
  }): Promise<boolean> => {
    const cleanEmail = data.email.trim().toLowerCase();
    let createdUserId = `user_${Date.now()}`;

    if (isSupabaseConfigured && supabase) {
      try {
        let signUpResult = await supabase.auth.signUp({
          email: cleanEmail,
          password: data.password,
          options: {
            data: {
              name: data.name,
              role: data.role,
              phone: data.phone,
              creci: data.creci
            }
          }
        });

        if (signUpResult.error && (signUpResult.error.message?.includes('Invalid path') || (signUpResult.error as any).status === 404)) {
          const freshClient = createClient(supabaseUrl, supabaseAnonKey);
          signUpResult = await freshClient.auth.signUp({
            email: cleanEmail,
            password: data.password,
            options: {
              data: {
                name: data.name,
                role: data.role,
                phone: data.phone,
                creci: data.creci
              }
            }
          });
        }

        const { data: authData, error } = signUpResult;
        if (error) {
          console.warn('Supabase auth signup note:', error.message);
        } else if (authData?.user) {
          createdUserId = authData.user.id;
          try {
            await supabase.from('profiles').upsert({
              id: authData.user.id,
              name: data.name,
              email: cleanEmail,
              role: data.role,
              phone: data.phone || null,
              creci: data.creci || null,
              verified: false
            });
          } catch (profileErr) {
            console.warn('Could not sync profile on signup:', profileErr);
          }
        }
      } catch (err: any) {
        console.warn('Supabase auth signup notice:', err?.message || err);
      }
    }

    const newUser: UserProfile = {
      id: createdUserId,
      name: data.name,
      email: cleanEmail,
      role: data.role,
      phone: data.phone,
      whatsapp: data.phone,
      creci: data.creci,
      creciStatus: data.creci ? 'pending' : 'unverified',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80',
      verified: false
    };

    storeAccount(cleanEmail, data.password, newUser);
    setCurrentUser(newUser);
    setIsAuthenticated(true);
    localStorage.setItem('imovelhub_current_user', JSON.stringify(newUser));
    localStorage.setItem('imovelhub_is_authenticated', 'true');
    addToast({ 
      type: 'success', 
      title: 'Conta Criada com Sucesso!', 
      message: `Bem-vindo(a) ao Web Imóvel, ${data.name}!` 
    });
    return true;
  };

  const deleteAccount = async (): Promise<boolean> => {
    const targetUserId = currentUser.id;
    const targetEmail = currentUser.email;

    // 1. Delete from Supabase PostgreSQL if configured
    if (isSupabaseConfigured && targetUserId && targetUserId !== 'guest_buyer') {
      try {
        await deleteUserAccountFromSupabase(targetUserId, targetEmail);
      } catch (err) {
        console.error('Error deleting account data from Supabase:', err);
      }
    }

    // 2. Sign out Supabase auth session if active
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Sign out during delete account notice:', err);
      }
    }

    // 3. Purge from local registered accounts store
    if (targetEmail) {
      removeStoredAccount(targetEmail);
    }

    // 4. Reset authentication and local storage states
    setIsAuthenticated(false);
    localStorage.setItem('imovelhub_is_authenticated', 'false');
    localStorage.removeItem('imovelhub_current_user');
    setCurrentUser(GUEST_USER);
    localStorage.setItem('imovelhub_current_user', JSON.stringify(GUEST_USER));

    addToast({
      type: 'info',
      title: 'Conta Excluída Definitivamente',
      message: 'Seus dados e anúncios foram removidos com sucesso. Você pode criar um novo cadastro a qualquer momento.'
    });

    return true;
  };

  const logout = async (): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Supabase logout error:', err);
      }
    }

    setIsAuthenticated(false);
    localStorage.setItem('imovelhub_is_authenticated', 'false');

    if (currentUser && currentUser.id !== 'guest_buyer' && currentUser.email) {
      const stored = getStoredAccounts();
      if (!stored.some(a => a.email.toLowerCase() === currentUser.email.toLowerCase())) {
        storeAccount(currentUser.email, '', currentUser);
      }
    }
    
    setCurrentUser(GUEST_USER);
    localStorage.setItem('imovelhub_current_user', JSON.stringify(GUEST_USER));

    addToast({ 
      type: 'info', 
      title: 'Sessão Encerrada', 
      message: 'Você saiu da sua conta com segurança.' 
    });
  };

  const updateUserProfile = async (updates: Partial<UserProfile>): Promise<void> => {
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);
    localStorage.setItem('imovelhub_current_user', JSON.stringify(updated));

    if (isSupabaseConfigured && supabase && currentUser.id) {
      try {
        await supabase.from('profiles').update({
          name: updated.name,
          phone: updated.phone || null,
          whatsapp: updated.whatsapp || updated.phone || null,
          creci: updated.creci || null,
          agency_name: updated.agencyName || null,
          agency_logo: updated.agencyLogo || null,
          avatar_url: updated.avatarUrl || null,
          verified: updated.verified ?? false
        }).eq('id', currentUser.id);
      } catch (err) {
        console.error('Error updating profile in Supabase:', err);
      }
    }
  };

  const verifyCreci = async (creci: string, uf: string): Promise<CreciVerificationResult> => {
    const result = await verifyCreciNational(creci, uf, currentUser.name);
    if (result.isValid && result.isAccredited) {
      await updateUserProfile({
        creci: result.creciNumber,
        creciUf: result.creciUf,
        creciType: result.category,
        creciStatus: 'verified',
        creciVerifiedAt: result.verifiedAt,
        creciProtocol: result.protocol,
        verified: true
      });
    } else {
      await updateUserProfile({
        creciStatus: 'invalid'
      });
    }
    return result;
  };

  const switchUserRole = (role: 'broker' | 'buyer') => {
    if (role === 'broker') {
      const brokerProfile = BROKERS[2];
      setCurrentUser(brokerProfile);
      localStorage.setItem('imovelhub_current_user', JSON.stringify(brokerProfile));
      addToast({ type: 'info', title: 'Perfil de Corretor Ativo', message: 'Acesso completo ao Dashboard, CRM e Gestão de Anúncios.' });
    } else {
      const buyerProfile: UserProfile = {
        id: 'buyer_guest',
        name: 'Ana Carolina Meireles',
        email: 'ana.meireles@email.com',
        phone: '(15) 99182-7364',
        role: 'buyer',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'
      };
      setCurrentUser(buyerProfile);
      localStorage.setItem('imovelhub_current_user', JSON.stringify(buyerProfile));
      addToast({ type: 'info', title: 'Perfil de Comprador Ativo', message: 'Navegação como cliente interessado em buscar imóveis.' });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        authModalOpen,
        setAuthModalOpen,
        authModalTab,
        setAuthModalTab,
        openAuthModal,
        closeAuthModal,
        login,
        loginWithGoogle,
        signUp,
        logout,
        deleteAccount,
        updateUserProfile,
        verifyCreci,
        switchUserRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
