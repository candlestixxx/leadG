'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ImportLeadsPage() {
  const [csvData, setCsvData] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    let successCount = 0;
    let failedCount = 0;

    try {
      const rows = csvData.split('\n').map(row => row.trim()).filter(row => row.length > 0);

      // Skip header row if present, assuming format: first_name,last_name,email,phone,lead_type,property_address,city,state,zip
      const dataRows = rows[0].toLowerCase().includes('first_name') ? rows.slice(1) : rows;

      for (const row of dataRows) {
        // Simple CSV parse handling commas (not fully robust for quotes but sufficient for MVP)
        const cols = row.split(',');
        if (cols.length >= 2) {
          const payload = {
            first_name: cols[0]?.trim() || 'Unknown',
            last_name: cols[1]?.trim() || 'Lead',
            email: cols[2]?.trim() || '',
            phone: cols[3]?.trim() || '',
            lead_type: cols[4]?.trim() || 'Buyer',
            property_address: cols[5]?.trim() || '',
            city: cols[6]?.trim() || '',
            state: cols[7]?.trim() || '',
            zip: cols[8]?.trim() || '',
          };

          try {
            const res = await fetch('/api/leads', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            if (res.ok) {
              successCount++;
            } else {
              failedCount++;
            }
          } catch (e) {
            failedCount++;
          }
        } else {
          failedCount++;
        }
      }
      setResults({ success: successCount, failed: failedCount });
    } catch (err: any) {
      setError(err.message || 'Failed to process CSV data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Import Leads</h1>
          <Link href="/leads" className="text-blue-600 hover:underline">Back to Leads</Link>
        </header>

        {error && (
          <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-md border border-red-200">
            {error}
          </div>
        )}

        {results && (
          <div className="mb-6 p-4 text-green-800 bg-green-50 rounded-md border border-green-200">
            <strong>Import Complete!</strong> Successfully imported {results.success} leads. Failed: {results.failed}.
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-gray-600 mb-4 text-sm">
            Paste your CSV data below. The expected format is: <strong>first_name, last_name, email, phone, lead_type, property_address, city, state, zip</strong>
          </p>
          <textarea
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            className="w-full h-64 p-3 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-sm mb-4"
            placeholder="John,Doe,john@example.com,555-0100,Buyer,123 Main St,Detroit,MI,48226&#10;Jane,Smith,jane@example.com,555-0200,Seller,456 Oak St,Chicago,IL,60601"
          />
          <div className="flex justify-end">
            <button
              onClick={handleImport}
              disabled={loading || csvData.trim() === ''}
              className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Importing...' : 'Run Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
