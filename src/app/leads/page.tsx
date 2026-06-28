import { Users, Search, Trash2, ArrowUpRight, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { getLeads } from '../actions/leads'
import Link from 'next/link'

export default async function LeadsPage() {
  const leads = await getLeads()

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <nav className="relative z-10 border-b border-[var(--border-subtle)] glass">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
                <Users className="w-4 h-4 text-[var(--bg-primary)]" />
              </div>
              <span className="font-bold text-lg tracking-tight">VoiceForge</span>
            </div>
            <div className="flex items-center gap-1">
              {['Dashboard', 'Campaigns', 'Agents', 'Leads', 'Calls', 'Settings'].map((item, i) => (
                <Link key={i} href={item === 'Dashboard' ? '/' : `/${item.toLowerCase()}`} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  item === 'Leads'
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
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Leads Database</h1>
            <p className="text-[var(--text-muted)] mt-1">Manage and track your CRM ingested prospects and custom variables.</p>
          </div>
          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
             <input type="text" placeholder="Search by name, phone, or context..." className="w-80 h-10 pl-10 pr-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]" />
          </div>
        </div>

        <div className="glass-elevated rounded-2xl overflow-hidden border border-[var(--border-subtle)]">
           <table className="w-full text-left border-collapse">
              <thead>
                 <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-xs font-semibold tracking-wider uppercase text-[var(--text-muted)]">
                    <th className="px-6 py-4">Name / Contact</th>
                    <th className="px-6 py-4">Custom Context Variables</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Last Activity</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                 {leads.length === 0 ? (
                    <tr>
                       <td colSpan={5} className="px-6 py-12 text-center text-[var(--text-muted)]">
                          No leads found in the database. Send a webhook to ingest.
                       </td>
                    </tr>
                 ) : (
                    leads.map((lead: any) => (
                       <tr key={lead.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors group">
                          <td className="px-6 py-4">
                             <p className="font-semibold text-[var(--text-primary)]">{lead.firstName} {lead.lastName}</p>
                             <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">{lead.phone} • {lead.email}</p>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex flex-wrap gap-1.5 max-w-sm">
                                {lead.customFields && Object.keys(lead.customFields).length > 0 ? (
                                   Object.entries(lead.customFields).map(([k, v]: [string, any], i) => (
                                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-secondary)]">
                                         <strong className="text-[var(--text-primary)]">{k}:</strong> {String(v).substring(0, 30)}{String(v).length > 30 ? '...' : ''}
                                      </span>
                                   ))
                                ) : (
                                   <span className="text-xs text-[var(--text-muted)] italic">No custom fields</span>
                                )}
                             </div>
                          </td>
                          <td className="px-6 py-4">
                             <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                                lead.status === 'NEW' ? 'bg-[var(--info)]/20 text-[var(--info)]' :
                                lead.status === 'MEETING_SCHEDULED' ? 'bg-[var(--success)]/20 text-[var(--success)]' :
                                'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                             }`}>
                                {lead.status}
                             </span>
                          </td>
                          <td className="px-6 py-4">
                             {lead.callLogs && lead.callLogs.length > 0 ? (
                                <div>
                                   <p className="text-xs text-[var(--text-primary)] font-medium flex items-center gap-1.5">
                                      <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                                      {new Date(lead.callLogs[0].startedAt).toLocaleDateString()}
                                   </p>
                                   <p className="text-[10px] text-[var(--text-muted)] mt-0.5 ml-4.5">{lead.callLogs[0].outcome || 'Call Completed'}</p>
                                </div>
                             ) : (
                                <p className="text-xs text-[var(--text-muted)] italic">No recent calls</p>
                             )}
                          </td>
                          <td className="px-6 py-4 text-right">
                             <button className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors opacity-0 group-hover:opacity-100">
                                <Trash2 className="w-4 h-4" />
                             </button>
                          </td>
                       </tr>
                    ))
                 )}
              </tbody>
           </table>
        </div>
      </main>
    </div>
  )
}
