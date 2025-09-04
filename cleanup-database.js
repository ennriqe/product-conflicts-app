const axios = require('axios');

const API_BASE_URL = 'https://product-conflicts-app.onrender.com/api';

async function cleanupDatabase() {
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
    
    console.log('📊 Getting all products to analyze conflicts...');
    
    // Get all responsible persons
    const personsResponse = await api.get('/responsible-persons');
    const persons = personsResponse.data;
    
    console.log(`👥 Found ${persons.length} responsible persons`);
    
    let totalConflicts = 0;
    let deletedConflicts = 0;
    
    for (const person of persons) {
      console.log(`\n🔍 Processing products for ${person.responsible_person_name}...`);
      
      // Get products for this person
      const productsResponse = await api.get(`/products/${person.responsible_person_email}`);
      const products = productsResponse.data;
      
      console.log(`📦 Found ${products.length} products`);
      
      for (const product of products) {
        if (!product.conflicts || product.conflicts.length === 0) continue;
        
        for (const conflict of product.conflicts) {
          totalConflicts++;
          
          // Check if this is a non-conflict (missing data)
          const qualityLine = conflict.quality_line_value?.toString().trim();
          const attribute = conflict.attribute_value?.toString().trim();
          
          // Skip if both are empty or missing
          if (!qualityLine && !attribute) {
            console.log(`❌ Deleting conflict ${conflict.id} (${conflict.conflict_type}): Both values empty`);
            await deleteConflict(api, conflict.id);
            deletedConflicts++;
            continue;
          }
          
          // Skip if attribute is missing/empty but quality line has data (this is just missing data, not a conflict)
          if (qualityLine && (!attribute || 
              attribute === 'No value provided' || 
              attribute === 'Missing' || 
              attribute === '' ||
              attribute === 'null' ||
              attribute === 'undefined')) {
            console.log(`❌ Deleting conflict ${conflict.id} (${conflict.conflict_type}): Attribute missing - Quality: "${qualityLine}", Attribute: "${attribute}"`);
            await deleteConflict(api, conflict.id);
            deletedConflicts++;
            continue;
          }
          
          // Skip if quality line is missing/empty but attribute has data (this is just missing data, not a conflict)
          if (attribute && (!qualityLine || 
              qualityLine === 'No value provided' || 
              qualityLine === 'Missing' || 
              qualityLine === '' ||
              qualityLine === 'null' ||
              qualityLine === 'undefined')) {
            console.log(`❌ Deleting conflict ${conflict.id} (${conflict.conflict_type}): Quality line missing - Quality: "${qualityLine}", Attribute: "${attribute}"`);
            await deleteConflict(api, conflict.id);
            deletedConflicts++;
            continue;
          }
          
          // Skip if both values are the same (no actual conflict)
          if (qualityLine && attribute && qualityLine === attribute) {
            console.log(`❌ Deleting conflict ${conflict.id} (${conflict.conflict_type}): Values are identical - "${qualityLine}"`);
            await deleteConflict(api, conflict.id);
            deletedConflicts++;
            continue;
          }
        }
      }
    }
    
    console.log(`\n🎉 Cleanup completed!`);
    console.log(`📊 Total conflicts analyzed: ${totalConflicts}`);
    console.log(`🗑️ Conflicts deleted: ${deletedConflicts}`);
    console.log(`✅ Real conflicts remaining: ${totalConflicts - deletedConflicts}`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.response?.data || error.message);
  }
}

async function deleteConflict(api, conflictId) {
  try {
    // Mark the conflict as deleted by resolving it with a special "deleted" value
    await api.post('/resolve-conflict', {
      conflictId: conflictId,
      selectedValue: 'deleted',
      comment: 'Automatically deleted - not a real conflict (missing data)',
      resolvedBy: 'System Cleanup'
    });
  } catch (error) {
    console.error(`Failed to delete conflict ${conflictId}:`, error.message);
  }
}

cleanupDatabase();
