export const dynamic = 'force-dynamic';
import {
  Phone, TrendingUp, Users, Zap, Clock, ArrowUpRight,
  Activity, BarChart3, PhoneCall, PhoneIncoming, PhoneOutgoing,
  Mic, Settings, Play, Pause, MoreVertical, Search, Bell
, Info } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { getDashboardStats, getActiveCalls, getRecentOutcomes, getActiveCampaigns } from './actions/dashboard'
import { LiveAudioMonitor } from '@/components/LiveAudioMonitor'

// ─── Dashboard Stats Card ───────────────────────────────────

function StatCard({ label, value, change, icon: Icon, accent = false, tooltip = "" }: { label: string; value: string; change: string; icon: any; accent?: boolean, tooltip?: string }) {
  return (
    <div className={`
      relative overflow-hidden rounded-2xl p-6 transition-all duration-300
      ${accent
        ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
        : 'glass-elevated hover:border-[var(--border)]'
      }
    `}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <p className={`text-sm font-medium ${accent ? 'opacity-80' : 'text-[var(--text-muted)]'}`}>
              {label}
            </p>
            {tooltip && (
              <Tooltip content={tooltip}>
                <Info className="w-3.5 h-3.5 text-[var(--text-muted)] cursor-help" />
              </Tooltip>
            )}
          </div>
          <p className={`text-3xl font-bold tracking-tight ${accent ? '' : 'text-[var(--text-primary)]'}`}>
            {value}
          </p>
          <p className={`text-xs mt-2 flex items-center gap-1 ${accent ? 'opacity-80' : 'text-[var(--success)]'}`}>
            <ArrowUpRight className="w-3 h-3" />
            {change}
          </p>
        </div>
        <div className={`p-3 rounded-xl ${accent ? 'bg-white/20' : 'bg-[var(--accent-glow)]'}`}>
          <Icon className={`w-5 h-5 ${accent ? '' : 'text-[var(--accent)]'}`} />
        </div>
      </div>
    </div>
  )
}

// ─── Live Call Monitor ──────────────────────────────────────

async function LiveCallCard() {
  const activeCalls = await getActiveCalls()

  return (
    <div className="glass-elevated rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[var(--danger)] pulse-live" />
          <h3 className="font-semibold text-[var(--text-primary)]">Live Calls</h3>
          <span className="px-2 py-0.5 rounded-full bg-[var(--danger)]/20 text-[var(--danger)] text-xs font-medium">
            {activeCalls.length} active
          </span>
        </div>
        <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {activeCalls.map((call) => (
          <div key={call.id} className="flex items-center gap-4 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border)] transition-all">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-[var(--accent-glow)] flex items-center justify-center">
                <span className="text-[var(--accent)] font-semibold text-sm">
                  {call.lead.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--success)] border-2 border-[var(--bg-secondary)] pulse-live" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{call.lead}</p>
              <p className="text-xs text-[var(--text-muted)]">{call.company}</p>
            </div>

            <div className="flex items-center gap-3">
              <LiveAudioMonitor callSid={`mock-sid-${call.id}`} agentId={call.agent} />
              <span className="text-xs px-2 py-1 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                {call.phase}
              </span>
              <div className="flex items-center gap-1">
                <div className="flex gap-0.5">
                  {[0.3, 0.5, 0.7, 0.9, 1].map((threshold, i) => (
                    <div key={i} className={`w-1 rounded-full transition-all ${
                      call.sentiment >= threshold
                        ? call.sentiment > 0.6 ? 'bg-[var(--success)]' : call.sentiment > 0.3 ? 'bg-[var(--warning)]' : 'bg-[var(--danger)]'
                        : 'bg-[var(--border)]'
                    }`} style={{ height: `${12 + i * 4}px` }} />
                  ))}
                </div>
              </div>
              <span className="text-xs font-mono text-[var(--text-muted)] w-10 text-right">{call.duration}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Recent Call Outcomes ───────────────────────────────────

async function RecentCalls() {
  const calls = await getRecentOutcomes()

  const statusColors: Record<string, string> = {
    success: 'bg-[var(--success)]/20 text-[var(--success)]',
    pending: 'bg-[var(--warning)]/20 text-[var(--warning)]',
    neutral: 'bg-[var(--info)]/20 text-[var(--info)]',
    failed: 'bg-[var(--danger)]/20 text-[var(--danger)]',
  }

  return (
    <div className="glass-elevated rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-[var(--text-primary)]">Recent Calls</h3>
        <button className="text-xs text-[var(--accent)] hover:text-[var(--accent-dim)] font-medium transition-colors">
          View all
        </button>
      </div>

      <div className="space-y-2">
        {calls.map((call) => (
          <div key={call.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--bg-secondary)] transition-all group cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4 text-[var(--text-muted)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)]">{call.lead}</p>
              <p className="text-xs text-[var(--text-muted)]">{call.time}</p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${statusColors[call.status]}`}>
              {call.outcome}
            </span>
            <span className="text-xs font-mono text-[var(--text-muted)] w-10 text-right">{call.duration}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Campaign Overview ──────────────────────────────────────

async function CampaignOverview() {
  const campaigns = await getActiveCampaigns()

  return (
    <div className="glass-elevated rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-[var(--text-primary)]">Active Campaigns</h3>
        <button className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] text-xs font-semibold hover:bg-[var(--accent-dim)] transition-colors">
          + New Campaign
        </button>
      </div>

      <div className="space-y-4">
        {campaigns.map((campaign, i) => (
          <div key={i} className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${campaign.status === 'active' ? 'bg-[var(--success)] pulse-live' : 'bg-[var(--text-muted)]'}`} />
                <span className="font-medium text-sm text-[var(--text-primary)]">{campaign.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {campaign.status === 'active' ? (
                  <button className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition-colors">
                    <Pause className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition-colors">
                    <Play className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[
                { label: 'Leads', value: campaign.leads },
                { label: 'Called', value: campaign.called },
                { label: 'Connected', value: campaign.connected },
                { label: 'Transferred', value: campaign.transferred },
                { label: 'Converted', value: campaign.converted },
              ].map((stat, j) => (
                <div key={j} className="text-center">
                  <p className="text-lg font-bold text-[var(--text-primary)]">{stat.value}</p>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-1.5 rounded-full bg-[var(--bg-primary)] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)]"
                style={{ width: `${(campaign.called / campaign.leads) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Dashboard ─────────────────────────────────────────

export default async function Dashboard() {
  const stats = await getDashboardStats()

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Background atmosphere */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,var(--accent-glow)_0%,transparent_70%)] opacity-30" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08)_0%,transparent_70%)]" />
      </div>

      {/* Navigation */}
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
                <a key={i} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  i === 0
                    ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-medium'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}>
                  {item}
                </a>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search..."
                className="w-64 h-9 pl-10 pr-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>
            <button className="relative p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--danger)]" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-secondary)] flex items-center justify-center">
              <span className="text-xs font-bold text-[var(--bg-primary)]">JD</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-8 animate-fade-up">
          <h1 className="text-2xl font-bold tracking-tight">Welcome back, James</h1>
          <p className="text-[var(--text-muted)] mt-1">
            Your AI agents made <span className="text-[var(--accent)] font-semibold">{stats.calls.value} calls</span> today and
            booked <span className="text-[var(--accent)] font-semibold">{stats.conversions.value} meetings</span>
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6 animate-fade-up animate-fade-up-1">
          <StatCard label="Calls Today" value={stats.calls.value.toString()} change={`${stats.calls.change} vs yesterday`} icon={Phone} tooltip="Total number of outbound and inbound calls handled by all AI agents today." />
          <StatCard label="Connections" value={stats.connections.value.toString()} change={`${stats.connections.change} vs yesterday`} icon={PhoneCall} tooltip="Calls that were answered by a human and lasted longer than 10 seconds." />
          <StatCard label="Transfers" value={stats.transfers.value.toString()} change={`${stats.transfers.change} vs yesterday`} icon={TrendingUp} tooltip="Calls where the AI agent successfully live-transferred the prospect to a human closer." />
          <StatCard label="Conversions" value={stats.conversions.value.toString()} change={`${stats.conversions.change} vs yesterday`} icon={Zap} accent tooltip="Total number of qualified leads resulting in a scheduled meeting or successful transfer." />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div className="animate-fade-up animate-fade-up-2">
              <CampaignOverview />
            </div>
            <div className="animate-fade-up animate-fade-up-3">
              <RecentCalls />
            </div>
          </div>
          <div className="animate-fade-up animate-fade-up-2">
            <LiveCallCard />
          </div>
        </div>
      </main>
    </div>
  )
}
