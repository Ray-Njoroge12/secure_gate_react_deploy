import axios from 'axios';

const testValidation = async () => {
    const API_URL = 'http://localhost:3001/api/public/visitors/vst_123456789012345678901234/confirm';

    const payload = {
        consent: {
            dataProcessing: true,
            privacyPolicy: true,
            marketing: false
        },
        additionalInfo: {
            purpose: 'Personal Visit',
            vehiclePlate: 'KAA 123A',
            idNumber: '12345678'
        }
    };

    try {
        console.log('Sending payload to validation test...');
        const response = await axios.post(API_URL, payload);
        console.log('Response:', response.data);
    } catch (error) {
        console.error('Validation failed as expected or unexpected error:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error message:', error.message);
        }
    }
};

testValidation();
