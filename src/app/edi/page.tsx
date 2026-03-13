'use client'
import { useT } from '@/lib/i18n'
import React, { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import { useApp } from '@/lib/context'
import { useToast } from '@/components/shared/Toast'
import { useEDITransactions, useCreateEDITransaction } from '@/lib/hooks'
import type { ApiEDITransaction } from '@/lib/hooks'
// Region filtering handled by backend
import {
  ArrowLeftRight, FileText, Download, Upload, Search, X, Eye,
  CheckCircle2, AlertTriangle, Clock, RefreshCw, Filter, Copy,
  ArrowUpRight, ArrowDownLeft, ChevronDown
} from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  '837P': '837P Professional',
  '837I': '837I Institutional',
  '835': '835 Remittance (ERA)',
  '270': '270 Eligibility Request',
  '271': '271 Eligibility Response',
  '276': '276 Claim Status Inquiry',
  '277': '277 Claim Status Response',
  '999': '999 Acknowledgment',
  'DHA': 'DHA eClaim (UAE)',
}

const TYPE_COLORS: Record<string, string> = {
  '837P': 'bg-brand/10 text-brand-dark dark:text-brand',
  '837I': 'bg-brand/10 text-brand-dark',
  '835': 'bg-brand/10 text-brand-dark dark:text-brand-dark',
  '270': 'bg-brand-pale0/10 text-brand-deep dark:text-brand-deep',
  '271': 'bg-brand-pale0/10 text-brand-deep dark:text-brand-deep',
  '276': 'bg-brand/10 text-brand-dark dark:text-brand-dark',
  '277': 'bg-brand/10 text-brand-dark dark:text-brand-dark',
  '999': 'bg-gray-500/10 text-gray-600 dark:text-content-tertiary',
  'DHA': 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
}

type TabKey = 'all' | '837' | '835' | '270' | '276' | 'dha'

export default function EDITransactionsPage() {
  const { t } = useT()
  const { selectedClient } = useApp()

  return (
    <ModuleShell title="EDI Transactions">
      <EDIContent />
    </ModuleShell>
  )
}

function EDIContent() {
  const { t } = useT()
  const { toast } = useToast()
  const { selectedClient } = useApp()
  const { data: apiResult, loading, error, refetch } = useEDITransactions({ limit: 500 })

  const [tab, setTab] = useState<TabKey>('all')
  const [search, setSearch] = useState('')
  const [dirFilter, setDirFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [selected, setSelected] = useState<ApiEDITransaction | null>(null)

  // Region + client filter
  const transactions = useMemo(() => {
    const raw = apiResult?.data || []
    return raw.filter(tx => {
      if (selectedClient && tx.client_id && tx.client_id !== selectedClient.id) return false
      // Region filtering handled by backend via useClientParams
      return true
    })
  }, [apiResult, selectedClient])

  // Tab filter
  const tabFiltered = useMemo(() => {
    if (tab === 'all') return transactions
    if (tab === '837') return transactions.filter(tx => tx.transaction_type === '837P' || tx.transaction_type === '837I')
    if (tab === '835') return transactions.filter(tx => tx.transaction_type === '835')
    if (tab === '270') return transactions.filter(tx => tx.transaction_type === '270' || tx.transaction_type === '271')
    if (tab === '276') return transactions.filter(tx => tx.transaction_type === '276' || tx.transaction_type === '277' || tx.transaction_type === '999')
    if (tab === 'dha') return transactions.filter(tx => tx.transaction_type === 'DHA')
    return transactions
  }, [transactions, tab])

  // Search + dir + status filter
  const filtered = useMemo(() => {
    return tabFiltered.filter(tx => {
      if (dirFilter && tx.direction !== dirFilter) return false
      if (statusFilter && tx.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const matchesType = (tx.transaction_type || '').toLowerCase().includes(q)
        const matchesFile = (tx.file_name || '').toLowerCase().includes(q)
        const matchesClaim = (tx.claim_id || '').toLowerCase().includes(q)
        const matchesClearinghouse = (tx.clearinghouse || '').toLowerCase().includes(q)
        if (!matchesType && !matchesFile && !matchesClaim && !matchesClearinghouse) return false
      }
      return true
    })
  }, [tabFiltered, dirFilter, statusFilter, search])

  // KPIs
  const kpis = useMemo(() => {
    const total = transactions.length
    const pending = transactions.filter(tx => tx.status === 'pending' || tx.status === 'sent').length
    const accepted = transactions.filter(tx => tx.status === 'accepted' || tx.status === 'received' || tx.status === 'parsed' || tx.status === 'processing').length
    const errors = transactions.filter(tx => tx.status === 'rejected' || tx.status === 'error').length
    const outbound = transactions.filter(tx => tx.direction === 'outbound').length
    return { total, pending, accepted, errors, outbound, successRate: total > 0 ? Math.round((accepted / total) * 100) : 0 }
  }, [transactions])

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'all', label: 'All Transactions', count: transactions.length },
    { key: '837', label: '837 Claims', count: transactions.filter(tx => tx.transaction_type === '837P' || tx.transaction_type === '837I').length },
    { key: '835', label: '835 ERA', count: transactions.filter(tx => tx.transaction_type === '835').length },
    { key: '270', label: '270/271 Eligibility', count: transactions.filter(tx => tx.transaction_type === '270' || tx.transaction_type === '271').length },
    { key: '276', label: '276/277/999 Status', count: transactions.filter(tx => tx.transaction_type === '276' || tx.transaction_type === '277' || tx.transaction_type === '999').length },
    { key: 'dha', label: 'DHA (UAE)', count: transactions.filter(tx => tx.transaction_type === 'DHA').length },
  ]

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KPICard label="Total Transactions" value={kpis.total} />
        <KPICard label="Outbound Sent" value={kpis.outbound} />
        <KPICard label="Pending" value={kpis.pending} />
        <KPICard label="Accepted" value={kpis.accepted} />
        <KPICard label="Errors" value={kpis.errors} />
        <KPICard label="Success Rate" value={`${kpis.successRate}%`} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
              tab === t.key
                ? 'bg-brand text-white border border-brand'
                : 'text-content-tertiary border border-transparent hover:text-content-primary hover:bg-surface-elevated'
            }`}>
            {t.label} <span className="ml-1 opacity-60">({t.count})</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => refetch()} className="p-1.5 rounded-btn hover:bg-surface-elevated text-content-secondary transition-colors" title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-secondary" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search type, file, claim…"
            className="w-full bg-surface-elevated border border-separator rounded-lg pl-9 pr-3 py-2 text-xs text-content-secondary placeholder:text-content-tertiary focus:outline-none focus:border-brand/40" />
        </div>
        <select value={dirFilter} onChange={e => setDirFilter(e.target.value)}
          className="bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-xs text-content-secondary">
          <option value="">All Directions</option>
          <option value="outbound">Outbound</option>
          <option value="inbound">Inbound</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-surface-elevated border border-separator rounded-lg px-3 py-2 text-xs text-content-secondary">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="received">Received</option>
          <option value="processing">Processing</option>
          <option value="rejected">Rejected</option>
          <option value="error">Error</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-content-secondary text-sm">Loading EDI transactions…</div>
        ) : error ? (
          <div className="p-8 text-center text-[#065E76] text-sm">Failed to load transactions. <button onClick={() => refetch()} className="text-brand underline ml-1">Retry</button></div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-content-tertiary text-sm">
            {transactions.length === 0 ? 'No EDI transactions yet. Transactions appear when claims are submitted or ERA files are processed.' : 'No transactions match your filters.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-separator text-xs text-content-secondary">
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Direction</th>
                <th className="text-left px-4 py-3">Clearinghouse</th>
                <th className="text-left px-4 py-3">Claims</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Response</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-right px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map(tx => {
                return (
                  <tr key={tx.id} onClick={() => setSelected(tx)}
                    className="border-b border-separator/50 hover:bg-surface-elevated/50 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium ${TYPE_COLORS[tx.transaction_type] || 'bg-gray-500/10 text-content-tertiary'}`}>
                        {tx.transaction_type}
                      </span>
                      {tx.file_name && <p className="text-[11px] text-content-tertiary mt-0.5 truncate max-w-[140px]">{tx.file_name}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-content-secondary">
                        {tx.direction === 'outbound' ? <ArrowUpRight size={12} className="text-brand" /> : <ArrowDownLeft size={12} className="text-brand-dark" />}
                        {tx.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-content-secondary">{tx.clearinghouse || '—'}</td>
                    <td className="px-4 py-3 text-xs text-content-primary font-medium">{tx.claim_count ?? '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-content-secondary truncate max-w-[160px]">{tx.response_code || tx.response_detail || '—'}</td>
                    <td className="px-4 py-3 text-[11px] text-content-tertiary">
                      {tx.submitted_at ? new Date(tx.submitted_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) :
                       tx.created_at ? new Date(tx.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={e => { e.stopPropagation(); setSelected(tx) }}
                        className="p-1 rounded hover:bg-surface-elevated text-content-secondary hover:text-brand transition-colors">
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {filtered.length > 100 && (
          <div className="px-4 py-2 text-xs text-content-tertiary border-t border-separator">
            Showing 100 of {filtered.length} transactions
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      {selected && <EDIDetailDrawer tx={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function EDIDetailDrawer({ tx, onClose }: { tx: ApiEDITransaction; onClose: () => void }) {
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const drawerRef = React.useRef<HTMLDivElement>(null)
  const closeButtonRef = React.useRef<HTMLButtonElement>(null)
  useEffect(() => { setMounted(true) }, [])

  // Move focus into drawer on open; restore to trigger on close
  useEffect(() => {
    if (!mounted) return
    const prev = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()
    return () => { prev?.focus() }
  }, [mounted])

  // Trap focus within drawer — Tab cycles through focusable children only
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab' || !drawerRef.current) return
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
        )
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleCopyId() {
    navigator.clipboard.writeText(tx.id).then(() => toast.success('Transaction ID copied'))
  }

  const titleId = `edi-drawer-title-${tx.id.slice(0, 8)}`

  // Lock body scroll while drawer is open
  useEffect(() => {
    document.body.classList.add('overflow-hidden')
    return () => { document.body.classList.remove('overflow-hidden') }
  }, [])

  const content = (
    <div className="fixed inset-0 z-[9999] flex justify-end" aria-hidden="false">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-lg bg-surface-secondary border-l border-separator shadow-2xl overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-separator px-6 py-4 flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-2">
              <span id={titleId} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold ${TYPE_COLORS[tx.transaction_type] || 'bg-gray-500/10 text-content-tertiary'}`}>
                {tx.transaction_type}
              </span>
              <StatusBadge status={tx.status} />
            </div>
            <p className="text-[11px] text-content-tertiary mt-1">{TYPE_LABELS[tx.transaction_type] || tx.transaction_type}</p>
          </div>
          <button ref={closeButtonRef} onClick={onClose} aria-label="Close drawer" className="p-1.5 rounded-btn hover:bg-surface-elevated text-content-secondary"><X size={18} /></button>
        </div>

        {/* Details */}
        <div className="px-6 py-5 space-y-5">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-4">
            <DetailField label="Transaction ID" value={tx.id.slice(0, 8) + '…'} action={<button onClick={handleCopyId}><Copy size={12} className="text-content-tertiary hover:text-brand" /></button>} />
            <DetailField label="Direction" value={tx.direction} icon={tx.direction === 'outbound' ? <ArrowUpRight size={12} className="text-brand" /> : <ArrowDownLeft size={12} className="text-brand-dark" />} />
            <DetailField label="Clearinghouse" value={tx.clearinghouse || 'N/A'} />
            <DetailField label="Claims Count" value={String(tx.claim_count ?? 'N/A')} />
            <DetailField label="Submitted" value={tx.submitted_at ? new Date(tx.submitted_at).toLocaleString() : '—'} />
            <DetailField label="Response At" value={tx.response_at ? new Date(tx.response_at).toLocaleString() : '—'} />
          </div>

          {/* File Name */}
          {tx.file_name && (
            <div className="bg-surface-elevated rounded-lg p-3">
              <p className="text-[11px] tracking-wider text-content-tertiary mb-1">File Name</p>
              <p className="text-xs font-mono text-content-primary">{tx.file_name}</p>
            </div>
          )}

          {/* Response */}
          {(tx.response_code || tx.response_detail) && (
            <div className={`rounded-lg p-3 ${tx.status === 'rejected' || tx.status === 'error' ? 'bg-[#065E76]/5 border border-[#065E76]/20' : 'bg-brand/5 border border-brand/20'}`}>
              <p className="text-[11px] tracking-wider text-content-tertiary mb-1">Response</p>
              {tx.response_code && <p className="text-xs font-mono font-semibold text-content-primary">{tx.response_code}</p>}
              {tx.response_detail && <p className="text-xs text-content-secondary mt-1">{tx.response_detail}</p>}
            </div>
          )}

          {/* Claim Link */}
          {tx.claim_id && (
            <div className="bg-surface-elevated rounded-lg p-3">
              <p className="text-[11px] tracking-wider text-content-tertiary mb-1">Linked Claim</p>
              <p className="text-xs font-mono text-brand">{tx.claim_id.slice(0, 8)}…</p>
            </div>
          )}

          {/* Timeline */}
          <div>
            <p className="text-[11px] tracking-wider text-content-tertiary mb-2">Timeline</p>
            <div className="space-y-2">
              {tx.created_at && (
                <TimelineEntry label="Created" time={tx.created_at} icon={<Clock size={12} />} />
              )}
              {tx.submitted_at && (
                <TimelineEntry label="Submitted" time={tx.submitted_at} icon={<ArrowUpRight size={12} />} />
              )}
              {tx.response_at && (
                <TimelineEntry label="Response Received" time={tx.response_at}
                  icon={tx.status === 'accepted' || tx.status === 'received' || tx.status === 'processing' || tx.status === 'parsed' ? <CheckCircle2 size={12} className="text-brand-dark" /> : <AlertTriangle size={12} className="text-[#065E76]" />} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // Render into document.body via portal to escape overflow:hidden / stacking context ancestors
  if (!mounted) return null
  return createPortal(content, document.body)
}

function DetailField({ label, value, icon, action }: { label: string; value: string; icon?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] tracking-wider text-content-tertiary mb-0.5">{label}</p>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs text-content-primary font-medium">{value}</span>
        {action}
      </div>
    </div>
  )
}

function TimelineEntry({ label, time, icon }: { label: string; time: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-full bg-surface-elevated flex items-center justify-center text-content-secondary">{icon}</div>
      <div>
        <p className="text-xs text-content-primary">{label}</p>
        <p className="text-[11px] text-content-tertiary">{new Date(time).toLocaleString()}</p>
      </div>
    </div>
  )
}
