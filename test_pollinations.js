const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testPollinations() {
    try {
        const response = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'Say hello' }],
                model: 'openai'
            })
        });
        
        console.log('Status:', response.status);
        console.log('Content-Type:', response.headers.get('content-type'));
        const text = await response.text();
        console.log('Body Start:', text.substring(0, 100));
    } catch (e) {
        console.error(e);
    }
}

testPollinations();
