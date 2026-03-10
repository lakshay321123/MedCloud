'use client'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n'
import React, { useState } from 'react'
import { useApp } from '@/lib/context'
import type { DemoMessage } from '@/lib/demo-data'
import { useMessages, useSendMessage, useMarkMessageRead } from '@/lib/hooks'
import ModuleShell from '@/components/shared/ModuleShell'
import StatusBadge from '@/components/shared/StatusBadge'
import { useToast } from '@/components/shared/Toast'
import { MessageCircle, Send, Paperclip, User, FileText, Calendar, ClipboardList, Building2, Plus, X, ChevronDown, ArrowLeft } from 'lucide-react'
import { usePatients, useClaims } from '@/lib/hooks'
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
  const router = useRouter()
  const { toast } = useToast()
  const { getError } = useAbuseFilter()
  // localThreads holds optimistically-added threads before API refetch
  const [localThreads, setLocalThreads] = useState<DemoMessage[]>([])
  const [selected, setSelected] = useState<DemoMessage | null>(null)
  const [filter, setFilter] = useState('')
  const [reply, setReply] = useState('')
  const [composing, setComposing] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newBody, setNewBody] = useState('')
  const [newEntityType, setNewEntityType] = useState('general')
  const [newEntityId, setNewEntityId] = useState('')
  const { data: patientResult } = usePatients({ limit: 50 })
  const { data: claimResult } = useClaims({ limit: 50 })
  const patients = patientResult?.data || []
  const claims = claimResult?.data || []
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
    // For back-office staff: filter by selected client if one is chosen
    if (isStaff && selectedClient && m.clientId !== selectedClient.id) return false
    // For clinic roles (Doctor/Front Desk): API already scopes messages to their org via RLS
    // No additional client_id filter needed — avoids UUID vs org-code mismatch
    return true
  })

  const handleComposeSend = async () => {
    if (!newSubject.trim() || !newBody.trim()) { toast.warning('Subject and message are required'); return }
    const senderName = currentUser.name || currentUser.role
    const result = await sendMessageMutation.mutate({
      entity_type: newEntityType,
      entity_id: newEntityId || undefined,
      client_id: selectedClient?.id || currentUser.organization_id || undefined,
      subject: newSubject.trim(),
      body: newBody.trim(),
      sender_name: senderName,
      sender_role: currentUser.role,
    } as any)
    if (result) {
      toast.success('Message sent')
      setComposing(false)
      setNewSubject('')
      setNewBody('')
      setNewEntityType('general')
      setNewEntityId('')
      refetchMessages()
    }
  }

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
    <ModuleShell title={t("messages","title")} subtitle="Conversations about patients, claims, and submissions"
      actions={<button onClick={() => setComposing(true)} className="flex items-center gap-2 bg-brand text-white text-sm px-3 py-1.5 rounded-lg hover:bg-brand-deep transition-colors"><Plus size={15}/> New Message</button>}>
      {apiMsgResult && apiThreads.length > 0 && (
        <div className="mb-4 bg-brand/10 border border-brand/30 rounded-lg px-4 py-2.5 flex items-center gap-3 text-xs text-brand-dark dark:text-brand-dark">
          <span>✓</span><span>Live messages loaded — {apiThreads.length} thread{apiThreads.length !== 1 ? 's' : ''} from server</span>
        </div>
      )}
      {(!apiMsgResult || apiThreads.length === 0) && (
        <div className="mb-4 bg-brand-pale0/10 border border-brand-light/30 rounded-lg px-4 py-2.5 flex items-center gap-3 text-xs text-brand-deep dark:text-brand-deep">
          <span>💬</span><span>No messages yet — send a message and threads will appear here</span>
        </div>
      )}      {/* Compose Modal */}
      {composing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-separator w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-separator">
              <h3 className="text-[15px] font-semibold text-content-primary">New Message</h3>
              <button onClick={() => setComposing(false)} className="text-content-secondary hover:text-content-primary"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-content-secondary mb-1 block">Type</label>
                  <select value={newEntityType} onChange={e => { setNewEntityType(e.target.value); setNewEntityId('') }}
                    className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-secondary">
                    {['general','patient','claim','appointment'].map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                {newEntityType === 'patient' && (
                  <div>
                    <label className="text-[11px] text-content-secondary mb-1 block">Patient</label>
                    <select value={newEntityId} onChange={e => setNewEntityId(e.target.value)}
                      className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-secondary">
                      <option value="">Select patient…</option>
                      {patients.map((p: any) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                    </select>
                  </div>
                )}
                {newEntityType === 'claim' && (
                  <div>
                    <label className="text-[11px] text-content-secondary mb-1 block">Claim</label>
                    <select value={newEntityId} onChange={e => setNewEntityId(e.target.value)}
                      className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-secondary">
                      <option value="">Select claim…</option>
                      {claims.map((c: any) => <option key={c.id} value={c.id}>{c.claim_number} — {c.patient_name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="text-[11px] text-content-secondary mb-1 block">Subject</label>
                <input value={newSubject} onChange={e => setNewSubject(e.target.value)}
                  placeholder="Message subject…"
                  className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-secondary placeholder:text-content-tertiary" />
              </div>
              <div>
                <label className="text-[11px] text-content-secondary mb-1 block">Message</label>
                <textarea value={newBody} onChange={e => setNewBody(e.target.value)} rows={4}
                  placeholder="Write your message…"
                  className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-secondary placeholder:text-content-tertiary resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setComposing(false)} className="px-4 py-2 text-sm text-content-secondary hover:text-content-primary">Cancel</button>
                <button onClick={handleComposeSend} disabled={!newSubject.trim() || !newBody.trim()}
                  className="flex items-center gap-2 bg-brand text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-deep disabled:opacity-50 transition-colors">
                  <Send size={14}/> Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:grid sm:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        {/* Thread List — hidden on mobile when a message is selected */}
        <div className={`card overflow-hidden flex flex-col ${selected ? 'hidden sm:flex' : 'flex'}`}>
          <div className="p-3 border-b border-separator">
            <select value={filter} onChange={e=>setFilter(e.target.value)}
              className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-1.5 text-xs text-content-secondary">
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
                <div className="text-[11px] text-content-secondary truncate">{m.lastMessage}</div>
                <div className="flex items-center justify-between mt-1">
                  {isStaff && <span className="text-[11px] text-content-secondary">{m.clientName}</span>}
                  <span className="text-[11px] text-content-secondary ml-auto">{new Date(m.timestamp).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Conversation — full width on mobile, 2/3 on desktop */}
        <div className={`sm:col-span-2 card flex flex-col overflow-hidden ${selected ? 'flex' : 'hidden sm:flex'}`}>
          {selected ? (
            <>
              <div className="px-4 py-3 border-b border-separator">
                <div className="flex items-center gap-2">
                  {/* Back button — mobile only */}
                  <button onClick={() => setSelected(null)} className="sm:hidden p-1 -ml-1 text-content-secondary hover:text-content-primary">
                    <ArrowLeft size={18}/>
                  </button>
                  <span className="text-content-secondary">{entityIcons[selected.entityType]}</span>
                  <div>
                    <h3 className="text-sm font-semibold">{selected.subject}</h3>
                    <span className="text-[11px] text-content-secondary">Re: {selected.entityLabel} • {selected.clientName}</span>
                  </div>
                  <StatusBadge status={selected.status} small/>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selected.messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'client' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-card px-3 py-2 ${msg.role === 'client' ? 'bg-brand/10 border border-brand/20' : 'bg-surface-elevated border border-separator'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-medium">{msg.sender}</span>
                        <span className={`text-[9px] px-1 rounded ${msg.role === 'client' ? 'bg-brand/20 text-brand-dark text-brand-dark dark:text-brand-dark' : 'bg-blue-500/20 text-brand-dark dark:text-brand'}`}>{msg.role}</span>
                      </div>
                      <p className="text-xs">{msg.text}</p>
                      <span className="text-[9px] text-content-secondary block mt-1">{new Date(msg.time).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-separator flex gap-2">
                <button onClick={() => router.push('/documents')} title="Attach from Documents" className="text-content-secondary hover:text-content-primary p-2"><Paperclip size={16}/></button>
                <input value={reply} onChange={e=>setReply(e.target.value)} placeholder="Type a message..."
                  className="flex-1 bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm text-content-secondary placeholder:text-content-tertiary"
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
