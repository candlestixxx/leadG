'use client';

import { useState, useEffect } from 'react';

type KnowledgeSnippet = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
};

export default function KnowledgeBasePage() {
  const [snippets, setSnippets] = useState<KnowledgeSnippet[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('General');
  const [saving, setSaving] = useState(false);

  const fetchSnippets = async () => {
    try {
      const res = await fetch('/api/settings/knowledge');
      if (res.ok) {
        setSnippets(await res.json());
      }
    } catch (e) {
      console.error('Failed to load knowledge base snippets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnippets();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer, category }),
      });
      if (res.ok) {
        setQuestion('');
        setAnswer('');
        fetchSnippets();
      }
    } catch (e) {
      console.error('Failed to save snippet');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this snippet?')) return;
    try {
      const res = await fetch(`/api/settings/knowledge/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSnippets(snippets.filter(s => s.id !== id));
      }
    } catch (e) {
      console.error('Failed to delete snippet');
    }
  };

  if (loading) return <div>Loading Knowledge Base...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Knowledge Base</h1>
      <p className="text-gray-600 mb-8">
        Add frequently asked questions, office details, or common objections here.
        Jules will use this information to dynamically answer questions during live phone calls.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* Form Panel */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Add New Fact</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Question / Topic</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. What are your hours?"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Answer</label>
                <textarea
                  required
                  rows={4}
                  placeholder="e.g. We are open Monday through Friday, 9am to 5pm."
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 p-2"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 text-white rounded p-2 hover:bg-blue-700"
              >
                {saving ? 'Saving...' : 'Add Fact'}
              </button>
            </form>
          </div>
        </div>

        {/* List Panel */}
        <div className="md:col-span-2">
           <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Active Knowledge</h2>
            {snippets.length === 0 ? (
              <p className="text-gray-500">No knowledge snippets added yet.</p>
            ) : (
              <div className="space-y-4">
                {snippets.map(snippet => (
                  <div key={snippet.id} className="border border-gray-200 rounded p-4 relative group">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded mb-2">
                          {snippet.category || 'General'}
                        </span>
                        <h3 className="font-semibold text-gray-900">{snippet.question}</h3>
                        <p className="text-sm text-gray-600 mt-1">{snippet.answer}</p>
                      </div>
                      <button
                        onClick={() => handleDelete(snippet.id)}
                        className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
           </div>
        </div>

      </div>
    </div>
  );
}
