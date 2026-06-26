import axios from 'axios';

async function simulateCrmWebhook() {
  const webhookUrl = 'http://localhost:3000/api/webhooks/crm';
  const token = 'test-token';

  const need = 'Needs a fast cash offer on secondary property';

  const sampleLead = {
    firstName: 'Alice',
    lastName: 'Wonderland',
    email: 'alice@example.com',
    phone: '+15551239999',
    company: 'Wonderland Inc.',
    source: 'Simulated CRM Integration',
    customFields: { need }, // Injecting the 'need' variable into customFields
    campaignId: process.argv[2] || undefined // Optionally pass a campaign ID as a CLI argument
  };

  try {
    console.log(`Sending sample lead to ${webhookUrl}...`);
    const response = await axios.post(webhookUrl, sampleLead, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Success! Webhook response:', response.data);
  } catch (error: any) {
    if (error.response) {
      console.error('Webhook failed with status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else {
      console.error('Request failed:', error.message);
    }
  }
}

simulateCrmWebhook();
