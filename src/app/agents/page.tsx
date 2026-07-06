export const dynamic = 'force-dynamic';
import {  Bot, Plus, Activity, PhoneCall, ArrowUpRight, Search, Zap, Bell, Settings , Info } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { getAgents } from '../actions/agents'
import Link from 'next/link'

export default async function AgentsPage() {
  const agents = await getAgents()

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <nav className="relative z-10 border-b border-[var(--border-subtle)] glass">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
                <Zap className="w-4 h-4 text-[var(--bg-primary)]" />
              </div>
              <span className="font-bold text-lg tracking-tight">VoiceForge</span>
            </div>
            <div className="flex items-center gap-1">
              {['Dashboard', 'Campaigns', 'Agents', 'Leads', 'Calls', 'Settings'].map((item, i) => (
                <Link key={i} href={item === 'Dashboard' ? '/' : `/${item.toLowerCase()}`} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  item === 'Agents'
                    ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-medium'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}>
                  {item}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">AI Sales Agents</h1>
            <p className="text-[var(--text-muted)] mt-1">Configure voices, guardrails, and conversational prompts.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] font-semibold hover:bg-[var(--accent-dim)] transition-colors">
            <Plus className="w-4 h-4" />
            Deploy Agent
          </button>
        </div>

        <div className="grid grid-cols-4 gap-6">
           {agents.length === 0 ? (
              <div className="col-span-4 text-center py-24 glass-elevated rounded-2xl">
                 <Bot className="w-12 h-12 text-[var(--border)] mx-auto mb-4" />
                 <h3 className="text-lg font-medium text-[var(--text-primary)]">No Agents Found</h3>
                 <p className="text-[var(--text-muted)] mt-2">Create an AI Agent to begin automating calls.</p>
              </div>
           ) : (
              agents.map((agent: any) => (
                 <Link key={agent.id} href={`/agents/${agent.id}`} className="block transition-transform hover:-translate-y-1">
                    <div className="glass-elevated rounded-2xl p-6 hover:border-[var(--border)] transition-colors h-full flex flex-col">
                       <div className="flex items-start justify-between mb-6">
                           <div className="w-12 h-12 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center">
                              <Bot className="w-6 h-6 text-[var(--accent)]" />
                           </div>
                           <div className={`w-2 h-2 rounded-full ${agent.isActive ? 'bg-[var(--success)] pulse-live' : 'bg-[var(--text-muted)]'}`} />
                       </div>

                       <h3 className="text-lg font-bold text-[var(--text-primary)] truncate">{agent.name}</h3>
                       <p className="text-xs text-[var(--text-muted)] mt-1 uppercase tracking-wider">{agent.voiceGender} • {agent.voiceAccent}</p>

                       <div className="mt-8 pt-4 border-t border-[var(--border-subtle)] grid grid-cols-2 gap-4">
                          <div>
                             <p className="text-xl font-semibold text-[var(--text-primary)]">{agent.totalCallsHandled}</p>
                             <p className="text-[10px] uppercase text-[var(--text-muted)] mt-0.5">Calls</p>
                          </div>
                          <div>
                             <p className="text-xl font-semibold text-[var(--accent)]">{agent.successfulTransfers}</p>
                             <p className="text-[10px] uppercase text-[var(--text-muted)] mt-0.5">Transfers</p>
                          </div>
                       </div>
                    </div>
                 </Link>
              ))
           )}
        </div>
      </main>
    </div>
  )
}
