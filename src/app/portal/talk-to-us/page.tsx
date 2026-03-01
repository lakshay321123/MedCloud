'use client'

import React, { useState } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import { MessageSquare, Plus, Send, X, Clock, CheckCircle, AlertCircle, Paperclip } from 'lucide-react'

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

interface Ticket {
  id: string
  subject: string
  category: string
  status: TicketStatus
  priority: TicketPriority
  createdAt: string
  lastUpdate: string
  messages: { sender: string; text: string; time: string; isClient: boolean }[]
}

const demoTickets: Ticket[] = [
  {
    id: 'WO-1001', subject: 'Missing ERA for January batch', category: 'Payment Issue', status: 'in_progress', priority: 'high', createdAt: '2026-02-25', lastUpdate: '2026-03-01 10:30',
    messages: [
      { sender: 'Dr. Smith (Client)', text: 'We haven\'t received the ERA for our January claims from UHC. Can you check?', time: '2026-02-25 09:15', isClient: true },
      { sender: 'Billing Team', text: 'Looking into this now. UHC shows a processing delay on their end. We\'ve escalated with their EDI team.', time: '2026-02-26 11:20', isClient: false },
      { sender: 'Billing Team', text: 'Update: UHC confirmed the ERA will be released by EOD today. Will post as soon as received.', time: '2026-03-01 10:30', isClient: false },
    ]
  },
  {
    id: 'WO-1002', subject: 'Need to add new provider to our account', category: 'Account Setup', status: 'open', priority: 'medium', createdAt: '2026-03-01', lastUpdate: '2026-03-01 08:00',
    messages: [
      { sender: 'Dr. Smith (Client)', text: 'We have a new PA joining — Dr. Sarah Chen, NPI 1234567890. Please add her to our credentialing and billing setup.', time: '2026-03-01 08:00', isClient: true },
    ]
  },
  {
    id: 'WO-1003', subject: 'Patient balance report for February', category: 'Report Request', status: 'resolved', priority: 'low', createdAt: '2026-02-28', lastUpdate: '2026-03-01 14:00',
    messages: [
      { sender: 'Office Manager', text: 'Can we get the patient balance report for February? Need it for our monthly meeting.', time: '2026-02-28 16:00', isClient: true },
      { sender: 'AR Team', text: 'Report attached. Total patient balances: $12,450. Let us know if you need any drill-down.', time: '2026-03-01 14:00', isClient: false },
    ]
  },
]

const statusColors: Record<TicketStatus, string> = {
  open: 'bg-blue-500/10 text-blue-400', in_progress: 'bg-amber-500/10 text-amber-400',
  resolved: 'bg-emerald-500/10 text-emerald-400', closed: 'bg-[var(--text-secondary)]/10 text-[var(--text-secondary)]',
}

const priorityColors: Record<TicketPriority, string> = {
  low: 'text-[var(--text-secondary)]', medium: 'text-blue-400', high: 'text-amber-400', urgent: 'text-red-400',
}

export default function TalkToUsPage() {
  const [tickets, setTickets] = useState<Ticket[]>(demoTickets)
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newMsg, setNewMsg] = useState('')
  const [newForm, setNewForm] = useState({ subject: '', category: 'General', priority: 'medium' as TicketPriority, message: '' })

  const handleCreate = () => {
    const ticket: Ticket = {
      id: `WO-${1000 + tickets.length + 1}`,
      subject: newForm.subject,
      category: newForm.category,
      status: 'open',
      priority: newForm.priority,
      createdAt: new Date().toISOString().split('T')[0],
      lastUpdate: new Date().toLocaleString(),
      messages: [{ sender: 'You (Client)', text: newForm.message, time: new Date().toLocaleString(), isClient: true }],
    }
    setTickets([ticket, ...tickets])
    setShowNew(false)
    setNewForm({ subject: '', category: 'General', priority: 'medium', message: '' })
  }

  const handleReply = () => {
    if (!selected || !newMsg.trim()) return
    const updated = { ...selected, messages: [...selected.messages, { sender: 'You (Client)', text: newMsg, time: new Date().toLocaleString(), isClient: true }], lastUpdate: new Date().toLocaleString() }
    setTickets(tickets.map(t => t.id === selected.id ? updated : t))
    setSelected(updated)
    setNewMsg('')
  }

  return (
    <ModuleShell title="Talk to Us" subtitle="Work orders, messaging, and support requests" sprint="Sprint 4" icon={<MessageSquare size={20} />}
      actions={<button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors"><Plus size={16} /> New Request</button>}
    >
      {/* New Ticket Modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">New Support Request</h2>
              <button onClick={() => setShowNew(false)}><X size={20} className="text-[var(--text-secondary)]" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Subject *</label>
                <input type="text" value={newForm.subject} onChange={e => setNewForm({ ...newForm, subject: e.target.value })} placeholder="Brief description of your request" className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">Category</label>
                  <select value={newForm.category} onChange={e => setNewForm({ ...newForm, category: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]">
                    {['General', 'Payment Issue', 'Claim Issue', 'Account Setup', 'Report Request', 'Credentialing', 'Technical Issue'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">Priority</label>
                  <select value={newForm.priority} onChange={e => setNewForm({ ...newForm, priority: e.target.value as TicketPriority })} className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]">
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Message *</label>
                <textarea value={newForm.message} onChange={e => setNewForm({ ...newForm, message: e.target.value })} rows={4} placeholder="Describe your request in detail..." className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-[var(--border-color)]">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-[var(--text-secondary)]">Cancel</button>
              <button onClick={handleCreate} disabled={!newForm.subject || !newForm.message} className="px-6 py-2 bg-brand text-white rounded-lg text-sm font-medium disabled:opacity-50">Submit</button>
            </div>
          </div>
        </div>
      )}

      {/* Conversation Panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">{selected.subject}</h2>
                <p className="text-[10px] text-[var(--text-secondary)]">{selected.id} • {selected.category}</p>
              </div>
              <button onClick={() => setSelected(null)}><X size={18} className="text-[var(--text-secondary)]" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selected.messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.isClient ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-xl ${msg.isClient ? 'bg-brand/10 text-[var(--text-primary)]' : 'bg-[var(--bg-primary)] text-[var(--text-primary)]'}`}>
                    <p className="text-[10px] font-semibold mb-1 text-[var(--text-secondary)]">{msg.sender}</p>
                    <p className="text-sm">{msg.text}</p>
                    <p className="text-[9px] text-[var(--text-secondary)] mt-1">{msg.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-[var(--border-color)] flex gap-2">
              <input type="text" value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleReply()} placeholder="Type a reply..." className="flex-1 px-3 py-2 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
              <button onClick={handleReply} className="p-2 bg-brand text-white rounded-lg hover:bg-brand-dark"><Send size={16} /></button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket List */}
      <div className="space-y-3">
        {tickets.map(t => (
          <div key={t.id} onClick={() => setSelected(t)} className="p-4 rounded-xl border bg-[var(--bg-card)] border-[var(--border-color)] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors glow-border">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-brand">{t.id}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[t.status]}`}>{t.status.replace('_', ' ')}</span>
                <span className={`text-[10px] ${priorityColors[t.priority]}`}>● {t.priority}</span>
              </div>
              <span className="text-[10px] text-[var(--text-secondary)]">{t.lastUpdate}</span>
            </div>
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">{t.subject}</h3>
            <p className="text-xs text-[var(--text-secondary)]">{t.category} • {t.messages.length} message{t.messages.length !== 1 ? 's' : ''}</p>
          </div>
        ))}
      </div>
    </ModuleShell>
  )
}
