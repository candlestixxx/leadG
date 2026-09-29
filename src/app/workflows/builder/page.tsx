'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import Link from 'next/link';

import { FollowUpStep } from '@prisma/client';

type BuilderStep = FollowUpStep & { content?: string };

export default function WorkflowBuilderPage() {
  const [steps, setSteps] = useState<BuilderStep[]>([]);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('Loading Workflow...');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initData = async () => {
      try {
        const res = await fetch('/api/workflows');
        if (res.ok) {
          const data = await res.json();
          // Load the first workflow for MVP demonstration
          if (data && data.length > 0) {
            setWorkflowId(data[0].id);
            setWorkflowName(data[0].name);
            setSteps(data[0].steps.map((s: any) => ({
              ...s,
              id: s.id || `temp-${Math.random()}`,
              content: s.script || s.message || 'Action step'
            })));
          }
        }
      } catch (err) {
        console.error('Failed to load workflow data', err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const newSteps = Array.from(steps);
    const [reorderedItem] = newSteps.splice(result.source.index, 1);
    newSteps.splice(result.destination.index, 0, reorderedItem);

    setSteps(newSteps);
  };

  const handleSave = async () => {
    if (!workflowId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/workflows', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId, steps })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Workflow saved successfully!');
      } else {
        alert('Failed to save workflow.');
      }
    } catch (e) {
      alert('An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading builder...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Visual Workflow Builder</h1>
            <p className="text-sm text-gray-500 mt-1">Editing: <span className="font-semibold text-indigo-600">{workflowName}</span></p>
          </div>
          <div className="space-x-4">
            <Link href="/workflows" className="text-blue-600 hover:underline">Back to Workflows</Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Workflow'}
            </button>
          </div>
        </header>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-gray-600 mb-6">Drag and drop the steps below to reorder the communication sequence.</p>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="workflow-steps">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-3"
                >
                  {steps.map((step, index) => (
                    <Draggable key={step.id} draggableId={step.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="flex items-center p-4 bg-gray-50 border border-gray-200 rounded-md shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="mr-4 text-gray-400 cursor-grab">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16"></path>
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded font-bold uppercase">
                                {step.channel}
                              </span>
                              <span className="font-medium text-gray-900">Day {step.day}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{step.content}</p>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </div>
    </div>
  );
}
