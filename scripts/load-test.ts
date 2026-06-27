import axios from 'axios';

async function runLoadTest() {
  const webhookUrl = 'http://localhost:3000/api/webhooks/crm';
  const token = 'test-token';
  const numRequests = 50; // Simulate 50 concurrent incoming CRM leads
  const startTime = Date.now();

  console.log(`Starting load test with ${numRequests} concurrent lead injections...`);

  const requests = Array.from({ length: numRequests }).map((_, i) => {
    const payload = {
      firstName: `PerfUser${i}`,
      lastName: 'LoadTest',
      email: `perfuser${i}@example.com`,
      phone: `+1555000${String(i).padStart(4, '0')}`,
      company: 'LoadTest Corp',
      source: 'Performance Simulation',
      customFields: {
         need: 'High volume capacity validation'
      }
    };

    return axios.post(webhookUrl, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }).then(res => ({ success: true, data: res.data }))
      .catch(err => ({ success: false, status: err.response?.status || 500 }));
  });

  const results = await Promise.all(requests);
  const endTime = Date.now();

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\n--- Load Test Results ---`);
  console.log(`Total Requests : ${numRequests}`);
  console.log(`Successful     : ${successful}`);
  console.log(`Failed         : ${failed}`);
  console.log(`Total Time     : ${endTime - startTime}ms`);
  console.log(`Throughput     : ${((numRequests / (endTime - startTime)) * 1000).toFixed(2)} req/sec`);

  if (failed > 0) {
     console.error('Some requests failed. Check database locks or webhook listener logic.');
     process.exit(1);
  } else {
     console.log('All simulated leads successfully ingested.');
  }
}

runLoadTest();
