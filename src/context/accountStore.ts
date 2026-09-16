import { UserProfile } from '../types';

export interface StoredAccount {
  email: string;
  password?: string;
  profile: UserProfile;
}

// Clean up any legacy deleted-accounts key from localStorage across all browsers
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('imovelhub_deleted_accounts');
  } catch {
    // Ignore in SSR
  }
}

export const getStoredAccounts = (): StoredAccount[] => {
  try {
    const raw = localStorage.getItem('imovelhub_registered_accounts');
    const list: StoredAccount[] = raw ? JSON.parse(raw) : [];
    return list;
  } catch (e) {
    return [];
  }
};

export const removeStoredAccount = (email: string) => {
  try {
    const accounts = getStoredAccounts();
    const cleanEmail = email.trim().toLowerCase();
    const filtered = accounts.filter(a => a.email.toLowerCase() !== cleanEmail);
    localStorage.setItem('imovelhub_registered_accounts', JSON.stringify(filtered));
  } catch (e) {
    console.warn('Could not remove registered account:', e);
  }
};

// Always returns false - Supabase is the sole source of truth for accounts
export const isAccountDeleted = (_email: string): boolean => {
  return false;
};

export const unmarkAccountDeleted = (_email: string) => {
  // No-op
};

export const storeAccount = (email: string, password: string, profile: UserProfile) => {
  try {
    const accounts = getStoredAccounts();
    const cleanEmail = email.trim().toLowerCase();
    const existingIndex = accounts.findIndex(a => a.email.toLowerCase() === cleanEmail);
    const item: StoredAccount = { email: cleanEmail, password, profile };
    if (existingIndex >= 0) {
      accounts[existingIndex] = item;
    } else {
      accounts.push(item);
    }
    localStorage.setItem('imovelhub_registered_accounts', JSON.stringify(accounts));
  } catch (e) {
    console.warn('Could not save registered account:', e);
  }
};

