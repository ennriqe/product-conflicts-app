const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const API_BASE_URL = 'https://product-conflicts-app.onrender.com/api';

async function populateViaAPI() {
  try {
    console.log('🔐 Logging in...');
    
    // Login first
    const loginResponse = await axios.post(`${API_BASE_URL}/login`, {
      password: 'karsten2025'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully');
    
    // Set up axios with auth header
    const api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Checking current data...');
    const personsResponse = await api.get('/responsible-persons');
    console.log('👥 Current responsible persons:', personsResponse.data.length);
    
    if (personsResponse.data.length > 0) {
      console.log('✅ Database already has data!');
      console.log('📋 Responsible persons:', personsResponse.data.map(p => p.responsible_person_name));
      return;
    }
    
    console.log('📁 Uploading Excel file...');
    
    // Create form data for file upload
    const formData = new FormData();
    formData.append('file', fs.createReadStream('backend/results_conflict.xlsx'));
    
    // Upload Excel file
    const uploadResponse = await api.post('/upload-excel', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Excel file uploaded successfully!');
    console.log('📊 Processed rows:', uploadResponse.data.count);
    
    // Check the data again
    const finalPersonsResponse = await api.get('/responsible-persons');
    console.log('👥 Final responsible persons count:', finalPersonsResponse.data.length);
    console.log('📋 Responsible persons:', finalPersonsResponse.data.map(p => p.responsible_person_name));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

populateViaAPI();
