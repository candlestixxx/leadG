import { BarChart3, Activity, Users, Zap } from 'lucide-react'
import { getAnalyticsData } from '../actions/analytics'

export default async function AnalyticsDashboard() {
  const data = await getAnalyticsData()

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-8">
       <div className="max-w-[1600px] mx-auto">
          <div className="mb-8">
             <h1 className="text-3xl font-bold tracking-tight">Analytics & Sentiment</h1>
             <p className="text-[var(--text-muted)] mt-2">Monitor system-wide agent performance and lead sentiment across campaigns.</p>
          </div>

          <div className="grid grid-cols-4 gap-6 mb-8">
             <div className="glass-elevated p-6 rounded-2xl">
                 <div className="flex items-center gap-3 mb-2">
                     <Activity className="w-5 h-5 text-[var(--info)]" />
                     <h3 className="text-sm font-medium text-[var(--text-muted)]">Average Sentiment</h3>
                 </div>
                 <p className="text-3xl font-bold">{data.avgSentiment.toFixed(2)}</p>
                 <p className="text-xs text-[var(--text-muted)] mt-1">-1.0 (Negative) to 1.0 (Positive)</p>
             </div>
             <div className="glass-elevated p-6 rounded-2xl">
                 <div className="flex items-center gap-3 mb-2">
                     <Zap className="w-5 h-5 text-[var(--success)]" />
                     <h3 className="text-sm font-medium text-[var(--text-muted)]">Total Transferred</h3>
                 </div>
                 <p className="text-3xl font-bold">{data.totalTransferred}</p>
                 <p className="text-xs text-[var(--text-muted)] mt-1">Live agent handoffs</p>
             </div>
             <div className="glass-elevated p-6 rounded-2xl">
                 <div className="flex items-center gap-3 mb-2">
                     <Users className="w-5 h-5 text-[var(--warning)]" />
                     <h3 className="text-sm font-medium text-[var(--text-muted)]">Total Converted</h3>
                 </div>
                 <p className="text-3xl font-bold">{data.totalConverted}</p>
                 <p className="text-xs text-[var(--text-muted)] mt-1">Meetings scheduled / closed</p>
             </div>
             <div className="glass-elevated p-6 rounded-2xl">
                 <div className="flex items-center gap-3 mb-2">
                     <BarChart3 className="w-5 h-5 text-[var(--accent)]" />
                     <h3 className="text-sm font-medium text-[var(--text-muted)]">Active Campaigns</h3>
                 </div>
                 <p className="text-3xl font-bold">{data.activeCampaigns}</p>
                 <p className="text-xs text-[var(--text-muted)] mt-1">Currently running</p>
             </div>
          </div>

          <div className="glass-elevated rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-6">Recent Successful Agent Handlers</h3>
              <div className="space-y-4">
                 {data.learnedObjections.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">No learned objections yet. Connect live DB and complete reflection loops.</p>
                 ) : (
                    data.learnedObjections.map((obj: any, i: number) => (
                       <div key={i} className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                          <p className="text-sm font-medium text-[var(--danger)] mb-1">Objection: "{obj.objection}"</p>
                          <p className="text-sm text-[var(--success)]">Response: "{obj.response}"</p>
                       </div>
                    ))
                 )}
              </div>
          </div>
       </div>
    </div>
  )
}
