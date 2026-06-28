import { Settings as SettingsIcon, Shield, Webhook, Zap, Key, Link as LinkIcon, Users } from 'lucide-react'
import { getIntegrations } from '../actions/settings'
import Link from 'next/link'

export default async function SettingsPage() {
  const integrations = await getIntegrations()

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <nav className="relative z-10 border-b border-[var(--border-subtle)] glass">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
                <SettingsIcon className="w-4 h-4 text-[var(--bg-primary)]" />
              </div>
              <span className="font-bold text-lg tracking-tight">VoiceForge</span>
            </div>
            <div className="flex items-center gap-1">
              {['Dashboard', 'Campaigns', 'Agents', 'Leads', 'Calls', 'Settings'].map((item, i) => (
                <Link key={i} href={item === 'Dashboard' ? '/' : `/${item.toLowerCase()}`} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  item === 'Settings'
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

      <main className="max-w-[1200px] mx-auto px-6 py-8 flex gap-8">
        <aside className="w-64 shrink-0">
           <div className="glass-elevated rounded-2xl p-4 sticky top-24">
              <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3 px-3">Configuration</h3>
              <nav className="space-y-1">
                 <a href="#" className="flex items-center gap-3 px-3 py-2.5 bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium text-sm rounded-xl">
                    <Shield className="w-4 h-4 text-[var(--accent)]" /> CRM Integrations
                 </a>
                 <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] font-medium text-sm rounded-xl transition-colors">
                    <Key className="w-4 h-4" /> API Keys
                 </a>
                 <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] font-medium text-sm rounded-xl transition-colors">
                    <Webhook className="w-4 h-4" /> Custom Webhooks
                 </a>
                 <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] font-medium text-sm rounded-xl transition-colors">
                    <Users className="w-4 h-4" /> Team Members
                 </a>
              </nav>
           </div>
        </aside>

        <div className="flex-1 space-y-6">
           <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">CRM Integrations</h1>
              <p className="text-[var(--text-muted)] mt-1">Connect your workspace to external databases for automated lead capture.</p>
           </div>

           <div className="space-y-4">
              {/* Salesforce Example */}
              <div className="glass-elevated rounded-2xl p-6 border hover:border-[var(--border-subtle)] transition-colors flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#00A1E0]/10 border border-[#00A1E0]/20 rounded-xl flex items-center justify-center">
                       <span className="font-bold text-[#00A1E0]">SF</span>
                    </div>
                    <div>
                       <h3 className="font-bold text-[var(--text-primary)]">Salesforce</h3>
                       <p className="text-sm text-[var(--text-muted)] mt-0.5">Bi-directional sync for Leads and Opportunities.</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4">
                    {integrations.some((i: any) => i.type === 'SALESFORCE' && i.isActive) ? (
                       <span className="px-3 py-1 rounded-full bg-[var(--success)]/20 text-[var(--success)] text-xs font-bold uppercase tracking-wider">Connected</span>
                    ) : (
                       <button className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] hover:bg-[var(--bg-tertiary)] rounded-xl text-sm font-medium transition-colors">Connect</button>
                    )}
                 </div>
              </div>

              {/* HubSpot Example */}
              <div className="glass-elevated rounded-2xl p-6 border hover:border-[var(--border-subtle)] transition-colors flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#FF7A59]/10 border border-[#FF7A59]/20 rounded-xl flex items-center justify-center">
                       <span className="font-bold text-[#FF7A59]">HS</span>
                    </div>
                    <div>
                       <h3 className="font-bold text-[var(--text-primary)]">HubSpot</h3>
                       <p className="text-sm text-[var(--text-muted)] mt-0.5">Sync contacts, companies, and call dispositions.</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4">
                    {integrations.some((i: any) => i.type === 'HUBSPOT' && i.isActive) ? (
                       <span className="px-3 py-1 rounded-full bg-[var(--success)]/20 text-[var(--success)] text-xs font-bold uppercase tracking-wider">Connected</span>
                    ) : (
                       <button className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] hover:bg-[var(--bg-tertiary)] rounded-xl text-sm font-medium transition-colors">Connect</button>
                    )}
                 </div>
              </div>

              {/* Webhook Example */}
              <div className="glass-elevated rounded-2xl p-6 border hover:border-[var(--border-subtle)] transition-colors flex items-start justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-xl flex items-center justify-center">
                       <Webhook className="w-5 h-5 text-[var(--accent)]" />
                    </div>
                    <div>
                       <h3 className="font-bold text-[var(--text-primary)]">Custom Webhook Ingestion</h3>
                       <p className="text-sm text-[var(--text-muted)] mt-0.5">Push leads dynamically via HTTP POST payload.</p>
                       <div className="mt-4 p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg flex items-center gap-3">
                          <code className="text-xs text-[var(--info)]">POST /api/webhooks/crm</code>
                          <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                             <LinkIcon className="w-3.5 h-3.5" />
                          </button>
                       </div>
                    </div>
                 </div>
                 <div className="flex items-center gap-4">
                    <span className="px-3 py-1 rounded-full bg-[var(--success)]/20 text-[var(--success)] text-xs font-bold uppercase tracking-wider">Active</span>
                 </div>
              </div>

           </div>
        </div>
      </main>
    </div>
  )
}
