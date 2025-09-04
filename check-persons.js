const axios = require('axios');

const API_BASE_URL = 'https://product-conflicts-app.onrender.com/api';

async function checkPersons() {
  try {
    // Login first
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${API_BASE_URL}/login`, {
      password: 'karsten2025'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully');
    
    // Get responsible persons
    console.log('👥 Fetching responsible persons...');
    const personsResponse = await axios.get(`${API_BASE_URL}/responsible-persons`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const persons = personsResponse.data;
    console.log(`👥 Found ${persons.length} responsible persons:`);
    
    persons.forEach(person => {
      console.log(`   - ${person.responsible_person_name} (${person.responsible_person_email})`);
    });
    
    // Check products for each person
    console.log('\n📊 Checking products for each person...\n');
    
    for (const person of persons) {
      try {
        const productsResponse = await axios.get(`${API_BASE_URL}/products/${person.responsible_person_email}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const products = productsResponse.data;
        console.log(`📦 ${person.responsible_person_name}: ${products.length} products`);
        
        if (products.length > 0) {
          let totalConflicts = 0;
          let resolvedConflicts = 0;
          let unresolvedConflicts = 0;
          
          products.forEach(product => {
            const conflicts = product.conflicts || [];
            totalConflicts += conflicts.length;
            resolvedConflicts += conflicts.filter(c => c.resolved_value).length;
            unresolvedConflicts += conflicts.filter(c => !c.resolved_value).length;
          });
          
          console.log(`   - Total conflicts: ${totalConflicts}`);
          console.log(`   - Resolved: ${resolvedConflicts}`);
          console.log(`   - Unresolved: ${unresolvedConflicts}`);
        }
      } catch (error) {
        console.log(`   ❌ Error fetching products: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

checkPersons();
