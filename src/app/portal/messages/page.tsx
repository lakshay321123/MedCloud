'use client'
import React, { useState } from 'react'
import { useApp } from '@/lib/context'
import { demoMessages, DemoMessage } from '@/lib/demo-data'
import ModuleShell from '@/components/shared/ModuleShell'
import StatusBadge from '@/components/shared/StatusBadge'
import { MessageCircle, Send, Paperclip, User, FileText, Calendar, ClipboardList, Building2 } from 'lucide-react'

const entityIcons: Record<string, React.ReactNode> = {
  patient: <User size={14}/>, claim: <FileText size={14}/>, submission: <ClipboardList size={14}/>,
  appointment: <Calendar size={14}/>, general: <Building2 size={14}/>,
}

export default function MessagesPage() {
  const { currentUser, selectedClient } = useApp()
  const [selected, setSelected] = useState<DemoMessage | null>(demoMessages[0])
  const [filter, setFilter] = useState('')
  const [reply, setReply] = useState('')
  const isStaff = !['client','provider'].includes(currentUser.role)

  const messages = demoMessages.filter(m => {
    if (filter && m.entityType !== filter) return false
    if (!isStaff && m.clientId !== 'org-102') return false
    if (isStaff && selectedClient && m.clientId !== selectedClient.id) return false
    return true
  })

  return (
    <ModuleShell title="Messages" subtitle="Conversations about patients, claims, and submissions" sprint={2}>
      <div className="grid grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        {/* Thread List */}
        <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border">
            <select value={filter} onChange={e=>setFilter(e.target.value)}
              className="w-full bg-white/5 border border-border rounded-lg px-3 py-1.5 text-xs text-white">
              <option value="">All Types</option>
              {['patient','claim','submission','appointment','general'].map(t=>(
                <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto">
            {messages.map(m => (
              <button key={m.id} onClick={() => setSelected(m)}
                className={`w-full text-left px-3 py-3 border-b border-border hover:bg-white/5 transition-all ${selected?.id===m.id ? 'bg-brand/5 border-l-2 border-l-brand' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-muted">{entityIcons[m.entityType]}</span>
                  <span className="text-xs font-medium truncate flex-1">{m.subject}</span>
                  {m.unread && <span className="w-2 h-2 bg-brand rounded-full shrink-0"/>}
                </div>
                <div className="text-[10px] text-muted truncate">{m.lastMessage}</div>
                <div className="flex items-center justify-between mt-1">
                  {isStaff && <span className="text-[10px] text-muted">{m.clientName}</span>}
                  <span className="text-[10px] text-muted ml-auto">{new Date(m.timestamp).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Conversation */}
        <div className="col-span-2 bg-bg-secondary border border-border rounded-xl flex flex-col overflow-hidden">
          {selected ? (
            <>
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="text-muted">{entityIcons[selected.entityType]}</span>
                  <div>
                    <h3 className="text-sm font-semibold">{selected.subject}</h3>
                    <span className="text-[10px] text-muted">Re: {selected.entityLabel} • {selected.clientName}</span>
                  </div>
                  <StatusBadge status={selected.status} small/>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selected.messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'client' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-xl px-3 py-2 ${msg.role === 'client' ? 'bg-brand/10 border border-brand/20' : 'bg-white/5 border border-border'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-medium">{msg.sender}</span>
                        <span className={`text-[9px] px-1 rounded ${msg.role === 'client' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>{msg.role}</span>
                      </div>
                      <p className="text-xs">{msg.text}</p>
                      <span className="text-[9px] text-muted block mt-1">{new Date(msg.time).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-border flex gap-2">
                <button className="text-muted hover:text-white p-2"><Paperclip size={16}/></button>
                <input value={reply} onChange={e=>setReply(e.target.value)} placeholder="Type a message..."
                  className="flex-1 bg-white/5 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted"
                  onKeyDown={e => { if (e.key === 'Enter' && reply.trim()) setReply('') }}/>
                <button onClick={() => setReply('')} className="bg-brand text-white rounded-lg px-3 py-2 hover:bg-brand-dark"><Send size={16}/></button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted text-sm">
              <MessageCircle size={24} className="mr-2 opacity-30"/> Select a conversation
            </div>
          )}
        </div>
      </div>
    </ModuleShell>
  )
}
