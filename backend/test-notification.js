import { signAccessToken } from './src/utils/jwt.js';

async function testSpcNotification() {
  // 1. Generate an SPC token
  const token = signAccessToken({ userId: 2, isSpc: true });
  
  console.log('--- Sending SPC Message ---');
  // 2. Make a request to the messages API
  const msgRes = await fetch('http://localhost:4000/api/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      messageText: 'Hello everyone! This is an important announcement.'
    })
  });
  
  if (msgRes.ok) {
    console.log('✅ Message API called successfully');
  } else {
    console.log('❌ Message API failed:', await msgRes.text());
  }

  console.log('\n--- Creating Company ---');
  // 3. Make a request to the companies API
  const compRes = await fetch('http://localhost:4000/api/companies', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Test Corp Notification Check',
      minCgpa: 7.5,
      stipend: '50k',
      package: '10 LPA',
      testDate: '2026-06-01T10:00:00.000Z',
      interviewDate: '2026-06-05T10:00:00.000Z',
      deadline: '2026-05-30T10:00:00.000Z'
    })
  });

  if (compRes.ok) {
    console.log('✅ Company API called successfully');
  } else {
    console.log('❌ Company API failed:', await compRes.text());
  }
}

testSpcNotification().catch(console.error);
