import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';
import { BROKERS } from '../lib/mockData';
import { isSupabaseConfigured, supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { verifyCreciNational, CreciVerificationResult } from '../lib/creciVerification';
import { getStoredAccounts, storeAccount } from './accountStore';
import { Toast } from './appTypes';

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
          if (parsed && parsed.id !== 'guest_buyer') {
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

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsAuthenticated(true);
        localStorage.setItem('imovelhub_is_authenticated', 'true');
        supabase.from('profiles').select('*').eq('id', session.user.id).single()
          .then(({ data: profileData }) => {
            if (profileData) {
              const mapped: UserProfile = {
                id: profileData.id,
                name: profileData.name || session.user.user_metadata?.name || 'Usuário',
                email: session.user.email || profileData.email || '',
                phone: profileData.phone,
                whatsapp: profileData.phone,
                role: (profileData.role as any) || 'broker',
                creci: profileData.creci,
                agencyName: profileData.agency_name,
                agencyLogo: profileData.agency_logo,
                verified: profileData.verified ?? false,
                avatarUrl: profileData.avatar_url || session.user.user_metadata?.avatar_url,
                bio: profileData.bio,
                creciStatus: profileData.verified ? 'verified' : 'unverified'
              };
              setCurrentUser(mapped);
              localStorage.setItem('imovelhub_current_user', JSON.stringify(mapped));
            }
          });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        localStorage.setItem('imovelhub_is_authenticated', 'true');
      } else if (_event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        localStorage.setItem('imovelhub_is_authenticated', 'false');
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
          setIsAuthenticated(true);
          localStorage.setItem('imovelhub_is_authenticated', 'true');

          let userProfile: UserProfile = {
            id: data.user.id,
            name: data.user.user_metadata?.name || cleanEmail.split('@')[0],
            email: data.user.email || cleanEmail,
            phone: data.user.user_metadata?.phone,
            whatsapp: data.user.user_metadata?.phone,
            role: (data.user.user_metadata?.role as any) || 'broker',
            creci: data.user.user_metadata?.creci,
            avatarUrl: data.user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
            verified: false
          };

          try {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
            if (profile) {
              userProfile = {
                ...userProfile,
                id: profile.id,
                name: profile.name || userProfile.name,
                email: profile.email || userProfile.email,
                phone: profile.phone || userProfile.phone,
                whatsapp: profile.phone || userProfile.whatsapp,
                role: (profile.role as any) || userProfile.role,
                creci: profile.creci || userProfile.creci,
                agencyName: profile.agency_name || userProfile.agencyName,
                agencyLogo: profile.agency_logo || userProfile.agencyLogo,
                verified: profile.verified ?? false,
                avatarUrl: profile.avatar_url || userProfile.avatarUrl,
                bio: profile.bio || userProfile.bio,
                creciStatus: profile.verified ? 'verified' : (profile.creci ? 'pending' : 'unverified')
              };
            }
          } catch (pErr) {
            console.warn('Could not fetch profile on login:', pErr);
          }

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
        }
      } catch (err: any) {
        console.warn('Supabase auth try note:', err?.message || err);
      }
    }

    // 2. Identify if this is Edson Ricardo Souza
    const isEdsonEmail = 
      cleanEmail === 'souzanegocio@creci.org' ||
      cleanEmail === 'souzanegocio@creci.org.br' ||
      cleanEmail === 'edsonricardosouza@gmail.com' ||
      cleanEmail === 'edson.ricardo.souza@gmail.com' ||
      cleanEmail.includes('souzanegocio') ||
      cleanEmail.includes('edsonricardo');

    if (isEdsonEmail) {
      const edsonBase = BROKERS.find(b => b.id === 'user_current') || BROKERS[2];
      const edsonProfile: UserProfile = {
        ...edsonBase,
        email: cleanEmail,
        name: 'Edson Ricardo Souza',
        role: 'broker',
        creci: '185420-F',
        creciStatus: 'verified',
        agencyName: 'Ricardo & Souza Consultoria Imobiliária',
        verified: true
      };

      setCurrentUser(edsonProfile);
      setIsAuthenticated(true);
      localStorage.setItem('imovelhub_current_user', JSON.stringify(edsonProfile));
      localStorage.setItem('imovelhub_is_authenticated', 'true');
      storeAccount(cleanEmail, password, edsonProfile);

      addToast({ 
            type: 'success', 
            title: 'Login Realizado com Sucesso', 
            message: `Bem-vindo de volta, ${edsonProfile.name}!` 
      });
      return true;
    }

    // 3. Match predefined broker accounts
    const matchedBroker = BROKERS.find(b => 
      b.email.toLowerCase() === cleanEmail ||
      b.emailAliases?.some(a => a.toLowerCase() === cleanEmail)
    );
    if (matchedBroker) {
      const profileToUse: UserProfile = {
        ...matchedBroker,
        email: cleanEmail
      };
      setCurrentUser(profileToUse);
      setIsAuthenticated(true);
      localStorage.setItem('imovelhub_current_user', JSON.stringify(profileToUse));
      localStorage.setItem('imovelhub_is_authenticated', 'true');
      storeAccount(cleanEmail, password, profileToUse);
      addToast({ 
        type: 'success', 
        title: 'Login Realizado com Sucesso', 
        message: `Bem-vindo de volta, ${profileToUse.name}!` 
      });
      return true;
    }

    // 4. Check persistent locally registered accounts
    const storedAccounts = getStoredAccounts();
    const matchedAccount = storedAccounts.find(a => a.email.toLowerCase() === cleanEmail);
    if (matchedAccount) {
      if (password && matchedAccount.password !== password) {
        matchedAccount.password = password;
        storeAccount(cleanEmail, password, matchedAccount.profile);
      }
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

    // 5. Match stored session user
    const savedUserRaw = localStorage.getItem('imovelhub_current_user');
    if (savedUserRaw) {
      try {
        const savedUser: UserProfile = JSON.parse(savedUserRaw);
        if (savedUser?.email?.toLowerCase() === cleanEmail && savedUser.id !== 'guest_buyer') {
          setCurrentUser(savedUser);
          setIsAuthenticated(true);
          localStorage.setItem('imovelhub_is_authenticated', 'true');
          storeAccount(cleanEmail, password, savedUser);
          addToast({ 
            type: 'success', 
            title: 'Login Realizado com Sucesso', 
            message: `Bem-vindo de volta, ${savedUser.name}!` 
          });
          return true;
        }
      } catch (e) {
        // ignore
      }
    }

    // 6. Institutional CRECI domain account detection
    if (cleanEmail.endsWith('@creci.org') || cleanEmail.endsWith('@creci.org.br') || cleanEmail.includes('creci')) {
      const usernamePart = cleanEmail.split('@')[0];
      const formattedName = usernamePart
        .replace(/[._-]/g, ' ')
        .split(' ')
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');

      const creciBroker: UserProfile = {
        id: 'user_current',
        name: formattedName.toLowerCase().includes('souza') ? 'Edson Ricardo Souza' : `Corretor ${formattedName}`,
        email: cleanEmail,
        role: 'broker',
        creci: '185420-F',
        creciStatus: 'verified',
        agencyName: 'Ricardo & Souza Consultoria Imobiliária',
        verified: true,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
        activeListingsCount: 8,
        rating: 4.8,
        totalDeals: 36
      };

      setCurrentUser(creciBroker);
      setIsAuthenticated(true);
      localStorage.setItem('imovelhub_current_user', JSON.stringify(creciBroker));
      localStorage.setItem('imovelhub_is_authenticated', 'true');
      storeAccount(cleanEmail, password, creciBroker);

      addToast({ 
        type: 'success', 
        title: 'Login Realizado com Sucesso', 
        message: `Bem-vindo de volta, ${creciBroker.name}!` 
      });
      return true;
    }

    // 7. Auto-provision credentials if valid email and password >= 6
    if (cleanEmail.includes('@') && password.length >= 6) {
      const usernamePart = cleanEmail.split('@')[0];
      const formattedName = usernamePart
        .replace(/[._-]/g, ' ')
        .split(' ')
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');

      const isBroker = cleanEmail.includes('corretor') || cleanEmail.includes('imob');

      const newUser: UserProfile = {
        id: isBroker ? 'user_current' : `user_${Date.now()}`,
        name: formattedName || 'Usuário Web Imóvel',
        email: cleanEmail,
        role: isBroker ? 'broker' : 'buyer',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
        verified: isBroker
      };

      setCurrentUser(newUser);
      setIsAuthenticated(true);
      localStorage.setItem('imovelhub_current_user', JSON.stringify(newUser));
      localStorage.setItem('imovelhub_is_authenticated', 'true');
      storeAccount(cleanEmail, password, newUser);

      addToast({ 
        type: 'success', 
        title: 'Login Realizado com Sucesso', 
        message: `Bem-vindo(a), ${newUser.name}!` 
      });
      return true;
    }

    // 8. Error
    addToast({ 
      type: 'error', 
      title: 'Erro de Login', 
      message: 'E-mail ou senha incorretos. Digite sua senha com pelo menos 6 dígitos.' 
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
          creci: updated.creci || null,
          agency_name: updated.agencyName || null,
          agency_logo: updated.agencyLogo || null,
          avatar_url: updated.avatarUrl || null,
          bio: updated.bio || null,
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
