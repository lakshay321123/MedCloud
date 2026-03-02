'use client'
import React, { useState } from 'react'
import { FileText, Stethoscope, CreditCard, DollarSign, XCircle, Shield, X, File } from 'lucide-react'

export interface DocViewerDocument {
  id: string
  name: string
  type: 'superbill' | 'clinical_note' | 'insurance_card' | 'eob' | 'denial_letter' | 'prior_auth'
  content?: Record<string, string>
  url?: string
}

export interface DocViewerProps {
  documents: DocViewerDocument[]
  mode: 'split-left' | 'drawer' | 'inline'
  onClose?: () => void
}

const typeConfig: Record<DocViewerDocument['type'], { icon: React.ReactNode; color: string; label: string }> = {
  superbill: { icon: <FileText size={14} />, color: 'text-amber-500', label: 'Superbill' },
  clinical_note: { icon: <Stethoscope size={14} />, color: 'text-blue-500', label: 'Clinical Note' },
  insurance_card: { icon: <CreditCard size={14} />, color: 'text-emerald-500', label: 'Insurance Card' },
  eob: { icon: <DollarSign size={14} />, color: 'text-purple-500', label: 'Explanation of Benefits' },
  denial_letter: { icon: <XCircle size={14} />, color: 'text-red-500', label: 'Denial Letter' },
  prior_auth: { icon: <Shield size={14} />, color: 'text-teal-500', label: 'Prior Authorization' },
}

function MockPDFViewer({ doc }: { doc: DocViewerDocument }) {
  const cfg = typeConfig[doc.type]
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-6 bg-surface-elevated rounded-lg border border-separator min-h-[200px]">
      <div className={`text-4xl ${cfg.color}`}>
        <File size={48} />
      </div>
      <div className="text-center">
        <p className="text-[14px] font-semibold text-content-primary">{doc.name}</p>
        <p className="text-[12px] text-content-tertiary mt-1">{cfg.label} · PDF Preview</p>
      </div>
      <div className="w-full space-y-2 mt-2">
        {[85, 100, 70, 90, 60, 100, 80].map((w, i) => (
          <div key={i} className="h-2 bg-separator rounded-full" style={{ width: `${w}%` }} />
        ))}
      </div>
      <p className="text-[11px] text-content-tertiary">Page 1 of 2</p>
    </div>
  )
}

function ContentFieldView({ content }: { content: Record<string, string> }) {
  return (
    <div className="space-y-2">
      {Object.entries(content).map(([label, value]) => (
        <div key={label} className="flex gap-3 py-2 border-b border-separator last:border-0">
          <span className="text-[12px] text-content-tertiary w-28 shrink-0">{label}</span>
          <span className="text-[13px] text-content-primary whitespace-pre-line">{value}</span>
        </div>
      ))}
    </div>
  )
}

function DocContent({ doc }: { doc: DocViewerDocument }) {
  if (doc.url && doc.type) {
    return <MockPDFViewer doc={doc} />
  }
  if (doc.content) {
    return <ContentFieldView content={doc.content} />
  }
  return (
    <div className="flex items-center justify-center h-32 text-content-tertiary text-[13px]">
      No content available
    </div>
  )
}

export default function DocViewer({ documents, mode, onClose }: DocViewerProps) {
  const [activeDoc, setActiveDoc] = useState(documents[0]?.id || '')
  const doc = documents.find(d => d.id === activeDoc) || documents[0]

  if (!documents.length) {
    return (
      <div className="flex items-center justify-center h-24 text-content-tertiary text-[13px]">
        No documents attached
      </div>
    )
  }

  const inner = (
    <div className="flex flex-col h-full">
      {/* Tab bar — only shown for multiple docs */}
      {documents.length > 1 && (
        <div className="flex gap-1 px-2 pt-2 border-b border-separator overflow-x-auto shrink-0">
          {documents.map(d => {
            const cfg = typeConfig[d.type]
            return (
              <button
                key={d.id}
                onClick={() => setActiveDoc(d.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-[12px] rounded-t whitespace-nowrap transition-colors ${activeDoc === d.id ? `border-b-2 border-brand text-brand` : 'text-content-secondary hover:text-content-primary'}`}
              >
                <span className={cfg.color}>{cfg.icon}</span>
                <span className="max-w-[120px] truncate">{d.name}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Single doc header */}
      {documents.length === 1 && doc && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-separator shrink-0">
          <span className={typeConfig[doc.type].color}>{typeConfig[doc.type].icon}</span>
          <span className="text-[13px] font-medium text-content-primary truncate">{doc.name}</span>
          {mode === 'drawer' && onClose && (
            <button onClick={onClose} className="ml-auto text-content-tertiary hover:text-content-primary">
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* Close for multi-doc drawer */}
      {documents.length > 1 && mode === 'drawer' && onClose && (
        <button onClick={onClose} className="absolute top-3 right-3 text-content-tertiary hover:text-content-primary z-10">
          <X size={16} />
        </button>
      )}

      {/* Content */}
      <div className={`overflow-y-auto p-3 flex-1 ${mode === 'inline' ? 'max-h-[300px]' : ''}`}>
        {doc && <DocContent doc={doc} />}
      </div>
    </div>
  )

  if (mode === 'drawer') {
    return (
      <>
        <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
        <div className="fixed right-0 top-0 h-full w-[520px] bg-surface-secondary border-l border-separator z-50 flex flex-col shadow-xl relative">
          {inner}
        </div>
      </>
    )
  }

  return (
    <div className={`bg-surface-secondary border border-separator rounded-lg overflow-hidden ${mode === 'inline' ? 'max-h-[300px]' : 'h-full'}`}>
      {inner}
    </div>
  )
}
