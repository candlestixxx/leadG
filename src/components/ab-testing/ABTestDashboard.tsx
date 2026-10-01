'use client'

import React, { useState, useEffect } from 'react'

interface VariantResult {
  variantId: string
  weight: number
  agentId: string | null
  total: number
  converted: number
  transferred: number
  completed: number
  failed: number
  optedOut: number
  conversionRate: number
  contactRate: number
}

interface ABTestResults {
  campaignId: string
  campaignName: string
  totalLeads: number
  totalConverted: number
  overallConversionRate: number
  variants: VariantResult[]
  winner: string | null
}

export default function ABTestDashboard({ campaignId }: { campaignId: string }) {
  const [results, setResults] = useState<ABTestResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchResults()
  }, [campaignId])

  async function fetchResults() {
    try {
      setLoading(true)
      const res = await fetch('/api/campaigns/ab-test?campaignId=' + campaignId)
      if (!res.ok) throw new Error('Failed to fetch A/B test results')
      const data = await res.json()
      setResults(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-4 text-gray-500">Loading A/B test results...</div>
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>
  if (!results) return <div className="p-4 text-gray-500">No A/B test data available</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">A/B Test Results: {results.campaignName}</h2>
        {results.winner && (
          <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            Winner: Variant {results.winner}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Total Leads</div>
          <div className="text-2xl font-bold">{results.totalLeads}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Total Converted</div>
          <div className="text-2xl font-bold text-green-600">{results.totalConverted}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Overall Conversion</div>
          <div className="text-2xl font-bold">{results.overallConversionRate}%</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {results.variants.map((variant) => (
          <div
            key={variant.variantId}
            className={'bg-white p-6 rounded-lg shadow border-2 ' + (results.winner === variant.variantId ? 'border-green-500' : 'border-transparent')}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Variant {variant.variantId}</h3>
              <span className="text-sm text-gray-500">Weight: {variant.weight}%</span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Leads Assigned</span>
                <span className="font-medium">{variant.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Converted</span>
                <span className="font-medium text-green-600">{variant.converted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Transferred</span>
                <span className="font-medium text-blue-600">{variant.transferred}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Completed</span>
                <span className="font-medium">{variant.completed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Failed</span>
                <span className="font-medium text-red-600">{variant.failed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Opted Out</span>
                <span className="font-medium text-orange-600">{variant.optedOut}</span>
              </div>

              <div className="pt-3 border-t">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Conversion Rate</span>
                  <span className="text-lg font-bold">{variant.conversionRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: variant.conversionRate + '%' }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Contact Rate</span>
                  <span className="text-lg font-bold">{variant.contactRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: variant.contactRate + '%' }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={fetchResults}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Refresh Results
      </button>
    </div>
  )
}
