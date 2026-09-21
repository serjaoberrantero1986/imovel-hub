import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Lead, LeadTask, LeadInteraction, Property } from '../types';
import { 
  fetchLeadsFromSupabase,
  insertLeadToSupabase,
  updateLeadInSupabase,
  deleteLeadFromSupabase,
  updateLeadMetadataInSupabase,
  updatePropertyInSupabase
} from '../lib/supabaseCrud';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { Toast } from './appTypes';
import { UserProfile } from '../types';

export interface CrmContextType {
  leads: Lead[];
  viewedLeadIds: string[];
  unreadLeadsCount: number;
  markLeadAsViewed: (leadId: string) => void;
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean; error?: string }>;
  updateLead: (leadId: string, updates: Partial<Lead>) => Promise<void>;
  updateLeadStatus: (leadId: string, status: Lead['status'], notes?: string) => Promise<void>;
  updateLeadNotes: (leadId: string, notes: string, privateNotes?: string) => Promise<void>;
  addLeadTask: (leadId: string, task: Omit<LeadTask, 'id'>) => Promise<void>;
  toggleLeadTask: (leadId: string, taskId: string) => Promise<void>;
  deleteLeadTask: (leadId: string, taskId: string) => Promise<void>;
  addLeadInteraction: (leadId: string, interaction: Omit<LeadInteraction, 'id' | 'createdAt'>) => Promise<void>;
  addLeadTag: (leadId: string, tag: string) => Promise<void>;
  removeLeadTag: (leadId: string, tag: string) => Promise<void>;
  toggleLeadInterestProperty: (leadId: string, propertyId: string) => Promise<void>;
  toggleLeadPrivacy: (leadId: string) => Promise<void>;
  deleteLead: (leadId: string) => Promise<void>;
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  refreshLeads: () => Promise<void>;
}

const CrmContext = createContext<CrmContextType | undefined>(undefined);

export const CrmProvider: React.FC<{
  children: React.ReactNode;
  currentUser: UserProfile;
  properties: Property[];
  setProperties: React.Dispatch<React.SetStateAction<Property[]>>;
  addToast: (toast: Omit<Toast, 'id'>) => void;
}> = ({ children, currentUser, properties, setProperties, addToast }) => {
  const [leads, setLeads] = useState<Lead[]>([]);

  // Track leads viewed by the current user to compute accurate unread counts
  const [viewedLeadIds, setViewedLeadIds] = useState<string[]>(() => {
    try {
      const key = `imovelhub_viewed_leads_${currentUser?.id || 'guest'}`;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Keep viewed leads synced when user changes
  useEffect(() => {
    try {
      const key = `imovelhub_viewed_leads_${currentUser?.id || 'guest'}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        setViewedLeadIds(JSON.parse(saved));
      } else {
        setViewedLeadIds([]);
      }
    } catch {
      setViewedLeadIds([]);
    }
  }, [currentUser?.id]);

  const markLeadAsViewed = useCallback((leadId: string) => {
    if (!leadId) return;
    setViewedLeadIds(prev => {
      if (prev.includes(leadId)) return prev;
      const updated = [...prev, leadId];
      try {
        const key = `imovelhub_viewed_leads_${currentUser?.id || 'guest'}`;
        localStorage.setItem(key, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save viewed leads to localStorage', e);
      }
      return updated;
    });
  }, [currentUser?.id]);

  // Count leads that are 'new' and haven't been viewed yet by this broker
  const unreadLeadsCount = leads.filter(l => {
    const isOwner = !currentUser?.id || 
      currentUser.role === 'admin' || 
      l.advertiserId === currentUser.id || 
      properties.some(p => p.id === l.propertyId && (
        p.userId === currentUser.id || 
        (p.advertiser?.email && currentUser.email && p.advertiser.email.toLowerCase() === currentUser.email.toLowerCase())
      ));
    if (!isOwner) return false;
    return l.status === 'new' && !viewedLeadIds.includes(l.id);
  }).length;

  // Purge any stale mock leads from localStorage
  useEffect(() => {
    try {
      localStorage.removeItem('imovelhub_leads');
    } catch {
      // Ignore
    }
  }, []);

  const refreshLeads = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const remoteLeads = await fetchLeadsFromSupabase();
      if (remoteLeads !== null) {
        setLeads(remoteLeads);
      }
    } catch (e) {
      console.warn('Error fetching leads from Supabase:', e);
    }
  }, []);

  // Initial load from Supabase and periodic polling
  useEffect(() => {
    if (isSupabaseConfigured) {
      refreshLeads();

      const timer = setInterval(() => {
        refreshLeads();
      }, 12000);

      return () => clearInterval(timer);
    }
  }, [refreshLeads, currentUser?.id]);

  const addLead = async (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; error?: string }> => {
    const leadId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `lead-${Date.now()}`;
    const newLead: Lead = {
      ...leadData,
      id: leadId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      const res = await insertLeadToSupabase(newLead);
      if (!res.success) {
        addToast({
          type: 'error',
          title: 'Erro ao Enviar Contato',
          message: res.error || 'O banco de dados do Supabase não permitiu registrar o contato.'
        });
        return { success: false, error: res.error };
      }

      if (leadData.propertyId) {
        const prop = properties.find(p => p.id === leadData.propertyId);
        if (prop) {
          await updatePropertyInSupabase(prop.id, { leadsCount: (prop.leadsCount || 0) + 1 });
        }
      }
    }

    setLeads(prev => [newLead, ...prev]);
    setProperties(prev => prev.map(p => p.id === leadData.propertyId ? { ...p, leadsCount: (p.leadsCount || 0) + 1 } : p));

    // Dispatch global event so chat and navbar update immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('imovelhub_lead_submitted', { detail: newLead }));
    }

    addToast({
      type: 'success',
      title: 'Mensagem Enviada!',
      message: 'O anunciante recebeu seu contato com sucesso e responderá em breve.'
    });

    return { success: true };
  };

  const updateLead = async (leadId: string, updates: Partial<Lead>) => {
    if (isSupabaseConfigured && !await updateLeadInSupabase(leadId, updates)) {
      addToast({ type: 'error', title: 'Não foi possível atualizar o lead', message: 'O banco de dados não confirmou a alteração.' });
      return;
    }
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          ...updates,
          updatedAt: new Date().toISOString()
        };
      }
      return l;
    }));

  };

  const updateLeadStatus = async (leadId: string, status: Lead['status'], notes?: string) => {
    markLeadAsViewed(leadId);
    const stageNameMap: Record<string, string> = {
      new: 'NOVO LEAD',
      contacted: 'CONTATO REALIZADO',
      interested: 'INTERESSADO',
      visit_scheduled: 'VISITA AGENDADA',
      proposal: 'PROPOSTA',
      negotiation: 'NEGOCIAÇÃO',
      closed_won: 'FECHADO',
      lost: 'PERDIDO'
    };

    const newInteraction = {
      id: `int-${Date.now()}`,
      leadId,
      type: 'status_change' as const,
      title: `Estágio alterado para ${stageNameMap[status] || status}`,
      description: notes || `Lead movimentado no funil de vendas para a etapa ${stageNameMap[status] || status}.`,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.name
    };

    const savedStatus = !isSupabaseConfigured || await updateLeadInSupabase(leadId, { status, notes });
    const savedTimeline = !isSupabaseConfigured || await updateLeadMetadataInSupabase(leadId, { interactions: [newInteraction, ...(leads.find(l => l.id === leadId)?.interactions || [])] });
    if (!savedStatus || !savedTimeline) {
      addToast({ type: 'error', title: 'Não foi possível atualizar o funil', message: 'O banco de dados não confirmou todas as alterações.' });
      return;
    }

    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        const interactions = l.interactions ? [newInteraction, ...l.interactions] : [newInteraction];
        return {
          ...l,
          status,
          notes: notes !== undefined ? notes : l.notes,
          interactions,
          updatedAt: new Date().toISOString()
        };
      }
      return l;
    }));

    addToast({
      type: 'info',
      title: 'Funil CRM Atualizado',
      message: `Lead movido para a etapa "${stageNameMap[status] || status}".`
    });
  };

  const updateLeadNotes = async (leadId: string, notes: string, privateNotes?: string) => {
    const savedNotes = !isSupabaseConfigured || await updateLeadInSupabase(leadId, { notes });
    const savedPrivateNotes = privateNotes === undefined || !isSupabaseConfigured || await updateLeadMetadataInSupabase(leadId, { privateNotes });
    if (!savedNotes || !savedPrivateNotes) {
      addToast({ type: 'error', title: 'Não foi possível salvar as anotações' });
      return;
    }
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          notes,
          privateNotes: privateNotes !== undefined ? privateNotes : l.privateNotes,
          updatedAt: new Date().toISOString()
        };
      }
      return l;
    }));
  };

  const addLeadTask = async (leadId: string, taskData: Omit<LeadTask, 'id'>) => {
    const newTask: LeadTask = {
      ...taskData,
      id: `task-${Date.now()}`
    };

    const currentTasks = leads.find(l => l.id === leadId)?.tasks || [];
    if (isSupabaseConfigured && !await updateLeadMetadataInSupabase(leadId, { tasks: [...currentTasks, newTask] })) {
      addToast({ type: 'error', title: 'Não foi possível criar a tarefa' });
      return;
    }
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        const tasks = l.tasks ? [...l.tasks, newTask] : [newTask];
        return { ...l, tasks, updatedAt: new Date().toISOString() };
      }
      return l;
    }));

    addToast({
      type: 'success',
      title: 'Tarefa Criada',
      message: `Tarefa "${newTask.title}" agendada com sucesso.`
    });
  };

  const toggleLeadTask = async (leadId: string, taskId: string) => {
    const lead = leads.find(l => l.id === leadId);
    const nextTasks = (lead?.tasks || []).map(t => t.id === taskId ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : undefined } : t);
    if (isSupabaseConfigured && !await updateLeadMetadataInSupabase(leadId, { tasks: nextTasks })) {
      addToast({ type: 'error', title: 'Não foi possível atualizar a tarefa' });
      return;
    }
    setLeads(prev => prev.map(l => {
      if (l.id === leadId && l.tasks) {
        const tasks = l.tasks.map(t => {
          if (t.id === taskId) {
            const nextCompleted = !t.completed;
            return {
              ...t,
              completed: nextCompleted,
              completedAt: nextCompleted ? new Date().toISOString() : undefined
            };
          }
          return t;
        });
        return { ...l, tasks, updatedAt: new Date().toISOString() };
      }
      return l;
    }));
  };

  const deleteLeadTask = async (leadId: string, taskId: string) => {
    const nextTasks = (leads.find(l => l.id === leadId)?.tasks || []).filter(t => t.id !== taskId);
    if (isSupabaseConfigured && !await updateLeadMetadataInSupabase(leadId, { tasks: nextTasks })) {
      addToast({ type: 'error', title: 'Não foi possível remover a tarefa' });
      return;
    }
    setLeads(prev => prev.map(l => {
      if (l.id === leadId && l.tasks) {
        return { ...l, tasks: l.tasks.filter(t => t.id !== taskId), updatedAt: new Date().toISOString() };
      }
      return l;
    }));
    addToast({ type: 'info', title: 'Tarefa removida' });
  };

  const addLeadInteraction = async (leadId: string, interactionData: Omit<LeadInteraction, 'id' | 'createdAt'>) => {
    const newInt: LeadInteraction = {
      ...interactionData,
      id: `int-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    const currentInteractions = leads.find(l => l.id === leadId)?.interactions || [];
    if (isSupabaseConfigured && !await updateLeadMetadataInSupabase(leadId, { interactions: [newInt, ...currentInteractions] })) {
      addToast({ type: 'error', title: 'Não foi possível registrar o histórico' });
      return;
    }
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        const interactions = l.interactions ? [newInt, ...l.interactions] : [newInt];
        return { 
          ...l, 
          interactions, 
          lastContactDate: new Date().toISOString(),
          updatedAt: new Date().toISOString() 
        };
      }
      return l;
    }));

    addToast({
      type: 'success',
      title: 'Histórico Registrado',
      message: 'Nova interação adicionada à timeline do cliente.'
    });
  };

  const addLeadTag = async (leadId: string, tag: string) => {
    const cleanTag = tag.trim();
    if (!cleanTag) return;
    const currentTags = leads.find(l => l.id === leadId)?.tags || [];
    if (currentTags.includes(cleanTag)) return;
    if (isSupabaseConfigured && !await updateLeadMetadataInSupabase(leadId, { tags: [...currentTags, cleanTag] })) {
      addToast({ type: 'error', title: 'Não foi possível adicionar a etiqueta' });
      return;
    }
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        const currentTags = l.tags || [];
        if (!currentTags.includes(cleanTag)) {
          return { ...l, tags: [...currentTags, cleanTag], updatedAt: new Date().toISOString() };
        }
      }
      return l;
    }));
  };

  const removeLeadTag = async (leadId: string, tag: string) => {
    const nextTags = (leads.find(l => l.id === leadId)?.tags || []).filter(t => t !== tag);
    if (isSupabaseConfigured && !await updateLeadMetadataInSupabase(leadId, { tags: nextTags })) {
      addToast({ type: 'error', title: 'Não foi possível remover a etiqueta' });
      return;
    }
    setLeads(prev => prev.map(l => {
      if (l.id === leadId && l.tags) {
        return { ...l, tags: l.tags.filter(t => t !== tag), updatedAt: new Date().toISOString() };
      }
      return l;
    }));
  };

  const toggleLeadInterestProperty = async (leadId: string, propertyId: string) => {
    const current = leads.find(l => l.id === leadId)?.interestedPropertyIds || [];
    const nextIds = current.includes(propertyId) ? current.filter(id => id !== propertyId) : [...current, propertyId];
    if (isSupabaseConfigured && !await updateLeadMetadataInSupabase(leadId, { interestedPropertyIds: nextIds })) {
      addToast({ type: 'error', title: 'Não foi possível atualizar imóveis de interesse' });
      return;
    }
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        const current = l.interestedPropertyIds || [];
        const isSelected = current.includes(propertyId);
        const nextIds = isSelected ? current.filter(id => id !== propertyId) : [...current, propertyId];
        return { ...l, interestedPropertyIds: nextIds, updatedAt: new Date().toISOString() };
      }
      return l;
    }));
    addToast({
      type: 'info',
      title: 'Imóveis de Interesse Atualizados',
      message: 'A carteira de interesse do cliente foi atualizada.'
    });
  };

  const toggleLeadPrivacy = async (leadId: string) => {
    const nextRestricted = !(leads.find(l => l.id === leadId)?.accessRestricted);
    if (isSupabaseConfigured && !await updateLeadMetadataInSupabase(leadId, { accessRestricted: nextRestricted })) {
      addToast({ type: 'error', title: 'Não foi possível atualizar a privacidade' });
      return;
    }
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        const nextRestricted = !l.accessRestricted;
        return { ...l, accessRestricted: nextRestricted, updatedAt: new Date().toISOString() };
      }
      return l;
    }));
    addToast({
      type: 'info',
      title: 'Segurança de Dados',
      message: 'Configuração de privacidade e controle de acesso atualizada.'
    });
  };

  const deleteLead = async (leadId: string) => {
    if (isSupabaseConfigured) {
      const deleted = await deleteLeadFromSupabase(leadId);
      if (!deleted) {
        addToast({ type: 'error', title: 'Não foi possível excluir o lead', message: 'O banco de dados não confirmou a exclusão.' });
        return;
      }
    }
    setLeads(prev => prev.filter(l => l.id !== leadId));
    addToast({
      type: 'info',
      title: 'Lead Excluído',
      message: 'O lead foi removido da sua carteira.'
    });
  };

  return (
    <CrmContext.Provider
      value={{
        leads,
        viewedLeadIds,
        unreadLeadsCount,
        markLeadAsViewed,
        addLead,
        updateLead,
        updateLeadStatus,
        updateLeadNotes,
        addLeadTask,
        toggleLeadTask,
        deleteLeadTask,
        addLeadInteraction,
        addLeadTag,
        removeLeadTag,
        toggleLeadInterestProperty,
        toggleLeadPrivacy,
        deleteLead,
        setLeads,
        refreshLeads
      }}
    >
      {children}
    </CrmContext.Provider>
  );
};

export const useCrm = () => {
  const context = useContext(CrmContext);
  if (!context) {
    throw new Error('useCrm must be used within a CrmProvider');
  }
  return context;
};
