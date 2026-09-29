'use client';

import { useState } from 'react';

export default function ScriptsSettingsPage() {
  const [buyerScript, setBuyerScript] = useState("Hi {{first_name}}, this is Jules with {{agent_name}}'s real estate team. I saw you were looking at homes in {{area}} and wanted to quickly help you get the right information. Are you still interested in homes around there?");
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
        setSaving(false);
        alert('Script saved successfully!');
    }, 800);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">AI Call Scripts</h1>

      <div className="bg-white rounded-lg shadow p-6 border border-gray-200 mb-6">
        <h2 className="text-xl font-semibold mb-2 text-gray-800">Buyer First Call</h2>
        <p className="text-sm text-gray-500 mb-4">Variables available: <code>{`{{first_name}}`}</code>, <code>{`{{agent_name}}`}</code>, <code>{`{{area}}`}</code></p>
        <textarea
          value={buyerScript}
          onChange={(e) => setBuyerScript(e.target.value)}
          className="w-full h-32 p-3 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm mb-4"
        />
        <div className="flex justify-end">
          <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Script'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 border border-gray-200 opacity-75">
        <h2 className="text-xl font-semibold mb-2 text-gray-800">Seller First Call (Read-Only Preview)</h2>
        <textarea
          readOnly
          value="Hi {{first_name}}, this is Jules with {{agent_name}}'s real estate team. I saw you may be interested in the value of your property at {{property_address}}. I just wanted to confirm a couple details so {{agent_name}} can give you a more accurate local number."
          className="w-full h-32 p-3 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-sm text-gray-600"
        />
      </div>
    </div>
  );
}
