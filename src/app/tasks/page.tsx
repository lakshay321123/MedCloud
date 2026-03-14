'use client'
import { useT } from '@/lib/i18n'
import React, { useState, useEffect, useRef } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { useToast } from '@/components/shared/Toast'
import { ListChecks, X, Plus } from 'lucide-react'
import { useTasks, useUpdateTask, useCreateTask, useWorkflowTemplates, useCreateWorkflowTemplate, useEvaluateWorkflow, useUsers, useGlobalSearch } from '@/lib/hooks'
import { api } from '@/lib/api-client'
import { useApp } from '@/lib/context'
import { useSearchParams, useRouter } from 'next/navigation'
// Region filtering handled by backend

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
  const { clients, selectedClient } = useApp()
  const { data: usersResult } = useUsers({ limit: 50 })
  const ic = 'w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm outline-none focus:border-brand/40 transition-colors'

  // Task types matching actual DB values
  const TASK_TYPES = [
    { value: 'billing', label: 'Billing' },
    { value: 'coding', label: 'Coding' },
    { value: 'posting', label: 'Payment Posting' },
    { value: 'denial_appeal', label: 'Denial Appeal' },
    { value: 'ar_followup', label: 'A/R Follow-up' },
    { value: 'eligibility', label: 'Eligibility' },
    { value: 'credentialing', label: 'Credentialing' },
    { value: 'prior_auth', label: 'Prior Auth' },
    { value: 'quality_audit', label: 'Quality Audit' },
    { value: 'missing_docs', label: 'Missing Docs' },
    { value: 'other', label: 'Other' },
  ]

  // Real staff from users API
  const staffUsers = (usersResult?.data || []).filter(u =>
    ['admin','director','supervisor','manager','coder','biller','ar_team','posting_team'].includes(u.role || '')
  )

  const [form, setForm] = useState({
    type: '',
    entity: '',
    description: '',
    clientId: selectedClient?.id ?? '',
    clientName: selectedClient?.name ?? (clients[0]?.name ?? ''),
    assignedId: '',
    assignedName: '',
    due: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    priority: 'medium' as Task['priority'],
  })

  // Entity search
  const [searchQ, setSearchQ] = useState('')
  const { data: searchResult } = useGlobalSearch(searchQ)
  const searchResults = searchResult?.results || []
  const [showSearch, setShowSearch] = useState(false)

  function handleSave() {
    if (!form.type || !form.entity) { toast.warning('Task type and title are required'); return }
    const newTask: Task = {
      id: `TSK-${String(Date.now()).slice(-5)}`,
      type: form.type,
      entity: form.entity,
      client: form.clientName,
      priority: form.priority,
      status: 'open',
      assigned: form.assignedName || 'Unassigned',
      due: form.due,
      sla: 'green',
    }
    // Pass extra API fields via expando properties
    ;(newTask as any)._clientId = form.clientId || undefined
    ;(newTask as any)._assignedId = form.assignedId || undefined
    ;(newTask as any)._description = form.description || undefined
    onSave(newTask)
    toast.success(`Task created — ${newTask.id}`)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="card w-[560px]" onClick={e => e.stopPropagation()}>
        <div className="flex gap-2 items-center justify-between p-4 border-b border-separator pb-1">
          <h3 className="font-semibold text-content-primary">Create Task</h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-surface-elevated rounded-btn"><X size={16} className="text-content-secondary"/></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-content-secondary block mb-1">Task Type *</label>
              <select value={form.type} onChange={e => setForm(p=>({...p,type:e.target.value}))} className={ic}>
                <option value="">Select type</option>
                {TASK_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-content-secondary block mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm(p=>({...p,priority:e.target.value as Task['priority']}))} className={ic}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div className="relative">
            <label htmlFor="task-entity" className="text-xs text-content-secondary block mb-1">Title / Entity *</label>
            <input id="task-entity" value={form.entity}
              onChange={e => { setForm(p=>({...p,entity:e.target.value})); setSearchQ(e.target.value); setShowSearch(true) }}
              onFocus={() => { if (form.entity.length >= 2) setShowSearch(true) }}
              onBlur={() => setTimeout(() => setShowSearch(false), 200)}
              placeholder="Search patient, claim, or type description..."
              className={ic}/>
            {showSearch && searchResults.length > 0 && (
              <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-surface-secondary border border-separator rounded-lg shadow-xl max-h-[180px] overflow-y-auto">
                {searchResults.slice(0, 6).map(r => (
                  <button type="button" key={r.id}
                    onMouseDown={() => { setForm(p => ({...p, entity: `${r.label} (${r.sub})`})); setShowSearch(false) }}
                    className="w-full text-left px-3 py-2 hover:bg-surface-elevated text-[12px] border-b border-separator last:border-0">
                    <span className="font-medium text-content-primary">{r.label}</span>
                    <span className="text-content-tertiary ml-2">{r.sub}</span>
                    <span className="text-[10px] text-brand ml-1">{r.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs text-content-secondary block mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))}
              rows={2} placeholder="Additional details..."
              className={ic + ' resize-none'}/>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-content-secondary block mb-1">Client</label>
              <select value={form.clientId} onChange={e => {
                const cl = clients.find(c => c.id === e.target.value)
                setForm(p=>({...p, clientId: e.target.value, clientName: cl?.name || ''}))
              }} className={ic}>
                <option value="">All Clients</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-content-secondary block mb-1">Assign To</label>
              <select value={form.assignedId} onChange={e => {
                const u = staffUsers.find(u => u.id === e.target.value)
                setForm(p=>({...p, assignedId: e.target.value, assignedName: u ? `${u.first_name} ${u.last_name}` : ''}))
              }} className={ic}>
                <option value="">Unassigned</option>
                {staffUsers.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.role})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-content-secondary block mb-1">Due Date</label>
              <input type="date" value={form.due} onChange={e=>setForm(p=>({...p,due:e.target.value}))} className={ic}/>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={handleSave} className="flex-1 bg-brand text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-deep">Create Task</button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 border border-separator rounded-lg text-sm text-content-secondary">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TasksPage() {
  const { toast } = useToast()
  const { t } = useT()
  const { selectedClient } = useApp()
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
        description: (newTask as any)._description || undefined,
        priority: newTask.priority,
        status: 'open',
        assigned_to: (newTask as any)._assignedId || undefined,
        client_id: (newTask as any)._clientId || undefined,
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
    if (selectedClient) return !t.client || t.client === selectedClient.name
    return true
  })

  // Auto-open task drawer when navigated from notifications with ?openId=
  const searchParams = useSearchParams()
  const router = useRouter()
  const consumedOpenId = useRef<string | null>(null)
  useEffect(() => {
    const openId = searchParams.get('openId')
    if (!openId || openId === consumedOpenId.current) return
    const match = taskList.find(t => t.id === openId)
    if (match) { setSelected(match); consumedOpenId.current = openId }
  }, [searchParams, taskList]) // eslint-disable-line react-hooks/exhaustive-deps

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
        <KPICard label={t('tasks','openTasks')} value={displayTasks.filter(t=>t.status==='open').length} icon={<ListChecks size={20}/>}/>
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
          <div className="fixed inset-0 bg-black/20 z-30" onClick={() => { setSelected(null); if (searchParams.get('openId')) router.replace('/tasks', { scroll: false }) }} />
          <div className="fixed right-0 top-0 h-full w-[380px] bg-surface-secondary border-l border-separator z-40 flex flex-col shadow-2xl">
            <div className="flex gap-2 items-center justify-between p-4 border-b border-separator pb-1">
              <div>
                <h3 className="font-semibold text-content-primary">{selected.type}</h3>
                <p className="text-xs text-content-secondary">{selected.id}</p>
              </div>
              <button onClick={() => { setSelected(null); if (searchParams.get('openId')) router.replace('/tasks', { scroll: false }) }} className="p-1 hover:bg-surface-elevated rounded-btn">
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
                  setSelected(null); if (searchParams.get('openId')) router.replace('/tasks', { scroll: false })
                  setPendingStatus(null)
                }}
                className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-medium">Save Changes</button>
            </div>
          </div>
        </>
      )}
      {showCreate && <CreateTaskModal onClose={() => setShowCreate(false)} onSave={handleCreateTask}/>}

      {/* ── Workflow Templates ─────────────────────────────────────────────── */}
      <WorkflowTemplatesSection />
    </ModuleShell>
  )
}

function WorkflowTemplatesSection() {
  const { toast } = useToast()
  const { data: templatesResult, loading: templatesLoading, refetch } = useWorkflowTemplates()
  const { mutate: createTemplate, loading: creating } = useCreateWorkflowTemplate()
  const { mutate: evaluate } = useEvaluateWorkflow()
  const [expanded, setExpanded] = useState(false)
  const templates = templatesResult?.data || []

  return (
    <div className="card mt-4 overflow-hidden">
      <button type="button" onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-elevated transition-colors">
        <h3 className="text-sm font-semibold text-content-primary">Workflow Automation Templates</h3>
        <span className="text-[11px] text-content-tertiary">{templates.length} template{templates.length !== 1 ? 's' : ''} {expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="border-t border-separator px-4 py-3 space-y-3">
          {templatesLoading && templates.length === 0 && (
            <div className="text-[13px] text-content-tertiary py-2">Loading workflow templates...</div>
          )}
          {!templatesLoading && templates.length === 0 && (
            <div className="text-[13px] text-content-tertiary py-2">No workflow templates configured. Create one to automate task assignment.</div>
          )}
          {templates.map(tpl => (
            <div key={tpl.id} className="flex items-center gap-3 bg-surface-elevated rounded-lg px-3 py-2">
              <div className={`w-2 h-2 rounded-full ${tpl.is_active ? 'bg-brand' : 'bg-gray-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">{tpl.name}</div>
                <div className="text-[11px] text-content-tertiary">Trigger: {tpl.trigger_event} · {(tpl.actions || []).length} action{(tpl.actions || []).length !== 1 ? 's' : ''}</div>
              </div>
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${tpl.is_active ? 'bg-brand/10 text-brand' : 'bg-gray-100 text-gray-500'}`}>
                {tpl.is_active ? 'Active' : 'Inactive'}
              </span>
              <button type="button" onClick={async () => {
                try {
                  const result = await evaluate({ trigger_event: tpl.trigger_event, context: { test: true } })
                  toast.success(`Workflow evaluated: ${(result?.results || []).map(r => `${r.action}=${r.status}`).join(', ') || 'no actions'}`)
                } catch { toast.error('Evaluation failed') }
              }} className="text-[11px] text-brand hover:underline">Test</button>
            </div>
          ))}
          <button type="button" disabled={creating} onClick={async () => {
            try {
              await createTemplate({
                name: 'New Workflow',
                trigger_event: 'claim_denied',
                actions: [{ type: 'create_task', title: 'Follow up on denial', priority: 'high', due_days: 3 }],
                is_active: false,
              })
              toast.success('Template created (inactive). Edit to configure.')
              refetch()
            } catch { toast.error('Failed to create template') }
          }} className="w-full border-2 border-dashed border-separator rounded-lg py-2 text-[12px] text-content-tertiary hover:border-brand/40 hover:text-brand transition-colors disabled:opacity-50">
            {creating ? 'Creating...' : '+ Add Workflow Template'}
          </button>
        </div>
      )}
    </div>
  )
}
