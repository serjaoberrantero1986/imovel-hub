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
    
    // Ensure Edson Ricardo Souza is always registered by default
    const hasEdson = list.some(a => 
      a.email.toLowerCase() === 'souzanegocio@creci.org' || 
      a.email.toLowerCase() === 'edsonricardosouza@gmail.com'
    );
    if (!hasEdson && BROKERS[2]) {
      list.push({
        email: 'souzanegocio@creci.org',
        password: '',
        profile: {
          ...BROKERS[2],
          email: 'souzanegocio@creci.org',
          emailAliases: ['edsonricardosouza@gmail.com', 'souzanegocio@creci.org', 'souzanegocio@creci.org.br']
        }
      });
      list.push({
        email: 'edsonricardosouza@gmail.com',
        password: '',
        profile: {
          ...BROKERS[2],
          email: 'edsonricardosouza@gmail.com'
        }
      });
    }
    return list;
  } catch (e) {
    return [];
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
