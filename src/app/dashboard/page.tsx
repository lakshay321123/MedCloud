'use client'

import React from 'react'
import { useApp } from '@/lib/context'
import ModuleShell from '@/components/shared/ModuleShell'
import KPICard from '@/components/shared/KPICard'
import {
  LayoutDashboard, DollarSign, FileText, ShieldAlert, Clock,
  TrendingUp, Users, Phone, BrainCircuit,
} from 'lucide-react'

export default function DashboardPage() {
  const { currentUser } = useApp()

  return (
    <ModuleShell
      title="Dashboard"
      subtitle={`Welcome back, ${currentUser.name}`}
      sprint="Sprint 1"
      icon={<LayoutDashboard size={20} />}
    >
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Total Revenue"
          value="$2.4M"
          change={12.5}
          changeLabel="vs last month"
          icon={<DollarSign size={18} />}
        />
        <KPICard
          title="Claims Submitted"
          value="3,847"
          change={8.2}
          changeLabel="vs last month"
          icon={<FileText size={18} />}
        />
        <KPICard
          title="Denial Rate"
          value="4.2%"
          change={-1.8}
          changeLabel="improvement"
          icon={<ShieldAlert size={18} />}
        />
        <KPICard
          title="Avg Days in A/R"
          value="28.5"
          change={-3.2}
          changeLabel="days faster"
          icon={<Clock size={18} />}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Collection Rate"
          value="96.8%"
          change={2.1}
          icon={<TrendingUp size={18} />}
        />
        <KPICard
          title="Active Patients"
          value="12,450"
          change={5.4}
          icon={<Users size={18} />}
        />
        <KPICard
          title="AI Calls Today"
          value="127"
          change={34}
          icon={<Phone size={18} />}
        />
        <KPICard
          title="AI Coding Accuracy"
          value="94.2%"
          change={1.3}
          icon={<BrainCircuit size={18} />}
        />
      </div>

      {/* Placeholder panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 p-6 rounded-xl border bg-[var(--bg-card)] border-[var(--border-color)] glow-border">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Revenue Trend</h3>
          <div className="h-48 flex items-center justify-center text-[var(--text-secondary)] text-xs font-mono">
            [ Chart — Sprint 3 ]
          </div>
        </div>
        <div className="p-6 rounded-xl border bg-[var(--bg-card)] border-[var(--border-color)] glow-border">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {['Claim #4521 submitted', 'ERA file processed', 'Denial appeal sent', 'Voice call completed', 'Patient payment received'].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <div className="w-1.5 h-1.5 rounded-full bg-brand/50 flex-shrink-0" />
                <span>{item}</span>
                <span className="ml-auto font-mono opacity-50">{i + 1}m ago</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ModuleShell>
  )
}
