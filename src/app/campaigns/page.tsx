import { Play, Pause, MoreVertical, Plus, Zap, Users, PhoneCall, BarChart3, Settings, Search, Bell } from 'lucide-react'
import { getCampaigns } from '../actions/campaigns'
import Link from 'next/link'

export default async function CampaignsPage() {
  const campaigns = await getCampaigns()

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
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
                <Link key={i} href={item === 'Dashboard' ? '/' : `/${item.toLowerCase()}`} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  item === 'Campaigns'
                    ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-medium'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}>
                  {item}
                </Link>
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
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-secondary)] flex items-center justify-center">
              <span className="text-xs font-bold text-[var(--bg-primary)]">JD</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Smart Campaigns</h1>
            <p className="text-[var(--text-muted)] mt-1">Manage automated multi-channel sequences and outbound dialers.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] font-semibold hover:bg-[var(--accent-dim)] transition-colors">
            <Plus className="w-4 h-4" />
            Create Campaign
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {campaigns.length === 0 ? (
            <div className="col-span-3 text-center py-24 glass-elevated rounded-2xl">
                <BarChart3 className="w-12 h-12 text-[var(--border)] mx-auto mb-4" />
                <h3 className="text-lg font-medium text-[var(--text-primary)]">No Campaigns Found</h3>
                <p className="text-[var(--text-muted)] mt-2">Seed the database or create a new campaign to get started.</p>
            </div>
          ) : (
            campaigns.map((campaign: any) => (
              <Link key={campaign.id} href={`/campaigns/${campaign.id}`} className="block transition-transform hover:-translate-y-1">
                <div className="glass-elevated rounded-2xl p-6 h-full flex flex-col hover:border-[var(--border)] transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${campaign.status === 'ACTIVE' ? 'bg-[var(--success)] pulse-live' : campaign.status === 'PAUSED' ? 'bg-[var(--warning)]' : 'bg-[var(--text-muted)]'}`} />
                        <span className="text-xs font-medium tracking-wide uppercase text-[var(--text-muted)]">{campaign.status}</span>
                      </div>
                      <h3 className="text-lg font-bold text-[var(--text-primary)] truncate">{campaign.name}</h3>
                      {campaign.aiAgent && (
                         <p className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-1.5">
                            <PhoneCall className="w-3 h-3" /> Agent: {campaign.aiAgent.name}
                         </p>
                      )}
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                      <Settings className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="mt-auto pt-6 border-t border-[var(--border-subtle)]">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">{campaign.totalLeads}</p>
                        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mt-1 flex items-center gap-1">
                          <Users className="w-3 h-3" /> Leads
                        </p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">{campaign.totalCalls}</p>
                        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mt-1 flex items-center gap-1">
                          <PhoneCall className="w-3 h-3" /> Calls
                        </p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-[var(--accent)]">{campaign.totalConverted}</p>
                        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mt-1 flex items-center gap-1">
                          <Zap className="w-3 h-3" /> Conv
                        </p>
                      </div>
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
