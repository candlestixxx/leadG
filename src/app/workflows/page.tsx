'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { FollowUpWorkflow, FollowUpStep } from '@prisma/client';

type WorkflowWithSteps = FollowUpWorkflow & { steps: FollowUpStep[] };

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowWithSteps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const res = await fetch('/api/workflows');
        if (!res.ok) throw new Error('Failed to fetch workflows');
        const data = await res.json();
        setWorkflows(data);
      } catch (err: any) {
        setError(err.message || 'An error occurred fetching workflows');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflows();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Workflows</h1>
          <div className="space-x-4">
            <Link href="/" className="text-blue-600 hover:underline">Back to Dashboard</Link>
            <Link href="/workflows/builder" className="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700">Open Visual Builder</Link>
          </div>
        </header>

        {error && (
          <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-md border border-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <p>Loading workflows...</p>
        ) : (
        <div className="space-y-8">
          {workflows.map(wf => (
            <div key={wf.id} className="bg-white shadow rounded-lg p-6 border border-gray-200">
              <h2 className="text-xl font-bold mb-2">{wf.name}</h2>
              <p className="text-gray-600 mb-6">{wf.description}</p>

              <div className="relative border-l-2 border-blue-200 ml-3">
                {wf.steps.map((step: any, idx: number) => (
                  <div key={idx} className="mb-6 ml-6 relative">
                    <span className="absolute -left-9 top-1 bg-blue-500 w-4 h-4 rounded-full border-2 border-white"></span>
                    <h3 className="font-semibold text-gray-900">Day {step.day} - {step.channel}</h3>
                    <p className="text-gray-500 text-sm">{step.script || step.message || ''}</p>
                  </div>
                ))}
                {wf.steps.length === 0 && (
                  <p className="text-gray-500 text-sm ml-6 italic">No steps defined for this workflow yet.</p>
                )}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}
