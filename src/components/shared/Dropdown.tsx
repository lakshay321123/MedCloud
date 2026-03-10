'use client'
import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export interface DropdownOption {
  value: string
  label: string
}

interface DropdownProps {
  value: string
  options: DropdownOption[]
  onChange: (value: string) => void
  buttonClassName?: string
  placeholder?: string
}

export default function Dropdown({ value, options, onChange, buttonClassName = '', placeholder = 'Select...' }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-btn text-[13px] font-semibold cursor-pointer transition-colors ${buttonClassName}`}
      >
        <span>{selected?.label ?? placeholder}</span>
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-[rgba(0,0,0,0.09)] rounded-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.10),0_1px_4px_rgba(0,0,0,0.06)] z-[60] min-w-full overflow-hidden p-1">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-[13px] whitespace-nowrap transition-colors rounded-[8px] flex items-center justify-between gap-2 ${
                opt.value === value
                  ? 'bg-brand/10 text-brand-dark font-medium'
                  : 'text-content-secondary hover:bg-brand/5 hover:text-brand-dark'
              }`}
            >
              <span>{opt.label}</span>
              {opt.value === value && <Check size={12} className="text-brand shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
