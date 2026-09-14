import React, { useState } from 'react';
import { Plus, CheckCircle2, Trash2 } from 'lucide-react';
import { Lead, LeadTask } from '../../types';

interface CrmLeadTasksTabProps {
  lead: Lead;
  onAddTask: (leadId: string, task: Omit<LeadTask, 'id'>) => Promise<void>;
  onToggleTask: (leadId: string, taskId: string) => Promise<void>;
  onDeleteTask: (leadId: string, taskId: string) => Promise<void>;
}

export const CrmLeadTasksTab: React.FC<CrmLeadTasksTabProps> = ({
  lead,
  onAddTask,
  onToggleTask,
  onDeleteTask,
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [newTaskType, setNewTaskType] = useState<LeadTask['type']>('follow_up');
  const [newTaskPriority, setNewTaskPriority] = useState<LeadTask['priority']>('medium');

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskDate) return;
    await onAddTask(lead.id, {
      leadId: lead.id,
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
  };

  return (
    <div className="space-y-6">
      {/* Form Add Task */}
      <form onSubmit={handleCreateTask} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-['Outfit']">
          Agendar Nova Tarefa / Follow-up
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">Título da Tarefa</label>
            <input
              type="text"
              placeholder="Ex: Ligar para confirmar visita de sábado"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">Data Limite</label>
            <input
              type="date"
              value={newTaskDate}
              onChange={(e) => setNewTaskDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">Horário (Opcional)</label>
            <input
              type="time"
              value={newTaskTime}
              onChange={(e) => setNewTaskTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <select
              value={newTaskType}
              onChange={(e) => setNewTaskType(e.target.value as LeadTask['type'])}
              className="px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            >
              <option value="follow_up">Follow-up</option>
              <option value="visit">Visita</option>
              <option value="call">Ligação</option>
              <option value="proposal">Proposta</option>
            </select>

            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value as LeadTask['priority'])}
              className="px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            >
              <option value="low">Prioridade Baixa</option>
              <option value="medium">Prioridade Média</option>
              <option value="high">Prioridade Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Tarefa</span>
          </button>
        </div>
      </form>

      {/* Tasks List */}
      <div className="space-y-2">
        {(!lead.tasks || lead.tasks.length === 0) ? (
          <div className="p-6 text-center text-xs text-slate-400">
            Nenhuma tarefa pendente para este lead.
          </div>
        ) : (
          lead.tasks.map((task) => (
            <div
              key={task.id}
              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                task.completed
                  ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => onToggleTask(lead.id, task.id)}
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                    task.completed
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                  }`}
                >
                  {task.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>

                <div className="min-w-0">
                  <p className={`text-xs font-bold truncate ${task.completed ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                    <span>📅 {task.dueDate} {task.dueTime ? `às ${task.dueTime}` : ''}</span>
                    <span>•</span>
                    <span className="capitalize">{task.type.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {task.priority && (
                  <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                    task.priority === 'urgent' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                    task.priority === 'high' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {task.priority}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => onDeleteTask(lead.id, task.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Excluir tarefa"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
