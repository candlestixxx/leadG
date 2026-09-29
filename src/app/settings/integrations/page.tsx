'use client';

import { useState, useEffect } from 'react';

export default function IntegrationsSettingsPage() {
  const [vapiKey, setVapiKey] = useState('');
  const [twilioSid, setTwilioSid] = useState('');
  const [twilioToken, setTwilioToken] = useState('');
  const [twilioFromNumber, setTwilioFromNumber] = useState('');
  const [crmWebhookUrl, setCrmWebhookUrl] = useState('');
  const [lobApiKey, setLobApiKey] = useState('');
  const [googleCalendarToken, setGoogleCalendarToken] = useState('');
  const [fubApiKey, setFubApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          data.forEach((setting: any) => {
            if (setting.provider === 'vapi') setVapiKey(setting.apiKey);
            if (setting.provider === 'twilio_sid') setTwilioSid(setting.apiKey);
            if (setting.provider === 'twilio_token') setTwilioToken(setting.apiKey);
            if (setting.provider === 'twilio_from_number') setTwilioFromNumber(setting.apiKey);
            if (setting.provider === 'crm_webhook_url') setCrmWebhookUrl(setting.apiKey);
            if (setting.provider === 'lob_api_key') setLobApiKey(setting.apiKey);
            if (setting.provider === 'google_calendar_token') setGoogleCalendarToken(setting.apiKey);
            if (setting.provider === 'fub_api_key') setFubApiKey(setting.apiKey);
            if (setting.provider === 'openai_api_key') setOpenaiApiKey(setting.apiKey);
          });
        }
      } catch (err) {
        console.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (provider: string, apiKey: string) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey })
      });
      if (res.ok) {
        setMessage('Settings saved successfully!');
      } else {
        setMessage('Failed to save settings.');
      }
    } catch (err) {
      setMessage('Error saving settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleTwilioSave = async () => {
    await handleSave('twilio_sid', twilioSid);
    await handleSave('twilio_token', twilioToken);
    await handleSave('twilio_from_number', twilioFromNumber);
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Integrations</h1>

      {message && (
        <div className="mb-4 p-4 text-green-700 bg-green-100 rounded-md border border-green-200">
          {message}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 border border-gray-200 space-y-8">

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-800">Voice AI (Vapi / Retell)</h2>
          <p className="text-sm text-gray-500 mb-4">Connect your voice provider for outbound AI calling.</p>
          <div className="flex items-center space-x-4">
            <input
              type="password"
              placeholder="sk_test_..."
              value={vapiKey}
              onChange={(e) => setVapiKey(e.target.value)}
              className="flex-1 rounded-md border-gray-300 shadow-sm border p-2 font-mono text-sm"
            />
            <button
              onClick={() => handleSave('vapi', vapiKey)}
              disabled={saving}
              className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded shadow hover:bg-gray-50 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>

        <hr className="border-gray-200" />

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-800">SMS (Twilio)</h2>
          <p className="text-sm text-gray-500 mb-4">Configure Twilio credentials for text message follow-ups.</p>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Account SID"
              value={twilioSid}
              onChange={(e) => setTwilioSid(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm border p-2 font-mono text-sm"
            />
            <div className="flex items-center space-x-4">
              <input
                type="password"
                placeholder="Auth Token"
                value={twilioToken}
                onChange={(e) => setTwilioToken(e.target.value)}
                className="flex-1 rounded-md border-gray-300 shadow-sm border p-2 font-mono text-sm"
              />
            </div>
            <div className="flex items-center space-x-4">
               <input
                type="text"
                placeholder="From Phone Number (e.g. +1234567890)"
                value={twilioFromNumber}
                onChange={(e) => setTwilioFromNumber(e.target.value)}
                className="flex-1 rounded-md border-gray-300 shadow-sm border p-2 font-mono text-sm"
              />
              <button
                onClick={handleTwilioSave}
                disabled={saving}
                className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded shadow hover:bg-gray-50 disabled:opacity-50"
              >
                Save Twilio Settings
              </button>
            </div>
          </div>
        </div>

        <hr className="border-gray-200" />

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-800">Inbound CRM Webhook</h2>
          <p className="text-sm text-gray-500 mb-4">Your personalized webhook URL to receive leads from Zillow or Follow Up Boss.</p>
          <div className="bg-gray-100 p-3 rounded border border-gray-200 font-mono text-sm break-all">
            https://jules-ai.example.com/api/webhooks/crm
          </div>
        </div>

        <hr className="border-gray-200" />

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-800">Outbound CRM Webhook</h2>
          <p className="text-sm text-gray-500 mb-4">Provide an external CRM webhook to sync lead status updates back to your platform.</p>
          <div className="flex items-center space-x-4">
            <input
              type="url"
              placeholder="https://api.followupboss.com/..."
              value={crmWebhookUrl}
              onChange={(e) => setCrmWebhookUrl(e.target.value)}
              className="flex-1 rounded-md border-gray-300 shadow-sm border p-2 font-mono text-sm"
            />
            <button
              onClick={() => handleSave('crm_webhook_url', crmWebhookUrl)}
              disabled={saving}
              className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded shadow hover:bg-gray-50 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>

        <hr className="border-gray-200" />

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-800">Direct Mail (Lob)</h2>
          <p className="text-sm text-gray-500 mb-4">Connect Lob API to autonomously send physical postcards to unresponsive leads.</p>
          <div className="flex items-center space-x-4">
            <input
              type="password"
              placeholder="live_..."
              value={lobApiKey}
              onChange={(e) => setLobApiKey(e.target.value)}
              className="flex-1 rounded-md border-gray-300 shadow-sm border p-2 font-mono text-sm"
            />
            <button
              onClick={() => handleSave('lob_api_key', lobApiKey)}
              disabled={saving}
              className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded shadow hover:bg-gray-50 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>

        <hr className="border-gray-200" />

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-800">Calendar (Google)</h2>
          <p className="text-sm text-gray-500 mb-4">Provide an OAuth token or API key to allow Jules to automatically book showings.</p>
          <div className="flex items-center space-x-4">
            <input
              type="password"
              placeholder="ya29.a0..."
              value={googleCalendarToken}
              onChange={(e) => setGoogleCalendarToken(e.target.value)}
              className="flex-1 rounded-md border-gray-300 shadow-sm border p-2 font-mono text-sm"
            />
            <button
              onClick={() => handleSave('google_calendar_token', googleCalendarToken)}
              disabled={saving}
              className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded shadow hover:bg-gray-50 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>

        <hr className="border-gray-200" />

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-800">Follow Up Boss API</h2>
          <p className="text-sm text-gray-500 mb-4">Provide your FUB API Key to allow bi-directional status syncing.</p>
          <div className="flex items-center space-x-4">
            <input
              type="password"
              placeholder="fka_..."
              value={fubApiKey}
              onChange={(e) => setFubApiKey(e.target.value)}
              className="flex-1 rounded-md border-gray-300 shadow-sm border p-2 font-mono text-sm"
            />
            <button
              onClick={() => handleSave('fub_api_key', fubApiKey)}
              disabled={saving}
              className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded shadow hover:bg-gray-50 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>

        <hr className="border-gray-200" />

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-800">OpenAI Configuration</h2>
          <p className="text-sm text-gray-500 mb-4">Enable true LLM natural language parsing for incoming text messages and emails (uses gpt-4o-mini).</p>
          <div className="flex items-center space-x-4">
            <input
              type="password"
              placeholder="sk-proj-..."
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
              className="flex-1 rounded-md border-gray-300 shadow-sm border p-2 font-mono text-sm"
            />
            <button
              onClick={() => handleSave('openai_api_key', openaiApiKey)}
              disabled={saving}
              className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded shadow hover:bg-gray-50 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
