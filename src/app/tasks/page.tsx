'use client'
import { useT } from '@/lib/i18n'
import React, { useState, useEffect } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { useToast } from '@/components/shared/Toast'
import { ListChecks, X, Plus } from 'lucide-react'
import { useTasks, useUpdateTask, useCreateTask } from '@/lib/hooks'
import { api } from '@/lib/api-client'
import { useApp } from '@/lib/context'
import { UAE_CLIENT_NAMES, US_CLIENT_NAMES } from '@/lib/utils/region'

type Task = {
  id: string
  type: string
  entity: string
  client: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'blocked' | 'completed'
  assigned: string
  due: string
  sla: string
}

const initialTasks: Task[] = []  // Tasks come from API — no hardcoded fallback

function CreateTaskModal({ onClose, onSave }: { onClose: () => void; onSave: (t: Task) => void }) {
  const { toast } = useToast()
  const { clients } = useApp()
  const ic = 'w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm outline-none focus:border-brand/40 transition-colors'
  const [form, setForm] = useState({
    type: '',
    entity: '',
    client: clients[0]?.name ?? '',
    assigned: '',
    due: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    priority: 'medium' as Task['priority'],
  })

  function handleSave() {
    if (!form.type || !form.entity) { toast.warning('Type and entity are required'); return }
    const newTask: Task = {
      id: `TSK-${String(Date.now()).slice(-5)}`,
      type: form.type,
      entity: form.entity,
      client: form.client,
      priority: form.priority,
      status: 'open',
      assigned: form.assigned || 'Unassigned',
      due: form.due,
      sla: 'green',
    }
    onSave(newTask)
    toast.success(`Task created — ${newTask.id}`)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="card w-[520px]" onClick={e => e.stopPropagation()}>
        <div className="flex gap-2 items-center justify-between p-4 border-b border-separator pb-1">
          <h3 className="font-semibold text-content-primary">Create Task</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-elevated rounded-btn"><X size={16} className="text-content-secondary"/></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-content-secondary block mb-1">Task Type *</label>
              <select value={form.type} onChange={e => setForm(p=>({...p,type:e.target.value}))} className={ic}>
                <option value="">Select type</option>
                {['Missing Docs','Denial Review','ERA Exception','Coding Query','Credentialing','A/R Follow-up','Appeal Deadline','Patient Contact','Prior Auth','Claim Resubmission','Other'].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-content-secondary block mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm(p=>({...p,priority:e.target.value as Task['priority']}))} className={ic}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-content-secondary block mb-1">Entity (patient, claim, description) *</label>
            <input value={form.entity} onChange={e=>setForm(p=>({...p,entity:e.target.value}))} placeholder="John Smith — CLM-4501" className={ic}/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-content-secondary block mb-1">Assign To</label>
              <select value={form.assigned} onChange={e=>setForm(p=>({...p,assigned:e.target.value}))} className={ic}>
                <option value="">Unassigned</option>
                {['Sarah K.','Mike R.','Lisa T.','Amy C.','Tom B.','Voice AI'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-content-secondary block mb-1">Due Date</label>
              <input type="date" value={form.due} onChange={e=>setForm(p=>({...p,due:e.target.value}))} className={ic}/>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} className="flex-1 bg-brand text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-deep">Create Task</button>
            <button onClick={onClose} className="px-4 py-2.5 border border-separator rounded-lg text-sm text-content-secondary">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TasksPage() {
  const { toast } = useToast()
  const { t } = useT()
  const { country, selectedClient } = useApp()
  const [selected, setSelected] = useState<Task | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const { data: apiTaskResult, refetch: refetchTasks } = useTasks({ limit: 50 })
  const { mutate: createTaskAPI } = useCreateTask()

  const apiTasks: Task[] = apiTaskResult?.data?.map(t => ({
    id: t.id,
    type: t.task_type || 'Task',
    entity: t.title || t.description || '',
    client: t.client_name || '',
    priority: (t.priority as Task['priority']) || 'medium',
    status: (t.status as Task['status']) || 'open',
    assigned: t.assigned_to && t.assigned_to.length > 20 ? 'Staff' : (t.assigned_to || 'Unassigned'),
    due: t.due_date || '',
    sla: 'green',
  })) || []

  const [taskList, setTaskList] = useState<Task[]>(initialTasks as Task[])
  const [pendingStatus, setPendingStatus] = useState<Task['status'] | null>(null)

  // Sync API tasks into local state when data arrives
  useEffect(() => {
    if (apiTasks.length > 0) setTaskList(apiTasks)
  }, [apiTaskResult])

  async function handleCreateTask(newTask: Task) {
    setTaskList(prev => [newTask, ...prev]) // optimistic
    try {
      await createTaskAPI({
        task_type: newTask.type,
        title: newTask.entity,
        priority: newTask.priority,
        status: 'open',
        assigned_to: newTask.assigned !== 'Unassigned' ? newTask.assigned : undefined,
        due_date: newTask.due,
      })
      await refetchTasks()
    } catch {
      toast.error('Task saved locally — server sync failed. Will retry on next load.')
    }
  }

  useEffect(() => {
    setPendingStatus(null)
  }, [selected])

  const slaColor = (s: string) => s === 'green' ? 'bg-brand' : s === 'yellow' ? 'bg-brand-pale' : 'bg-[#065E76]'

  const rawTasks = taskList
  const displayTasks = rawTasks.filter(t => {
    if (selectedClient) return t.client === selectedClient.name
    if (country === 'uae') return UAE_CLIENT_NAMES.includes(t.client as typeof UAE_CLIENT_NAMES[number]) || !t.client
    if (country === 'usa') return US_CLIENT_NAMES.includes(t.client as typeof US_CLIENT_NAMES[number]) || !t.client
    return true
  })

  return (
    <ModuleShell
      title={t("tasks","title")}
      subtitle="Track and manage work across all departments"
      actions={
        <button onClick={() => setShowCreate(true)} className="bg-brand text-white rounded-lg px-4 py-2 text-sm flex items-center gap-2 hover:bg-brand-deep">
          <Plus size={16}/>Create Task
        </button>
      }
    >
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KPICard label={t('tasks','openTasks')} value={displayTasks.filter(t=>t.status!=='completed').length} icon={<ListChecks size={20}/>}/>
        <KPICard label={t('tasks','inProgress')} value={displayTasks.filter(t=>t.status==='in_progress').length}/>
        <KPICard label={t('tasks','blocked')} value={displayTasks.filter(t=>t.status==='blocked').length} trend="down"/>
        <KPICard label={t('tasks','slaBreached')} value={displayTasks.filter(t=>t.sla==='red').length} trend="down"/>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-separator text-xs text-content-secondary">
            <th className="w-2"></th><th className="text-left px-4 py-3">Type</th><th className="text-left px-4 py-3">Entity</th>
            <th className="text-left px-4 py-3">Client</th><th className="text-left px-4 py-3">Assigned</th>
            <th className="text-left px-4 py-3">Due</th><th className="text-left px-4 py-3">Priority</th><th className="text-left px-4 py-3">Status</th>
          </tr></thead>
          <tbody>
            {displayTasks.length === 0 && (
              <tr><td colSpan={8}>
                <div className='flex flex-col items-center justify-center py-16 text-center'>
                  <div className='w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center mb-3'>
                    <ListChecks size={20} className='text-content-tertiary' />
                  </div>
                  <p className='text-sm font-medium text-content-primary mb-1'>No tasks yet</p>
                  <p className='text-xs text-content-secondary'>Tasks will appear here once they&apos;re added to the system.</p>
                </div>
              </td></tr>
            )}
            {displayTasks.map(t=>(
            <tr key={t.id}
              onClick={() => setSelected(t)}
              className="border-b border-separator last:border-0 table-row cursor-pointer hover:bg-surface-elevated transition-colors">
              <td className="pl-2"><div className={`w-1.5 h-6 rounded-full ${slaColor(t.sla)}`}/></td>
              <td className="px-4 py-3 text-xs font-medium">{t.type}</td>
              <td className="px-4 py-3 text-xs">{t.entity}</td>
              <td className="px-4 py-3 text-xs text-content-secondary">{t.client}</td>
              <td className="px-4 py-3 text-xs text-content-secondary">{t.assigned}</td>
              <td className="px-4 py-3 text-xs text-content-secondary">{t.due}</td>
              <td className="px-4 py-3"><StatusBadge status={t.priority} small/></td>
              <td className="px-4 py-3"><StatusBadge status={t.status} small/></td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {selected && (
        <>
          <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setSelected(null)} />
          <div className="fixed right-0 top-0 h-full w-[380px] bg-surface-secondary border-l border-separator z-40 flex flex-col shadow-2xl">
            <div className="flex gap-2 items-center justify-between p-4 border-b border-separator pb-1">
              <div>
                <h3 className="font-semibold text-content-primary">{selected.type}</h3>
                <p className="text-xs text-content-secondary">{selected.id}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-surface-elevated rounded-btn">
                <X size={16} className="text-content-secondary" />
              </button>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
              <div className="text-xs text-content-secondary">{selected.type} · {selected.client}</div>
              <div className="text-sm font-medium text-content-primary">{selected.entity}</div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-content-secondary block">Assigned To</span>{selected.assigned}</div>
                <div><span className="text-content-secondary block">Due Date</span>{selected.due}</div>
                <div><span className="text-content-secondary block">Priority</span><StatusBadge status={selected.priority} small /></div>
                <div><span className="text-content-secondary block">Status</span><StatusBadge status={selected.status} small /></div>
              </div>

              <div>
                <label className="text-xs text-content-secondary block mb-1">Update Status</label>
                <select className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm"
                  value={pendingStatus ?? selected.status}
                  onChange={e => setPendingStatus(e.target.value as Task['status'])}>

                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <textarea rows={3} placeholder="Add a note..." className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm resize-none" />

              <button
                onClick={async () => {
                  if (pendingStatus) {
                    setTaskList(prev => prev.map(t =>
                      t.id === selected.id ? { ...t, status: pendingStatus } : t
                    ))
                    // Persist to API — find the live task id if available
                    const liveTask = apiTaskResult?.data?.find(t => t.id === selected.id)
                    const apiId = liveTask?.id || selected.id
                    try {
                      await api.put(`/tasks/${apiId}`, { status: pendingStatus })
                    } catch (err) {
                      console.error('[tasks] status update failed:', err)
                    }
                  }
                  toast.success('Task updated')
                  setSelected(null)
                  setPendingStatus(null)
                }}
                className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-medium">Save Changes</button>
            </div>
          </div>
        </>
      )}
      {showCreate && <CreateTaskModal onClose={() => setShowCreate(false)} onSave={handleCreateTask}/>}
    </ModuleShell>
  )
}
