import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Filter, 
  User, 
  Phone, 
  MessageSquare, 
  ExternalLink,
  AlertTriangle,
  Sparkles,
  CalendarCheck
} from 'lucide-react';
import { Lead, LeadTask } from '../../types';
import { formatDateTime } from '../../lib/utils';

interface CrmTasksCalendarProps {
  leads: Lead[];
  onToggleTask: (leadId: string, taskId: string) => Promise<void>;
  onDeleteTask: (leadId: string, taskId: string) => Promise<void>;
  onAddTask: (leadId: string, task: Omit<LeadTask, 'id'>) => Promise<void>;
  onOpenLead: (lead: Lead) => void;
}

export const CrmTasksCalendar: React.FC<CrmTasksCalendarProps> = ({
  leads,
  onToggleTask,
  onDeleteTask,
  onAddTask,
  onOpenLead,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'today' | 'completed'>('pending');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedLeadId, setSelectedLeadId] = useState<string>(leads[0]?.id || '');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [newTaskType, setNewTaskType] = useState<LeadTask['type']>('follow_up');
  const [newTaskPriority, setNewTaskPriority] = useState<LeadTask['priority']>('medium');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Flatten all tasks with lead reference
  const allTasksWithLead: { task: LeadTask; lead: Lead }[] = [];
  leads.forEach(lead => {
    if (lead.tasks && lead.tasks.length > 0) {
      lead.tasks.forEach(task => {
        allTasksWithLead.push({ task, lead });
      });
    }
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredTasks = allTasksWithLead.filter(({ task }) => {
    if (typeFilter !== 'all' && task.type !== typeFilter) return false;

    if (filterMode === 'pending') {
      return !task.completed;
    }
    if (filterMode === 'completed') {
      return task.completed;
    }
    if (filterMode === 'today') {
      return task.dueDate === todayStr;
    }
    return true;
  });

  // Sort: Overdue first, then by date
  filteredTasks.sort((a, b) => {
    if (a.task.completed && !b.task.completed) return 1;
    if (!a.task.completed && b.task.completed) return -1;
    return (a.task.dueDate || '').localeCompare(b.task.dueDate || '');
  });

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || !newTaskTitle.trim() || !newTaskDate) return;

    await onAddTask(selectedLeadId, {
      leadId: selectedLeadId,
      title: newTaskTitle,
      type: newTaskType,
      priority: newTaskPriority,
      dueDate: newTaskDate,
      dueTime: newTaskTime || undefined,
      completed: false,
    });

    setNewTaskTitle('');
    setNewTaskDate('');
    setNewTaskTime('');
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white font-['Outfit'] flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-rose-600" />
            <span>Agenda & Gestão de Tarefas (Follow-up)</span>
          </h2>
          <p className="text-xs text-slate-500">
            Controle de compromissos, visitas agendadas e retorno com compradores
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-rose-600/20 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{isFormOpen ? 'Fechar Formulário' : 'Nova Tarefa'}</span>
        </button>
      </div>

      {/* Quick Add Form Drawer */}
      {isFormOpen && (
        <form onSubmit={handleCreateTask} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4 animate-fade-in">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white font-['Outfit']">
            Agendar Compromisso / Follow-up
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Selecionar Cliente (Lead)</label>
              <select
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              >
                {leads.map(lead => (
                  <option key={lead.id} value={lead.id}>
                    {lead.buyerName} ({lead.propertyTitle})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Tipo de Tarefa</label>
              <select
                value={newTaskType}
                onChange={(e) => setNewTaskType(e.target.value as LeadTask['type'])}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              >
                <option value="follow_up">Follow-up / Retorno</option>
                <option value="visit">Visita Presencial</option>
                <option value="call">Ligação Telefônica</option>
                <option value="proposal">Elaboração de Proposta</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Data</label>
              <input
                type="date"
                required
                value={newTaskDate}
                onChange={(e) => setNewTaskDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Horário (Opcional)</label>
              <input
                type="time"
                value={newTaskTime}
                onChange={(e) => setNewTaskTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">Título / Descrição da Tarefa</label>
            <input
              type="text"
              required
              placeholder="Ex: Apresentar simulação de financiamento bancário e fechar minuta"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Prioridade:</span>
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as LeadTask['priority'])}
                className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
              >
                Agendar Tarefa
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        
        {/* Status Filters */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilterMode('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filterMode === 'pending'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Pendentes ({allTasksWithLead.filter(t => !t.task.completed).length})
          </button>

          <button
            onClick={() => setFilterMode('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filterMode === 'today'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Hoje ({allTasksWithLead.filter(t => t.task.dueDate === todayStr).length})
          </button>

          <button
            onClick={() => setFilterMode('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filterMode === 'completed'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Concluídas
          </button>

          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filterMode === 'all'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Todas ({allTasksWithLead.length})
          </button>
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Filtrar por:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
          >
            <option value="all">Todos os tipos</option>
            <option value="visit">Visitas</option>
            <option value="follow_up">Follow-ups</option>
            <option value="call">Ligações</option>
            <option value="proposal">Propostas</option>
          </select>
        </div>

      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400 space-y-2">
            <CalendarIcon className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
            <p className="text-sm font-semibold">Nenhuma tarefa encontrada neste filtro.</p>
          </div>
        ) : (
          filteredTasks.map(({ task, lead }) => {
            const isOverdue = !task.completed && task.dueDate && task.dueDate < todayStr;
            const isToday = task.dueDate === todayStr;

            return (
              <div
                key={task.id}
                className={`p-4 rounded-3xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  task.completed
                    ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                    : isOverdue
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
                }`}
              >
                {/* Left: Checkbox + Title + Metadata */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  
                  {/* Toggle Button */}
                  <button
                    type="button"
                    onClick={() => onToggleTask(lead.id, task.id)}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all shrink-0 mt-0.5 ${
                      task.completed
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                        : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                    }`}
                  >
                    {task.completed && <CheckCircle2 className="w-4 h-4" />}
                  </button>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-sm font-bold truncate ${task.completed ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                        {task.title}
                      </h4>

                      {isOverdue && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Atrasada
                        </span>
                      )}

                      {isToday && !task.completed && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                          Hoje
                        </span>
                      )}

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
                        {task.type.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Linked Lead info */}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>Cliente:</span>
                      <button
                        type="button"
                        onClick={() => onOpenLead(lead)}
                        className="font-bold text-rose-600 hover:underline flex items-center gap-1"
                      >
                        {lead.buyerName}
                        <ExternalLink className="w-3 h-3" />
                      </button>
                      <span>•</span>
                      <span className="truncate">{lead.propertyTitle}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Date, Priority & Actions */}
                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                  
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{task.dueDate} {task.dueTime ? `às ${task.dueTime}` : ''}</span>
                  </div>

                  {task.priority && (
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                      task.priority === 'urgent' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                      task.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' :
                      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {task.priority}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => onDeleteTask(lead.id, task.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Excluir tarefa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
