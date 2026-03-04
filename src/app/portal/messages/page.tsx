'use client'
import { useT } from '@/lib/i18n'
import React, { useState } from 'react'
import { useApp } from '@/lib/context'
import { demoMessages, DemoMessage } from '@/lib/demo-data'
import { useMessages, useSendMessage, useMarkMessageRead } from '@/lib/hooks'
import ModuleShell from '@/components/shared/ModuleShell'
import StatusBadge from '@/components/shared/StatusBadge'
import { useToast } from '@/components/shared/Toast'
import { MessageCircle, Send, Paperclip, User, FileText, Calendar, ClipboardList, Building2 } from 'lucide-react'
import { useAbuseFilter, handleAbuseViolation } from '@/lib/utils/abuse-filter'

const entityIcons: Record<string, React.ReactNode> = {
  patient: <User size={14}/>, claim: <FileText size={14}/>, submission: <ClipboardList size={14}/>,
  appointment: <Calendar size={14}/>, general: <Building2 size={14}/>,
}

export default function MessagesPage() {
  const { data: apiMsgResult, refetch: refetchMessages } = useMessages({ limit: 100 })
  const sendMessageMutation = useSendMessage()

  // Normalise API threads into the same shape as demoMessages
  const apiThreads: any[] = (apiMsgResult?.data || []).map((m: any) => ({
    id: m.id,
    entityType: m.entity_type || 'general',
    entityId: m.entity_id || '',
    entityLabel: m.entity_label || m.entity_id || 'General',
    clientId: m.client_id || '',
    clientName: m.client_name || '',
    subject: m.subject || '(no subject)',
    lastMessage: m.body || '',
    lastSender: m.sender_name || m.sender_role || 'System',
    lastSenderRole: m.sender_role || 'staff',
    timestamp: m.created_at,
    unread: !m.read,
    status: m.status || 'open',
    messages: [{
      sender: m.sender_name || m.sender_role || 'System',
      role: (m.sender_role === 'client' || m.sender_role === 'provider') ? 'client' : 'staff',
      text: m.body || '',
      time: m.created_at,
    }],
  }))

  const { currentUser, selectedClient } = useApp()
  const { t } = useT()
  const { toast } = useToast()
  const { getError } = useAbuseFilter()
  // API threads take priority; demo data fills in when API is unavailable
  const [localThreads, setLocalThreads] = useState<any[]>(demoMessages)
  const [selected, setSelected] = useState<DemoMessage | null>(null)
  const [filter, setFilter] = useState('')
  const [reply, setReply] = useState('')
  const isStaff = !['client','provider'].includes(currentUser.role)

  // Merge: API threads overlay demo data by ID; purely local new threads at front
  const mergedThreads = apiThreads.length > 0
    ? [
        ...localThreads.filter(l => !apiThreads.some(a => a.id === l.id)), // local-only (newly sent)
        ...apiThreads,
      ]
    : localThreads

  const messages = mergedThreads.filter(m => {
    if (filter && m.entityType !== filter) return false
    if (!isStaff && m.clientId !== currentUser.organization_id) return false
    if (isStaff && selectedClient && m.clientId !== selectedClient.id) return false
    return true
  })

  const handleSend = async () => {
    if (!reply.trim() || !selected) return
    const abuseError = getError(reply)
    if (abuseError) {
      toast.error(abuseError)
      handleAbuseViolation(currentUser.id || 'unknown')
      return
    }
    const senderName = currentUser.name || currentUser.role
    const senderRole = (['provider','client'].includes(currentUser.role) ? 'client' : 'staff') as 'client' | 'staff'

    const newMsg = {
      id: `msg-${crypto.randomUUID()}`,
      sender: senderName,
      role: senderRole,
      text: reply.trim(),
      time: new Date().toISOString(),
    }

    // Optimistic local update immediately
    setLocalThreads(prev => prev.map(t =>
      t.id === selected.id
        ? { ...t, messages: [...t.messages, newMsg], lastMessage: reply.trim(), updatedAt: new Date().toISOString() }
        : t
    ))
    setSelected(prev => prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev)
    setReply('')

    // Persist to backend
    const result = await sendMessageMutation.mutate({
      entity_type: selected.entityType,
      entity_id: selected.entityId,
      client_id: selected.clientId,
      subject: selected.subject,
      body: reply.trim(),
      sender_name: senderName,
      sender_role: currentUser.role,
      parent_id: selected.id,
    } as any)

    if (result) {
      refetchMessages()
      toast.success('Message sent')
    } else {
      toast.success('Message sent (pending sync)')
    }
  }

  return (
    <ModuleShell title={t("messages","title")} subtitle="Conversations about patients, claims, and submissions">
      {apiMsgResult && apiThreads.length > 0 && (
        <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2.5 flex items-center gap-3 text-xs text-emerald-600 dark:text-emerald-400">
          <span>✓</span><span>Live messages loaded — {apiThreads.length} thread{apiThreads.length !== 1 ? 's' : ''} from server</span>
        </div>
      )}
      {(!apiMsgResult || apiThreads.length === 0) && (
        <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2.5 flex items-center gap-3 text-xs text-amber-700 dark:text-amber-400">
          <span>💬</span><span>Showing demo threads — messages you send will sync when API is connected</span>
        </div>
      )}      <div className="grid grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        {/* Thread List */}
        <div className="card overflow-hidden flex flex-col">
          <div className="p-3 border-b border-separator">
            <select value={filter} onChange={e=>setFilter(e.target.value)}
              className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-1.5 text-xs text-content-primary">
              <option value="">All Types</option>
              {['patient','claim','submission','appointment','general'].map(t=>(
                <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto">
            {messages.map(m => (
              <button key={m.id} onClick={() => setSelected(m)}
                className={`w-full text-left px-3 py-3 border-b border-separator table-row transition-all ${selected?.id===m.id ? 'bg-brand/5 border-l-2 border-l-brand' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-content-secondary">{entityIcons[m.entityType]}</span>
                  <span className="text-xs font-medium truncate flex-1">{m.subject}</span>
                  {m.unread && <span className="w-2 h-2 bg-brand rounded-full shrink-0"/>}
                </div>
                <div className="text-[10px] text-content-secondary truncate">{m.lastMessage}</div>
                <div className="flex items-center justify-between mt-1">
                  {isStaff && <span className="text-[10px] text-content-secondary">{m.clientName}</span>}
                  <span className="text-[10px] text-content-secondary ml-auto">{new Date(m.timestamp).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Conversation */}
        <div className="col-span-2 card flex flex-col overflow-hidden">
          {selected ? (
            <>
              <div className="px-4 py-3 border-b border-separator">
                <div className="flex items-center gap-2">
                  <span className="text-content-secondary">{entityIcons[selected.entityType]}</span>
                  <div>
                    <h3 className="text-sm font-semibold">{selected.subject}</h3>
                    <span className="text-[10px] text-content-secondary">Re: {selected.entityLabel} • {selected.clientName}</span>
                  </div>
                  <StatusBadge status={selected.status} small/>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selected.messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'client' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-card px-3 py-2 ${msg.role === 'client' ? 'bg-brand/10 border border-brand/20' : 'bg-surface-elevated border border-separator'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-medium">{msg.sender}</span>
                        <span className={`text-[9px] px-1 rounded ${msg.role === 'client' ? 'bg-emerald-500/20 text-emerald-600 text-emerald-600 dark:text-emerald-400' : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'}`}>{msg.role}</span>
                      </div>
                      <p className="text-xs">{msg.text}</p>
                      <span className="text-[9px] text-content-secondary block mt-1">{new Date(msg.time).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-separator flex gap-2">
                <button onClick={() => toast.info('File attachment — select document from library')} className="text-content-secondary hover:text-content-primary p-2"><Paperclip size={16}/></button>
                <input value={reply} onChange={e=>setReply(e.target.value)} placeholder="Type a message..."
                  className="flex-1 bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-primary placeholder:text-content-tertiary"
                  onKeyDown={e => { if (e.key === 'Enter' && reply.trim()) handleSend() }}/>
                <button onClick={handleSend} className="bg-brand text-white rounded-lg px-3 py-2 hover:bg-brand-deep"><Send size={16}/></button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-content-secondary text-sm">
              <MessageCircle size={24} className="mr-2 opacity-30"/> Select a conversation
            </div>
          )}
        </div>
      </div>
    </ModuleShell>
  )
}
