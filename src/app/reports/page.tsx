'use client'
import { useT } from '@/lib/i18n'
import React, { useState } from 'react'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import { useToast } from '@/components/shared/Toast'
import { useReport } from '@/lib/hooks'
import { BarChart3, Download, FileText, Calendar, RefreshCw, ChevronRight, TrendingUp, Shield, Users, CreditCard, CheckCircle, AlertTriangle } from 'lucide-react'

const REPORT_TYPES = [
  {
    id: 'ar_aging',
    label: 'A/R Aging Detail',
    description: 'All open claims bucketed by age (0–30, 31–60, 61–90, 90+)',
    icon: TrendingUp,
    color: 'bg-brand/10 text-brand border-blue-500/20',
    dot: 'bg-blue-500',
  },
  {
    id: 'denial_analysis',
    label: 'Denial Analysis',
    description: 'Denials by CARC category, payer, and provider with trend',
    icon: Shield,
    color: 'bg-red-500/10 text-red-500 border-red-500/20',
    dot: 'bg-red-500',
  },
  {
    id: 'payment_summary',
    label: 'Payment Summary',
    description: 'ERA payments posted, auto-posted vs manual, by payer',
    icon: CreditCard,
    color: 'bg-brand/10 text-brand-dark border-brand/20',
    dot: 'bg-brand',
  },
  {
    id: 'coding_production',
    label: 'Coding Production',
    description: 'Charts coded per coder, AI acceptance rate, avg time',
    icon: FileText,
    color: 'bg-brand/10 text-brand-dark border-purple-500/20',
    dot: 'bg-brand',
  },
  {
    id: 'payer_performance',
    label: 'Payer Performance',
    description: 'Days to payment, denial rate, clean claim rate by payer',
    icon: BarChart3,
    color: 'bg-brand-pale0/10 text-brand-deep border-brand-light/20',
    dot: 'bg-brand-pale',
  },
  {
    id: 'eligibility_summary',
    label: 'Eligibility Summary',
    description: 'Verification results, active vs inactive, prior auth needed',
    icon: CheckCircle,
    color: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
    dot: 'bg-teal-500',
  },
] as const

type ReportId = typeof REPORT_TYPES[number]['id']

const DATE_PRESETS = [
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 60 Days', days: 60 },
  { label: 'Last 90 Days', days: 90 },
  { label: 'Year to Date', days: 365 },
]

function fmt(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number') return v % 1 === 0 ? v.toLocaleString() : v.toFixed(2)
  return String(v)
}

function ReportTable({ report }: { report: { columns: string[]; rows: Record<string, unknown>[] } }) {
  if (!report.rows.length) return (
    <div className="flex flex-col items-center justify-center py-20 text-content-tertiary gap-2">
      <FileText size={32} className="opacity-40" />
      <p className="text-sm">No data for selected period</p>
    </div>
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-separator">
            {report.columns.map(col => (
              <th key={col} className="text-left px-3 py-2.5 text-[11px] font-semibold text-content-tertiary uppercase tracking-wide whitespace-nowrap">
                {col.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {report.rows.map((row, i) => (
            <tr key={i} className="border-b border-separator last:border-0 hover:bg-surface-elevated transition-colors">
              {report.columns.map(col => (
                <td key={col} className="px-3 py-2.5 text-content-primary whitespace-nowrap">
                  {fmt(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="bg-surface-elevated rounded-lg px-4 py-3 border border-separator">
      <p className="text-[11px] text-content-tertiary uppercase tracking-wide mb-1">{label.replace(/_/g, ' ')}</p>
      <p className="text-[18px] font-bold text-content-primary">{fmt(value)}</p>
    </div>
  )
}

export default function ReportsPage() {
  const { toast } = useToast()
  const { t } = useT()
  const [activeReport, setActiveReport] = useState<ReportId | null>(null)
  const [datePreset, setDatePreset] = useState(DATE_PRESETS[2])
  const [downloading, setDownloading] = useState(false)

  const dateFrom = new Date(Date.now() - datePreset.days * 86400000).toISOString().slice(0, 10)
  const dateTo = new Date().toISOString().slice(0, 10)

  const { data: reportData, loading, error, refetch } = useReport(
    activeReport ?? null,
    { from: dateFrom, to: dateTo }
  )

  async function handleDownloadCSV() {
    if (!activeReport) return
    setDownloading(true)
    try {
      const params = new URLSearchParams({ type: activeReport, from: dateFrom, to: dateTo, format: 'csv' })
      const res = await fetch(`/api/reports?${params}`)
      const data = await res.json()
      const csv = data.csv || data.report_csv
      if (csv) {
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${activeReport}_${dateTo}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('CSV downloaded')
      } else {
        // Build CSV from table data
        if (reportData?.columns && reportData?.rows) {
          const rows = [reportData.columns.join(',')]
          reportData.rows.forEach(row => {
            rows.push(reportData.columns.map(c => `"${fmt(row[c])}"`).join(','))
          })
          const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${activeReport}_${dateTo}.csv`
          a.click()
          URL.revokeObjectURL(url)
          toast.success('CSV downloaded')
        } else {
          toast.error('No data to export')
        }
      }
    } catch {
      toast.error('Export failed')
    } finally {
      setDownloading(false)
    }
  }

  const activeType = REPORT_TYPES.find(r => r.id === activeReport)

  return (
    <ModuleShell title="Reports" subtitle="Financial and operational reports — export to CSV">
      {/* Date range selector */}
      <div className="flex items-center gap-3 mb-5">
        <Calendar size={14} className="text-content-tertiary shrink-0" />
        <div className="flex gap-1.5">
          {DATE_PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => setDatePreset(p)}
              className={`px-3 py-1.5 rounded-btn text-[12px] font-medium transition-colors ${
                datePreset.label === p.label
                  ? 'bg-brand text-white'
                  : 'bg-surface-elevated border border-separator text-content-secondary hover:bg-surface-primary'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-content-tertiary ml-2">{dateFrom} → {dateTo}</span>
      </div>

      <div className="flex gap-5 h-[calc(100vh-280px)]">
        {/* Left — report type list */}
        <div className="w-72 shrink-0 flex flex-col gap-2 overflow-y-auto pr-1">
          {REPORT_TYPES.map(r => {
            const Icon = r.icon
            const isActive = activeReport === r.id
            return (
              <button
                key={r.id}
                onClick={() => setActiveReport(r.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-brand/5 border-brand/30 shadow-sm'
                    : 'bg-surface-secondary border-separator hover:bg-surface-elevated'
                }`}
              >
                <div className="flex items-center gap-3 mb-1.5">
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${r.color}`}>
                    <Icon size={15} />
                  </div>
                  <span className={`text-[13px] font-semibold ${isActive ? 'text-brand' : 'text-content-primary'}`}>
                    {r.label}
                  </span>
                  {isActive && <ChevronRight size={14} className="text-brand ml-auto" />}
                </div>
                <p className="text-[11px] text-content-tertiary leading-relaxed pl-11">{r.description}</p>
              </button>
            )
          })}
        </div>

        {/* Right — report content */}
        <div className="flex-1 card flex flex-col overflow-hidden">
          {!activeReport ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 p-8">
              <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-separator flex items-center justify-center mb-2">
                <BarChart3 size={28} className="text-content-tertiary" />
              </div>
              <h3 className="text-[15px] font-semibold text-content-primary">Select a Report</h3>
              <p className="text-[13px] text-content-secondary max-w-xs">
                Choose a report type on the left to generate data for the selected date range.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-4 w-full max-w-sm">
                {REPORT_TYPES.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setActiveReport(r.id)}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-elevated border border-separator hover:border-brand/30 hover:bg-brand/5 transition-all text-left"
                  >
                    <span className={`w-2 h-2 rounded-full ${r.dot}`} />
                    <span className="text-[12px] text-content-secondary">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Report header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-separator shrink-0">
                {activeType && (
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${activeType.color}`}>
                    <activeType.icon size={15} />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-[14px] font-bold text-content-primary">{activeType?.label}</h3>
                  <p className="text-[11px] text-content-tertiary">{dateFrom} → {dateTo}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => refetch()}
                    disabled={loading}
                    className="p-2 rounded-btn hover:bg-surface-elevated text-content-secondary transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw size={14} className={loading ? 'animate-spin text-brand' : ''} />
                  </button>
                  <button
                    onClick={handleDownloadCSV}
                    disabled={downloading || loading || !reportData}
                    className="flex items-center gap-1.5 bg-brand text-white px-3 py-1.5 rounded-btn text-[12px] font-medium hover:bg-brand/90 transition-colors disabled:opacity-50"
                  >
                    <Download size={13} />
                    {downloading ? 'Exporting…' : 'Export CSV'}
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {loading && (
                  <div className="flex items-center justify-center py-20 gap-3 text-content-secondary">
                    <RefreshCw size={18} className="animate-spin text-brand" />
                    <span className="text-[13px]">Generating report…</span>
                  </div>
                )}

                {error && (
                  <div className="m-5 bg-brand-pale0/10 border border-brand-light/20 rounded-lg p-4 flex items-start gap-3">
                    <AlertTriangle size={16} className="text-brand-deep shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[13px] font-medium text-brand-deep dark:text-brand-deep">Report data unavailable</p>
                      <p className="text-[12px] text-content-secondary mt-1">Connect to the MedCloud API to load live report data. Showing structure preview.</p>
                    </div>
                  </div>
                )}

                {reportData && !loading && (
                  <div className="p-5 space-y-5">
                    {/* Summary cards */}
                    {reportData.summary && Object.keys(reportData.summary).length > 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        {Object.entries(reportData.summary).slice(0, 6).map(([k, v]) => (
                          <SummaryCard key={k} label={k} value={v} />
                        ))}
                      </div>
                    )}
                    {/* Table */}
                    <div className="bg-surface-secondary rounded-xl border border-separator overflow-hidden">
                      <ReportTable report={reportData} />
                    </div>
                    <p className="text-[11px] text-content-tertiary text-right">
                      {reportData.rows.length} records · Generated {new Date(reportData.generated).toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Fallback preview when no API */}
                {!reportData && !loading && !error && (
                  <div className="p-5 space-y-4">
                    <div className="bg-brand/5 border border-brand/20 rounded-lg p-3 text-[12px] text-brand flex items-center gap-2">
                      <RefreshCw size={12} className="animate-spin" />
                      Loading {activeType?.label}…
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </ModuleShell>
  )
}
