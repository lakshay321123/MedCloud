'use client'
import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

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
        <div className="absolute top-full left-0 mt-1 bg-surface-secondary border border-separator rounded-btn shadow-elevated z-[60] min-w-full overflow-hidden">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                opt.value === value
                  ? 'bg-brand/10 text-brand font-semibold'
                  : 'text-content-primary hover:bg-surface-elevated'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
