import { notFound } from 'next/navigation'
import { getAgent } from '@/app/actions/agents'
import { ArrowLeft, Bot, Save, Mic, Settings, Activity } from 'lucide-react'
import Link from 'next/link'

export default async function AgentEditorPage({ params }: { params: { id: string } }) {
  const agent = await getAgent(params.id)

  if (!agent && process.env.npm_lifecycle_event !== 'build') {
    notFound()
  }

  const safeAgent = agent || {
     name: 'Loading...', voiceGender: 'FEMALE', voiceAccent: 'American', voiceTone: 'Professional',
     systemPrompt: '', objectionHandling: [], isActive: false
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="border-b border-[var(--border-subtle)] glass sticky top-0 z-20">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/agents" className="p-2 -ml-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="h-6 w-px bg-[var(--border)]" />
            <div className="flex items-center gap-3">
              <h1 className="font-bold text-lg text-[var(--text-primary)]">{safeAgent.name}</h1>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                safeAgent.isActive ? 'bg-[var(--success)]/20 text-[var(--success)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
              }`}>
                {safeAgent.isActive ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 rounded-lg font-medium text-sm border border-[var(--border)] bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-dim)] transition-colors flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Configuration
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-8 flex gap-8">
         <div className="flex-1 space-y-6">
             <div className="glass-elevated rounded-xl p-6">
                 <div className="flex items-center gap-2 mb-4">
                     <Settings className="w-5 h-5 text-[var(--accent)]" />
                     <h2 className="text-lg font-semibold">Core Identity & Prompt</h2>
                 </div>
                 <div className="space-y-4">
                     <div>
                         <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">System Instructions</label>
                         <textarea
                            className="w-full h-64 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-4 text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
                            defaultValue={safeAgent.systemPrompt}
                         />
                     </div>
                 </div>
             </div>

             <div className="glass-elevated rounded-xl p-6">
                 <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-2">
                         <Activity className="w-5 h-5 text-[var(--warning)]" />
                         <h2 className="text-lg font-semibold">Learned Objection Handlers</h2>
                     </div>
                     <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-1 rounded-md border border-[var(--border)]">
                         Auto-updated via Reflection Engine
                     </span>
                 </div>
                 <div className="space-y-3">
                     {!Array.isArray(safeAgent.objectionHandling) || safeAgent.objectionHandling.length === 0 ? (
                         <p className="text-sm text-[var(--text-muted)] italic">No objections learned yet.</p>
                     ) : (
                         (safeAgent.objectionHandling as any[]).map((obj, i) => (
                             <div key={i} className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg">
                                 <p className="text-sm font-medium text-[var(--danger)] mb-1">If lead says: "{obj.objection}"</p>
                                 <p className="text-sm text-[var(--success)]">Respond with: "{obj.response}"</p>
                             </div>
                         ))
                     )}
                 </div>
             </div>
         </div>

         <div className="w-80 shrink-0 space-y-6">
            <div className="glass-elevated rounded-xl p-5">
               <div className="flex items-center gap-2 mb-4">
                   <Mic className="w-4 h-4 text-[var(--info)]" />
                   <h3 className="font-semibold text-[var(--text-primary)]">Voice Synthesis</h3>
               </div>
               <div className="space-y-4">
                  <div>
                     <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Gender</label>
                     <select className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]" defaultValue={safeAgent.voiceGender}>
                        <option value="FEMALE">Female</option>
                        <option value="MALE">Male</option>
                        <option value="NEUTRAL">Neutral</option>
                     </select>
                  </div>
                  <div>
                     <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Accent Region</label>
                     <input type="text" defaultValue={safeAgent.voiceAccent} className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]" />
                  </div>
                  <div>
                     <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Tone</label>
                     <input type="text" defaultValue={safeAgent.voiceTone} className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]" />
                  </div>
                  <button className="w-full py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] hover:bg-[var(--border-subtle)] transition-colors rounded-lg text-sm font-medium mt-2 flex items-center justify-center gap-2">
                     <Play className="w-3 h-3" /> Preview Voice
                  </button>
               </div>
            </div>
         </div>
      </main>
    </div>
  )
}
