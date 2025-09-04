const axios = require('axios');

const API_BASE_URL = 'https://product-conflicts-app.onrender.com/api';

async function checkResolvedConflicts() {
  try {
    // Login first
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${API_BASE_URL}/login`, {
      password: 'karsten2025'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully');
    
    // Get all products
    console.log('📊 Fetching products...');
    const productsResponse = await axios.get(`${API_BASE_URL}/products/remko.bekker@example.com`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const products = productsResponse.data;
    console.log(`📦 Found ${products.length} products`);
    
    let totalConflicts = 0;
    let resolvedConflicts = 0;
    let unresolvedConflicts = 0;
    let productsWithResolved = 0;
    
    console.log('\n🔍 Analyzing conflicts...\n');
    
    products.forEach(product => {
      const conflicts = product.conflicts || [];
      totalConflicts += conflicts.length;
      
      const resolved = conflicts.filter(c => c.resolved_value);
      const unresolved = conflicts.filter(c => !c.resolved_value);
      
      resolvedConflicts += resolved.length;
      unresolvedConflicts += unresolved.length;
      
      if (resolved.length > 0) {
        productsWithResolved++;
        console.log(`📋 Product #${product.item_number}:`);
        console.log(`   - Total conflicts: ${conflicts.length}`);
        console.log(`   - Resolved: ${resolved.length}`);
        console.log(`   - Unresolved: ${unresolved.length}`);
        
        // Show some examples of resolved conflicts
        resolved.slice(0, 3).forEach(conflict => {
          console.log(`   - Resolved: ${conflict.conflict_type} | "${conflict.quality_line_value}" vs "${conflict.attribute_value}" -> "${conflict.resolved_value}"`);
        });
        if (resolved.length > 3) {
          console.log(`   - ... and ${resolved.length - 3} more resolved conflicts`);
        }
        console.log('');
      }
    });
    
    console.log('📊 SUMMARY:');
    console.log(`   - Total products: ${products.length}`);
    console.log(`   - Products with resolved conflicts: ${productsWithResolved}`);
    console.log(`   - Total conflicts: ${totalConflicts}`);
    console.log(`   - Resolved conflicts: ${resolvedConflicts}`);
    console.log(`   - Unresolved conflicts: ${unresolvedConflicts}`);
    
    if (resolvedConflicts > 0) {
      console.log('\n⚠️  WARNING: There are still resolved conflicts in the database!');
      console.log('   These should have been deleted by the cleanup scripts.');
    } else {
      console.log('\n✅ No resolved conflicts found - database is clean!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

checkResolvedConflicts();
