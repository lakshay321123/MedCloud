'use client'
import React, { useState, useEffect } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import { useToast } from '@/components/shared/Toast'
import { api } from '@/lib/api-client'
import { useApp } from '@/lib/context'
import { useClients } from '@/lib/hooks/useEntities'
import { Plus, Trash2, Edit3, Save, X, Zap, ChevronDown } from 'lucide-react'

interface CodingRule {
  id: string
  rule_name: string
  payer_name?: string
  payer_id?: string
  client_id?: string
  condition_field: string
  condition_operator: string
  condition_value: string
  action_type: string
  action_value: string
  is_active: boolean
  priority: number
  created_at?: string
}

export default function CodingRulesPage() {
  const { toast } = useToast()
  const { selectedClient } = useApp()
  const { data: clientsRaw } = useClients()
  const clients = (clientsRaw as any)?.data || []
  const [rules, setRules] = useState<CodingRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterClient, setFilterClient] = useState('')
  const [filterPayer, setFilterPayer] = useState('')

  const [form, setForm] = useState({
    rule_name: '', payer_name: '', client_id: '',
    condition_field: 'diagnosis', condition_operator: 'contains', condition_value: '',
    action_type: 'auto_code', action_value: '', priority: 100,
    english_rule: '' // Natural language rule that AI converts
  })

  useEffect(() => {
    api.get<{ data: CodingRule[] }>('/coding-rules')
      .then(r => { setRules(r.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = rules.filter(r => {
    if (filterClient && r.client_id !== filterClient) return false
    if (filterPayer && !r.payer_name?.toLowerCase().includes(filterPayer.toLowerCase())) return false
    return true
  })

  const saveRule = async () => {
    try {
      if (editingId) {
        await api.patch(`/coding-rules/${editingId}`, form)
        setRules(prev => prev.map(r => r.id === editingId ? { ...r, ...form } : r))
        toast.success('Rule updated')
        setEditingId(null)
      } else {
        const r = await api.post<CodingRule>('/coding-rules', { ...form, is_active: true })
        setRules(prev => [...prev, r])
        toast.success('Rule created')
      }
      setShowAdd(false)
      setForm({ rule_name: '', payer_name: '', client_id: '', condition_field: 'diagnosis', condition_operator: 'contains', condition_value: '', action_type: 'auto_code', action_value: '', priority: 100, english_rule: '' })
    } catch { toast.error('Failed to save rule') }
  }

  const deleteRule = async (id: string) => {
    if (!confirm('Delete this coding rule?')) return
    try {
      await api.delete('/coding-rules/' + id)
      setRules(prev => prev.filter(r => r.id !== id))
      toast.success('Rule deleted')
    } catch { toast.error('Failed to delete') }
  }

  const toggleActive = async (rule: CodingRule) => {
    try {
      await api.patch(`/coding-rules/${rule.id}`, { is_active: !rule.is_active })
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
    } catch { toast.error('Failed to toggle') }
  }

  const convertEnglishToRule = () => {
    // Parse natural language into structured rule
    const text = form.english_rule.toLowerCase()
    if (text.includes('modifier 25') || text.includes('mod 25')) {
      setForm(p => ({ ...p, action_type: 'add_modifier', action_value: '25', condition_field: 'cpt_code', condition_operator: 'starts_with', condition_value: '992' }))
    } else if (text.includes('replace') && text.includes('with')) {
      const match = text.match(/replace\s+(\S+)\s+with\s+(\S+)/i)
      if (match) setForm(p => ({ ...p, action_type: 'replace_code', action_value: match[2], condition_field: 'cpt_code', condition_operator: 'equals', condition_value: match[1] }))
    } else if (text.includes('never') || text.includes('deny') || text.includes('block')) {
      const codeMatch = text.match(/\b(\d{5})\b/)
      if (codeMatch) setForm(p => ({ ...p, action_type: 'deny_code', action_value: codeMatch[1], condition_field: 'cpt_code', condition_operator: 'equals', condition_value: codeMatch[1] }))
    } else if (text.includes('flag') || text.includes('review')) {
      setForm(p => ({ ...p, action_type: 'flag_review', action_value: form.english_rule }))
    }
    if (!form.rule_name && form.english_rule) setForm(p => ({ ...p, rule_name: p.english_rule.slice(0, 80) }))
    toast.info('Rule interpreted — review and adjust the fields below')
  }

  return (
    <ModuleShell title="Coding Rules Engine" subtitle="Configure payer-specific and client-specific AI coding rules">
      <div className="space-y-6">
        {/* Filters */}
        <div className="card p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-content-tertiary font-semibold block mb-1">Client</label>
              <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
                className="bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-xs text-content-secondary min-w-[200px]">
                <option value="">All Clients</option>
                {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-content-tertiary font-semibold block mb-1">Payer</label>
              <input value={filterPayer} onChange={e => setFilterPayer(e.target.value)} placeholder="Filter by payer name..."
                className="bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-xs text-content-secondary min-w-[200px]" />
            </div>
            <div className="ml-auto">
              <button onClick={() => { setShowAdd(true); setEditingId(null) }}
                className="bg-brand text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 hover:bg-brand-deep transition-colors">
                <Plus size={14} /> Add Rule
              </button>
            </div>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showAdd && (
          <div className="card p-6 border-2 border-brand/30">
            <h3 className="text-sm font-semibold text-content-primary mb-4">{editingId ? 'Edit Rule' : 'New Coding Rule'}</h3>

            {/* Natural language input */}
            <div className="mb-4 p-4 bg-blue-500/10 border border-brand/20 rounded-xl">
              <label className="text-[11px] uppercase tracking-wider text-brand-dark font-semibold block mb-2">
                <Zap size={12} className="inline mr-1" /> Write rule in plain English
              </label>
              <div className="flex gap-2">
                <input value={form.english_rule} onChange={e => setForm(p => ({ ...p, english_rule: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && convertEnglishToRule()}
                  placeholder='e.g. "For Aetna, always add modifier 25 when E/M is billed with injection" or "Never bill 99215 for this client"'
                  className="flex-1 bg-surface-elevated border border-separator rounded-lg px-3 py-2.5 text-sm text-content-secondary placeholder:text-content-tertiary focus:border-brand/40 outline-none" />
                <button onClick={convertEnglishToRule} disabled={!form.english_rule}
                  className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-mid disabled:opacity-40 whitespace-nowrap flex items-center gap-1">
                  <Zap size={13} /> Convert
                </button>
              </div>
              <p className="text-[11px] text-brand-dark mt-1">AI will interpret your English rule and fill in the structured fields below. Review and adjust before saving.</p>
            </div>

            {/* Structured fields */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-content-tertiary font-semibold block mb-1">Rule Name</label>
                <input value={form.rule_name} onChange={e => setForm(p => ({ ...p, rule_name: e.target.value }))} placeholder="Descriptive name"
                  className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-content-tertiary font-semibold block mb-1">Payer</label>
                <input value={form.payer_name} onChange={e => setForm(p => ({ ...p, payer_name: e.target.value }))} placeholder="e.g. Aetna, UHC (blank = all payers)"
                  className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-content-tertiary font-semibold block mb-1">Client</label>
                <select value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}
                  className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm">
                  <option value="">All Clients</option>
                  {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-content-tertiary font-semibold block mb-1">Priority (lower = runs first)</label>
                <input type="number" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: +e.target.value }))}
                  className="w-full bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="p-4 bg-surface-elevated rounded-xl border border-separator mb-4">
              <p className="text-[11px] uppercase tracking-wider text-content-tertiary font-semibold mb-3">Condition → Action</p>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <select value={form.condition_field} onChange={e => setForm(p => ({ ...p, condition_field: e.target.value }))}
                  className="bg-surface-default border border-separator rounded-lg px-3 py-2 text-sm text-content-secondary">
                  <option value="diagnosis">IF Diagnosis (ICD)</option>
                  <option value="cpt_code">IF CPT Code</option>
                  <option value="specialty">IF Provider Specialty</option>
                  <option value="visit_type">IF Visit Type</option>
                  <option value="age">IF Patient Age</option>
                  <option value="assessment">IF Assessment contains</option>
                  <option value="plan">IF Plan contains</option>
                  <option value="em_level">IF E/M Level</option>
                </select>
                <select value={form.condition_operator} onChange={e => setForm(p => ({ ...p, condition_operator: e.target.value }))}
                  className="bg-surface-default border border-separator rounded-lg px-3 py-2 text-sm text-content-secondary">
                  <option value="contains">contains</option>
                  <option value="equals">equals</option>
                  <option value="starts_with">starts with</option>
                  <option value="not_equals">does not equal</option>
                  <option value="greater_than">greater than</option>
                  <option value="less_than">less than</option>
                </select>
                <input value={form.condition_value} onChange={e => setForm(p => ({ ...p, condition_value: e.target.value }))} placeholder="Value"
                  className="bg-surface-default border border-separator rounded-lg px-3 py-2 text-sm text-content-secondary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select value={form.action_type} onChange={e => setForm(p => ({ ...p, action_type: e.target.value }))}
                  className="bg-surface-default border border-separator rounded-lg px-3 py-2 text-sm text-content-secondary">
                  <option value="auto_code">→ Auto-assign code</option>
                  <option value="add_modifier">→ Add modifier</option>
                  <option value="replace_code">→ Replace code with</option>
                  <option value="flag_review">→ Flag for manual review</option>
                  <option value="deny_code">→ Never use this code</option>
                  <option value="add_diagnosis">→ Add diagnosis</option>
                  <option value="set_em_level">→ Override E/M level</option>
                  <option value="custom_prompt">→ Custom AI instruction</option>
                </select>
                <input value={form.action_value} onChange={e => setForm(p => ({ ...p, action_value: e.target.value }))}
                  placeholder="e.g. 99214-25, E11.65, or custom instruction..."
                  className="bg-surface-default border border-separator rounded-lg px-3 py-2 text-sm text-content-secondary" />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShowAdd(false); setEditingId(null) }} className="flex-1 border border-separator rounded-lg py-2.5 text-sm text-content-secondary">Cancel</button>
              <button onClick={saveRule} disabled={!form.rule_name || !form.condition_value || !form.action_value}
                className="flex-1 bg-brand text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2">
                <Save size={14} /> {editingId ? 'Update Rule' : 'Save Rule'}
              </button>
            </div>
          </div>
        )}

        {/* Rules list */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-separator text-xs text-content-tertiary uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Active</th>
                  <th className="text-left px-4 py-3">Rule</th>
                  <th className="text-left px-4 py-3">Payer</th>
                  <th className="text-left px-4 py-3">Condition</th>
                  <th className="text-left px-4 py-3">Action</th>
                  <th className="text-left px-4 py-3">Priority</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-content-tertiary text-xs">Loading rules...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center">
                    <Zap size={28} className="mx-auto mb-2 text-content-tertiary opacity-30" />
                    <p className="text-sm text-content-primary font-medium mb-1">No coding rules yet</p>
                    <p className="text-xs text-content-tertiary">Add rules to customize how AI assigns codes per payer and client</p>
                  </td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className="border-b border-separator last:border-0 hover:bg-surface-elevated transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(r)}
                        className={`w-8 h-4 rounded-full transition-colors ${r.is_active ? 'bg-brand' : 'bg-gray-400'}`}>
                        <div className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${r.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-content-primary text-xs">{r.rule_name}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-content-secondary">{r.payer_name || 'All Payers'}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className="font-mono text-content-tertiary">IF</span> {r.condition_field} <span className="text-brand">{r.condition_operator}</span> <span className="font-mono">&quot;{r.condition_value}&quot;</span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="text-brand-deep">→</span> {r.action_type}: <span className="font-mono text-brand">{r.action_value}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-content-tertiary">{r.priority}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setForm({ rule_name: r.rule_name, payer_name: r.payer_name || '', client_id: r.client_id || '', condition_field: r.condition_field, condition_operator: r.condition_operator, condition_value: r.condition_value, action_type: r.action_type, action_value: r.action_value, priority: r.priority, english_rule: '' }); setEditingId(r.id); setShowAdd(true) }}
                          className="p-1 rounded hover:bg-surface-elevated text-content-secondary"><Edit3 size={13} /></button>
                        <button onClick={() => deleteRule(r.id)}
                          className="p-1 rounded hover:bg-red-500/10 text-content-tertiary hover:text-red-500"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ModuleShell>
  )
}
