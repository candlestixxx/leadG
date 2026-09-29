'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { DirectMailTask } from '@prisma/client';

export default function DirectMailPage() {
  const [tasks, setTasks] = useState<DirectMailTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/direct-mail');
      if (!res.ok) throw new Error('Failed to fetch direct mail tasks');
      const data = await res.json();
      setTasks(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred fetching tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initFetch = async () => {
      try {
        const res = await fetch('/api/direct-mail');
        if (!res.ok) throw new Error('Failed to fetch direct mail tasks');
        const data = await res.json();
        setTasks(data);
      } catch (err: any) {
        setError(err.message || 'An error occurred fetching tasks');
      } finally {
        setLoading(false);
      }
    };
    initFetch();
  }, []);

  const markAsSent = async (taskId: string) => {
    setError(null);
    try {
      const res = await fetch('/api/direct-mail', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status: 'Sent' })
      });
      if (!res.ok) throw new Error('Failed to update task status');
      fetchTasks();
    } catch (err: any) {
      setError(err.message || 'Failed to update task');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Direct Mail Tasks</h1>
          <Link href="/" className="text-blue-600 hover:underline">Back to Dashboard</Link>
        </header>

        {error && (
          <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-md border border-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <p>Loading tasks...</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {tasks.length === 0 ? (
                <div className="p-6 text-gray-500 text-center">No direct mail tasks available.</div>
            ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.map(task => (
                  <tr key={task.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <Link href={`/leads/${task.leadId}`} className="text-blue-600 hover:underline">{task.leadId}</Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {task.campaignType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${task.status === 'Sent' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(task.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {task.status !== 'Sent' && (
                          <button onClick={() => markAsSent(task.id)} className="text-indigo-600 hover:text-indigo-900">
                              Mark Sent
                          </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
