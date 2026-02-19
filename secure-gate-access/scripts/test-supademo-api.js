const axios = require('axios');

const API_KEY = 'd2005859362b0af9edc2c4463f9bfe6edea6cd2196f65338e60641973b1f17d0';

async function testApiKey() {
    try {
        console.log('Testing Supademo API Key...');
        const response = await axios.get('https://app.supademo.com/api/v1/workspaces', {
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            }
        });
        console.log('API Response Status:', response.status);
        console.log('Workspaces:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        if (error.response) {
            console.error('API Error:', error.response.status, error.response.data);
            // Try Zapier verify endpoint if v1/workspaces fails
            try {
                console.log('Trying Zapier verify endpoint...');
                const zapierResponse = await axios.get('https://app.supademo.com/api/integration/zapier/me', {
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`
                    }
                });
                console.log('Zapier Response Status:', zapierResponse.status);
                console.log('Zapier Me:', JSON.stringify(zapierResponse.data, null, 2));
            } catch (zapError) {
                console.error('Zapier Error:', zapError.response ? zapError.response.status : zapError.message);
            }
        } else {
            console.error('Request Error:', error.message);
        }
    }
}

testApiKey();
