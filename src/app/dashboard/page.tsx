'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import ABTestDashboard from '@/components/ab-testing/ABTestDashboard'

interface Campaign {
  id: string
  name: string
  status: string
  type: string
  isAbTesting: boolean
  _count: { steps: number; campaignLeads: number }
}

interface Agent {
  id: string
  name: string
  status: string
}

export default function EnhancedDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [showABSetup, setShowABSetup] = useState(false)
  const [abVariants, setAbVariants] = useState([
    { id: 'A', weight: 50, aiAgentId: '', emailSubject: '', emailBody: '', smsBody: '' },
    { id: 'B', weight: 50, aiAgentId: '', emailSubject: '', emailBody: '', smsBody: '' }
  ])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [campaignsRes, agentsRes] = await Promise.all([
        fetch('/api/campaigns'),
        fetch('/api/agents')
      ])
      if (campaignsRes.ok) setCampaigns(await campaignsRes.json())
      if (agentsRes.ok) setAgents(await agentsRes.json())
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function setupABTest() {
    if (!selectedCampaign) return
    try {
      const res = await fetch('/api/campaigns/' + selectedCampaign, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAbTesting: true,
          abTestVariants: abVariants
        })
      })
      if (res.ok) {
        setShowABSetup(false)
        loadData()
      }
    } catch (err) {
      console.error('Failed to setup A/B test:', err)
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading dashboard...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Campaign Dashboard</h1>
          <div className="flex gap-3">
            <Link href="/campaigns" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              All Campaigns
            </Link>
            <Link href="/workflows/builder" className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
              Workflow Builder
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500">Total Campaigns</div>
            <div className="text-3xl font-bold">{campaigns.length}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500">Active</div>
            <div className="text-3xl font-bold text-green-600">
              {campaigns.filter(c => c.status === 'ACTIVE').length}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500">A/B Tests</div>
            <div className="text-3xl font-bold text-purple-600">
              {campaigns.filter(c => c.isAbTesting).length}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500">AI Agents</div>
            <div className="text-3xl font-bold text-blue-600">{agents.length}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Campaigns</h2>
            </div>
            <div className="divide-y">
              {campaigns.slice(0, 10).map((campaign) => (
                <div
                  key={campaign.id}
                  className={'p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 ' + (selectedCampaign === campaign.id ? 'bg-blue-50' : '')}
                  onClick={() => setSelectedCampaign(campaign.id)}
                >
                  <div>
                    <div className="font-medium">{campaign.name}</div>
                    <div className="text-sm text-gray-500">
                      {campaign._count.steps} steps, {campaign._count.campaignLeads} leads
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {campaign.isAbTesting && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">A/B</span>
                    )}
                    <span className={'px-2 py-1 text-xs rounded ' + (
                      campaign.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                      campaign.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    )}>
                      {campaign.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {selectedCampaign && !showABSetup && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-semibold">Quick Actions</h2>
                </div>
                <div className="p-6 space-y-3">
                  <button
                    onClick={() => setShowABSetup(true)}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                  >
                    Setup A/B Test
                  </button>
                  <Link
                    href={'/campaigns/' + selectedCampaign}
                    className="block w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-center"
                  >
                    Configure Campaign
                  </Link>
                  <Link
                    href={'/campaigns/' + selectedCampaign}
                    className="block w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-center"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            )}

            {showABSetup && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-semibold">A/B Test Setup</h2>
                </div>
                <div className="p-6 space-y-4">
                  {abVariants.map((variant, idx) => (
                    <div key={variant.id} className="flex items-center gap-3">
                      <span className="w-8 h-8 flex items-center justify-center bg-purple-100 text-purple-700 rounded-full font-bold">
                        {variant.id}
                      </span>
                      <select
                        value={variant.aiAgentId}
                        onChange={(e) => {
                          const newVariants = [...abVariants]
                          newVariants[idx].aiAgentId = e.target.value
                          setAbVariants(newVariants)
                        }}
                        className="flex-1 px-3 py-2 border rounded"
                      >
                        <option value="">Select Agent</option>
                        {agents.map((agent) => (
                          <option key={agent.id} value={agent.id}>{agent.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={variant.weight}
                        onChange={(e) => {
                          const newVariants = [...abVariants]
                          newVariants[idx].weight = parseInt(e.target.value) || 50
                          setAbVariants(newVariants)
                        }}
                        className="w-20 px-3 py-2 border rounded"
                        min="1"
                        max="100"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  ))}
                  {abVariants.map((variant, idx) => (
                    <div key={variant.id + '-content'} className="border-t pt-3 space-y-2">
                      <p className="text-sm font-medium text-gray-700">Variant {variant.id} Content Overrides</p>
                      <input
                        type="text"
                        placeholder="Email subject (optional override)"
                        value={variant.emailSubject || ''}
                        onChange={(e) => {
                          const nv = [...abVariants]
                          nv[idx].emailSubject = e.target.value
                          setAbVariants(nv)
                        }}
                        className="w-full px-3 py-2 border rounded text-sm"
                      />
                      <textarea
                        placeholder="Email body (optional override — leave blank to use campaign default)"
                        value={variant.emailBody || ''}
                        onChange={(e) => {
                          const nv = [...abVariants]
                          nv[idx].emailBody = e.target.value
                          setAbVariants(nv)
                        }}
                        className="w-full px-3 py-2 border rounded text-sm"
                        rows={3}
                      />
                      <textarea
                        placeholder="SMS body (optional override — leave blank to use campaign default)"
                        value={variant.smsBody || ''}
                        onChange={(e) => {
                          const nv = [...abVariants]
                          nv[idx].smsBody = e.target.value
                          setAbVariants(nv)
                        }}
                        className="w-full px-3 py-2 border rounded text-sm"
                        rows={2}
                      />
                    </div>
                  ))}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={setupABTest}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                      Save A/B Test
                    </button>
                    <button
                      onClick={() => setShowABSetup(false)}
                      className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedCampaign && campaigns.find(c => c.id === selectedCampaign)?.isAbTesting && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6">
                  <ABTestDashboard campaignId={selectedCampaign} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
