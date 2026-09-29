'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';

import { Lead, LeadActivity, FollowUpWorkflow, LeadScore } from '@prisma/client';

type LeadProfileData = Lead & {
  agent: any;
  activeWorkflow: FollowUpWorkflow | null;
  activities: LeadActivity[];
  scores: LeadScore[];
};

export default function LeadProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [lead, setLead] = useState<LeadProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/leads/${resolvedParams.id}`)
      .then(res => res.json())
      .then(data => {
        setLead(data);
        setLoading(false);
      });
  }, [resolvedParams.id]);

  const triggerAction = async (action: string) => {
    if (!lead) return;
    try {
      let endpoint = '/api/workflows/trigger';
      let payload: any = { leadId: lead.id, action, agentPhone: '555-1234' };

      if (action === 'direct_mail') {
        endpoint = '/api/direct-mail';
        payload = { leadId: lead.id, campaignType: 'Manual Agent Dispatch' };
      } else if (action === 'crm_sync') {
        endpoint = `/api/leads/${lead.id}/sync`;
        payload = {};
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || 'Action failed');

      alert(result.message || (action === 'direct_mail' ? 'Direct mail task created successfully' : 'Action triggered successfully'));

      // Refresh lead data
      const updatedRes = await fetch(`/api/leads/${resolvedParams.id}`);
      const updatedData = await updatedRes.json();
      setLead(updatedData);
    } catch (e: any) {
      alert(e.message || 'Error triggering action');
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!lead) return <div className="p-8">Lead not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">{lead.first_name} {lead.last_name}</h1>
          <Link href="/leads" className="text-blue-600 hover:underline">Back to Leads</Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
              <h2 className="text-xl font-semibold mb-4">Contact Details</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500 block">Email</span> {lead.email || 'N/A'}</div>
                <div><span className="text-gray-500 block">Phone</span> {lead.phone || 'N/A'}</div>
                <div><span className="text-gray-500 block">Type</span> {lead.lead_type}</div>
                <div><span className="text-gray-500 block">Status</span> {lead.status}</div>
                <div><span className="text-gray-500 block">Score</span> {lead.urgency_score || 0}/100</div>
                {lead.activeWorkflow && (
                  <div className="col-span-2 mt-2 p-3 bg-indigo-50 border border-indigo-100 rounded text-indigo-800">
                    <span className="font-semibold block mb-1">Active Workflow:</span>
                    <div className="flex items-center justify-between">
                      <span>{lead.activeWorkflow.name}</span>
                      <span className="bg-indigo-200 text-indigo-900 py-1 px-2 rounded-full text-xs font-bold">
                        Day {lead.currentWorkflowDay}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {lead.ai_summary && (
              <div className="bg-blue-50 shadow rounded-lg p-6 border border-blue-200">
                <h2 className="text-xl font-semibold mb-4 text-blue-900">Latest AI Summary</h2>
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">
                  {lead.ai_summary}
                </pre>
              </div>
            )}

            <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
              <h2 className="text-xl font-semibold mb-4">Activity Timeline</h2>
              {lead.activities && lead.activities.length > 0 ? (
                <ul className="space-y-4">
                  {lead.activities.map((act: any) => (
                    <li key={act.id} className="text-sm">
                      <span className="font-medium text-gray-900">{act.type}</span>: {act.description}
                      <span className="text-gray-500 ml-2 text-xs">{new Date(act.createdAt).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No activity recorded yet.</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button onClick={() => triggerAction('call')} className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
                  AI Call
                </button>
                <button onClick={() => triggerAction('sms')} className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700">
                  Send SMS
                </button>
                <button onClick={() => triggerAction('email')} className="w-full bg-sky-600 text-white py-2 px-4 rounded hover:bg-sky-700">
                  Send AI Email
                </button>
                <button onClick={() => triggerAction('warm_transfer')} className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700">
                  Mock Warm Transfer
                </button>
                <button onClick={() => triggerAction('direct_mail')} className="w-full bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600 mt-4">
                  Send Direct Mail
                </button>
                <div className="pt-4 border-t border-gray-200 mt-4">
                  <button onClick={() => triggerAction('crm_sync')} className="w-full bg-gray-100 text-gray-800 py-2 px-4 rounded border border-gray-300 hover:bg-gray-200">
                    Sync to CRM
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
