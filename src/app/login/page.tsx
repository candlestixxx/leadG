'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Zap, LogIn } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
      })

      if (res?.error) {
        setError('Invalid credentials. Please try again.')
      } else {
        router.push('/')
        router.refresh()
      }
    } catch (err) {
      setError('An error occurred during sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(ellipse_at_center,var(--accent-glow)_0%,transparent_70%)] opacity-20" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="glass-elevated rounded-3xl p-8 sm:p-12 border hover:border-[var(--border)] transition-colors">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[var(--accent)] flex items-center justify-center mb-6 glow-accent">
              <Zap className="w-8 h-8 text-[var(--bg-primary)]" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-2">Welcome Back</h1>
            <p className="text-[var(--text-muted)] text-sm">Sign in to the VoiceForge Agent Command Center.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-sm font-medium text-center">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider pl-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] focus:border-[var(--accent)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none transition-colors"
                placeholder="name@organization.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider pl-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] focus:border-[var(--accent)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--bg-primary)] font-bold rounded-xl px-4 py-3.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[var(--bg-primary)] border-t-transparent rounded-full animate-spin" />
              ) : (
                <><LogIn className="w-5 h-5" /> Sign In</>
              )}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-[var(--border-subtle)] pt-6">
            <p className="text-xs text-[var(--text-muted)]">
              Authorized access only. By logging in, you agree to the organizational terms of service.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
