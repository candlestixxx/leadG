import { notFound } from 'next/navigation'
import { getCampaign } from '@/app/actions/campaigns'
import { ArrowLeft, Play, Pause, Clock, Phone, Mail, MessageSquare, Plus, Save, Activity } from 'lucide-react'
import Link from 'next/link'

export default async function CampaignEditorPage({ params }: { params: { id: string } }) {
  const campaign = await getCampaign(params.id)

  if (!campaign && process.env.npm_lifecycle_event !== 'build') {
    notFound()
  }

  // Fallback for build phase or not found (if handled above)
  const safeCampaign = campaign || {
     name: 'Loading...', status: 'DRAFT', steps: [], totalLeads: 0, totalCalls: 0, totalConverted: 0
  }

  const StepIcon = ({ type }: { type: string }) => {
     switch (type) {
         case 'CALL': return <Phone className="w-5 h-5 text-[var(--accent)]" />
         case 'EMAIL': return <Mail className="w-5 h-5 text-[var(--info)]" />
         case 'SMS': return <MessageSquare className="w-5 h-5 text-[var(--warning)]" />
         case 'WAIT': return <Clock className="w-5 h-5 text-[var(--text-muted)]" />
         default: return <Activity className="w-5 h-5 text-[var(--text-secondary)]" />
     }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border-subtle)] glass sticky top-0 z-20">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/campaigns" className="p-2 -ml-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="h-6 w-px bg-[var(--border)]" />
            <div className="flex items-center gap-3">
              <h1 className="font-bold text-lg text-[var(--text-primary)]">{safeCampaign.name}</h1>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                safeCampaign.status === 'ACTIVE' ? 'bg-[var(--success)]/20 text-[var(--success)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
              }`}>
                {safeCampaign.status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 rounded-lg font-medium text-sm border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Sequence
            </button>
            <button className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${
                safeCampaign.status === 'ACTIVE'
                  ? 'bg-[var(--warning)]/20 text-[var(--warning)] hover:bg-[var(--warning)]/30'
                  : 'bg-[var(--success)] text-[var(--bg-primary)] hover:bg-[var(--success)]/90'
            }`}>
              {safeCampaign.status === 'ACTIVE' ? (
                 <><Pause className="w-4 h-4" /> Pause Campaign</>
              ) : (
                 <><Play className="w-4 h-4" /> Launch Campaign</>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-8 flex gap-8">
         {/* Sequence Builder Area */}
         <div className="flex-1">
             <h2 className="text-lg font-semibold mb-6">Automation Sequence</h2>

             <div className="relative">
                {/* Connecting Line */}
                <div className="absolute left-8 top-8 bottom-8 w-px bg-[var(--border)] -z-10" />

                <div className="space-y-6">
                   {safeCampaign.steps.length === 0 ? (
                      <p className="text-[var(--text-muted)] italic ml-16">No steps defined. Add a step to begin the sequence.</p>
                   ) : (
                       safeCampaign.steps.map((step: any, index: number) => (
                          <div key={step.id || index} className="flex gap-6 group">
                             <div className="w-16 h-16 rounded-full bg-[var(--bg-secondary)] border-2 border-[var(--border)] flex items-center justify-center shrink-0 z-10 group-hover:border-[var(--accent)] transition-colors">
                                <StepIcon type={step.type} />
                             </div>
                             <div className="flex-1 glass-elevated rounded-xl p-5 border hover:border-[var(--border-subtle)] transition-all">
                                <div className="flex justify-between items-start mb-2">
                                   <h3 className="font-semibold text-[var(--text-primary)]">
                                      {step.type === 'CALL' ? 'Outbound AI Voice Call' :
                                       step.type === 'WAIT' ? `Wait Time Delay` :
                                       step.type === 'SMS' ? 'Send Text Message' : 'Send Email'}
                                   </h3>
                                   <span className="text-xs font-mono text-[var(--text-muted)]">Step {index + 1}</span>
                                </div>
                                {step.type === 'WAIT' && (
                                   <p className="text-sm text-[var(--text-secondary)]">Pause the sequence for {step.delayValue} {step.delayUnit.toLowerCase()}</p>
                                )}
                                {step.type === 'CALL' && (
                                   <p className="text-sm text-[var(--text-secondary)]">Agent attempts to dial lead up to {step.maxAttempts || 3} times.</p>
                                )}
                                {step.type === 'SMS' && (
                                   <div className="mt-3 p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
                                      <p className="text-sm font-mono text-[var(--text-muted)]">Template: {step.templateId || 'Default Follow-Up'}</p>
                                   </div>
                                )}
                             </div>
                          </div>
                       ))
                   )}

                   {/* Add Step Button */}
                   <div className="flex gap-6 pt-4">
                      <button className="w-16 h-16 rounded-full border-2 border-dashed border-[var(--border)] flex items-center justify-center shrink-0 hover:border-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-primary)] z-10">
                         <Plus className="w-6 h-6" />
                      </button>
                      <div className="flex-1 flex items-center">
                         <span className="text-sm font-medium text-[var(--text-muted)]">Add new sequence step</span>
                      </div>
                   </div>
                </div>
             </div>
         </div>

         {/* Sidebar Configuration */}
         <div className="w-80 shrink-0 space-y-6">
            <div className="glass-elevated rounded-xl p-5">
               <h3 className="font-semibold mb-4 text-[var(--text-primary)]">Campaign Settings</h3>
               <div className="space-y-4">
                  <div>
                     <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">AI Agent Assigned</label>
                     <select className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]" disabled>
                        <option>{safeCampaign.aiAgent?.name || 'Loading...'}</option>
                     </select>
                  </div>
                  <div>
                     <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Daily Call Limit</label>
                     <input type="number" value={safeCampaign.callsPerDay || 200} readOnly className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none" />
                  </div>
                  <div>
                     <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Timezone</label>
                     <input type="text" value={safeCampaign.timezone || 'America/New_York'} readOnly className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none" />
                  </div>
               </div>
            </div>

            <div className="glass-elevated rounded-xl p-5">
               <h3 className="font-semibold mb-4 text-[var(--text-primary)]">Live Metrics</h3>
               <div className="space-y-3">
                  <div className="flex justify-between items-center">
                     <span className="text-sm text-[var(--text-secondary)]">Total Leads</span>
                     <span className="font-mono font-medium">{safeCampaign.totalLeads}</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-sm text-[var(--text-secondary)]">Calls Made</span>
                     <span className="font-mono font-medium">{safeCampaign.totalCalls}</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-sm text-[var(--text-secondary)]">Conversions</span>
                     <span className="font-mono font-medium text-[var(--accent)]">{safeCampaign.totalConverted}</span>
                  </div>
               </div>
            </div>
         </div>
      </main>
    </div>
  )
}
