const axios = require('axios');

const API_BASE_URL = 'https://product-conflicts-app.onrender.com/api';

async function cleanupAllResolved() {
  try {
    // Login first
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${API_BASE_URL}/login`, {
      password: 'karsten2025'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully');
    
    // Get all responsible persons
    const personsResponse = await axios.get(`${API_BASE_URL}/responsible-persons`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const persons = personsResponse.data;
    console.log(`👥 Found ${persons.length} responsible persons`);
    
    let totalDeleted = 0;
    
    for (const person of persons) {
      console.log(`\n📦 Processing ${person.responsible_person_name}...`);
      
      // Get products for this person
      const productsResponse = await axios.get(`${API_BASE_URL}/products/${person.responsible_person_email}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const products = productsResponse.data;
      console.log(`   Found ${products.length} products`);
      
      // Find all resolved conflicts
      const resolvedConflicts = [];
      products.forEach(product => {
        if (product.conflicts) {
          product.conflicts.forEach(conflict => {
            if (conflict.resolved_value) {
              resolvedConflicts.push(conflict);
            }
          });
        }
      });
      
      console.log(`   Found ${resolvedConflicts.length} resolved conflicts`);
      
      // Delete each resolved conflict
      for (const conflict of resolvedConflicts) {
        try {
          await axios.delete(`${API_BASE_URL}/conflicts/${conflict.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          totalDeleted++;
          
          if (totalDeleted % 50 === 0) {
            console.log(`   Deleted ${totalDeleted} conflicts so far...`);
          }
        } catch (error) {
          if (error.response?.status === 404) {
            // Conflict already deleted, skip
            continue;
          } else {
            console.error(`   ❌ Error deleting conflict ${conflict.id}:`, error.message);
          }
        }
      }
      
      console.log(`   ✅ Completed ${person.responsible_person_name}`);
    }
    
    console.log(`\n🎉 Cleanup complete! Deleted ${totalDeleted} resolved conflicts.`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

cleanupAllResolved();
