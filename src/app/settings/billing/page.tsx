export const dynamic = 'force-dynamic';
import { Settings as SettingsIcon, Shield, Webhook, Zap, Key, Link as LinkIcon, Users, CreditCard, Check } from 'lucide-react'
import Link from 'next/link'
import { getBillingDetails, createCheckoutSession } from '@/app/actions/billing'
import { prisma } from '@/lib/db/prisma'

export default async function BillingPage() {

  let orgId = 'mock-org-id'
  if (process.env.npm_lifecycle_event !== 'build') {
     // Fetch the first organization for prototype purposes
     const org = await prisma.organization.findFirst()
     if (org) orgId = org.id
  }

  const billing = await getBillingDetails(orgId)
  const usagePercentage = Math.min((billing.minutesUsed / billing.minutesLimit) * 100, 100)

  // Stripe Price IDs would normally be stored in env vars
  const plans = [
    { name: 'Starter', price: '$97', minutes: 500, agents: 1, priceId: 'price_starter' },
    { name: 'Professional', price: '$297', minutes: 5000, agents: 5, priceId: 'price_pro', popular: true },
    { name: 'Enterprise', price: '$997', minutes: 25000, agents: 'Unlimited', priceId: 'price_enterprise' }
  ]

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
                 <Link href="/settings" className="flex items-center gap-3 px-3 py-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] font-medium text-sm rounded-xl transition-colors">
                    <Shield className="w-4 h-4" /> CRM Integrations
                 </Link>
                 <Link href="/settings/billing" className="flex items-center gap-3 px-3 py-2.5 bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium text-sm rounded-xl">
                    <CreditCard className="w-4 h-4 text-[var(--accent)]" /> Billing & Usage
                 </Link>
                 <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] font-medium text-sm rounded-xl transition-colors">
                    <Key className="w-4 h-4" /> API Keys
                 </a>
              </nav>
           </div>
        </aside>

        <div className="flex-1 space-y-6">
           <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Billing & Usage</h1>
              <p className="text-[var(--text-muted)] mt-1">Manage your SaaS subscription, limits, and payment methods.</p>
           </div>

           <div className="glass-elevated rounded-2xl p-6 border border-[var(--border-subtle)]">
               <h3 className="font-semibold text-lg mb-4">Current Usage</h3>
               <div className="flex items-end justify-between mb-2">
                   <div>
                       <span className="text-3xl font-bold">{billing.minutesUsed}</span>
                       <span className="text-[var(--text-muted)] ml-2">/ {billing.minutesLimit} AI Minutes</span>
                   </div>
                   <span className="text-sm font-medium text-[var(--text-muted)]">{usagePercentage.toFixed(1)}% Used</span>
               </div>
               <div className="w-full bg-[var(--bg-tertiary)] h-3 rounded-full overflow-hidden">
                   <div
                      className={`h-full transition-all duration-500 ${usagePercentage > 90 ? 'bg-[var(--danger)]' : usagePercentage > 75 ? 'bg-[var(--warning)]' : 'bg-[var(--success)]'}`}
                      style={{ width: `${usagePercentage}%` }}
                   />
               </div>
               <p className="text-xs text-[var(--text-muted)] mt-4">Current Plan: <span className="font-bold text-[var(--text-primary)] uppercase">{billing.plan}</span></p>
           </div>

           <div className="grid grid-cols-3 gap-6 pt-6">
               {plans.map(plan => (
                   <div key={plan.name} className={`glass-elevated rounded-2xl p-6 relative flex flex-col ${plan.popular ? 'border-[var(--accent)] shadow-[0_0_20px_rgba(0,229,160,0.1)]' : 'border-[var(--border-subtle)] hover:border-[var(--border)]'}`}>
                       {plan.popular && (
                           <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--accent)] text-[var(--bg-primary)] text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">Most Popular</span>
                       )}
                       <h3 className="text-lg font-bold text-[var(--text-primary)]">{plan.name}</h3>
                       <div className="mt-4 mb-6">
                           <span className="text-3xl font-bold">{plan.price}</span>
                           <span className="text-sm text-[var(--text-muted)]">/mo</span>
                       </div>

                       <ul className="space-y-3 mb-8 flex-1">
                           <li className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                               <Check className="w-4 h-4 text-[var(--success)] shrink-0" />
                               {plan.minutes.toLocaleString()} Voice Minutes
                           </li>
                           <li className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                               <Check className="w-4 h-4 text-[var(--success)] shrink-0" />
                               {plan.agents} AI Agent{plan.agents !== 1 ? 's' : ''}
                           </li>
                           <li className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                               <Check className="w-4 h-4 text-[var(--success)] shrink-0" />
                               Smart Campaigns
                           </li>
                           <li className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                               <Check className="w-4 h-4 text-[var(--success)] shrink-0" />
                               CRM Sync
                           </li>
                       </ul>

                       <form action={async () => {
                           'use server'
                           // Wrap server action to handle redirects
                           const { redirect } = await import('next/navigation')
                           const res = await createCheckoutSession(orgId, plan.priceId)
                           if (res.url) redirect(res.url)
                       }}>
                           <button className={`w-full py-2.5 rounded-xl font-bold text-sm transition-colors ${
                               billing.plan === plan.name.toUpperCase()
                               ? 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-not-allowed'
                               : plan.popular
                                  ? 'bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-dim)]'
                                  : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--border-subtle)] border border-[var(--border)]'
                           }`} disabled={billing.plan === plan.name.toUpperCase()}>
                               {billing.plan === plan.name.toUpperCase() ? 'Current Plan' : 'Upgrade'}
                           </button>
                       </form>
                   </div>
               ))}
           </div>

        </div>
      </main>
    </div>
  )
}
