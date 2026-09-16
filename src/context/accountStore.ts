import { UserProfile } from '../types';
import { BROKERS } from '../lib/mockData';

export interface StoredAccount {
  email: string;
  password?: string;
  profile: UserProfile;
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

    // Register into permanently deleted accounts set
    const deletedRaw = localStorage.getItem('imovelhub_deleted_accounts');
    const deletedList: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
    if (!deletedList.includes(cleanEmail)) {
      deletedList.push(cleanEmail);
      localStorage.setItem('imovelhub_deleted_accounts', JSON.stringify(deletedList));
    }
  } catch (e) {
    console.warn('Could not remove registered account:', e);
  }
};

export const isAccountDeleted = (email: string): boolean => {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const deletedRaw = localStorage.getItem('imovelhub_deleted_accounts');
    const deletedList: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
    return deletedList.includes(cleanEmail);
  } catch (e) {
    return false;
  }
};

export const unmarkAccountDeleted = (email: string) => {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const deletedRaw = localStorage.getItem('imovelhub_deleted_accounts');
    const deletedList: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
    const filtered = deletedList.filter(e => e !== cleanEmail);
    localStorage.setItem('imovelhub_deleted_accounts', JSON.stringify(filtered));
  } catch (e) {
    console.warn('Could not unmark deleted account:', e);
  }
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
