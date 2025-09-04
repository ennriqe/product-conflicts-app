const axios = require('axios');

const API_BASE_URL = 'https://product-conflicts-app.onrender.com/api';

async function advancedCleanup() {
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
          
          // Always delete Specifications conflicts
          if (conflict.conflict_type === 'Specifications') {
            console.log(`❌ Deleting conflict ${conflict.id} (${conflict.conflict_type}): Specifications not relevant`);
            await deleteConflict(api, conflict.id);
            deletedConflicts++;
            continue;
          }
          
          const qualityLine = conflict.quality_line_value?.toString().trim();
          const attribute = conflict.attribute_value?.toString().trim();
          const reason = conflict.reason?.toString().trim();
          
          // Skip if both are empty or missing
          if (!qualityLine && !attribute) {
            console.log(`❌ Deleting conflict ${conflict.id} (${conflict.conflict_type}): Both values empty`);
            await deleteConflict(api, conflict.id);
            deletedConflicts++;
            continue;
          }
          
          // Skip if one side is missing data
          if (qualityLine && (!attribute || attribute === 'No value provided' || attribute === 'Missing' || attribute === '')) {
            console.log(`❌ Deleting conflict ${conflict.id} (${conflict.conflict_type}): Attribute missing`);
            await deleteConflict(api, conflict.id);
            deletedConflicts++;
            continue;
          }
          
          if (attribute && (!qualityLine || qualityLine === 'No value provided' || qualityLine === 'Missing' || qualityLine === '')) {
            console.log(`❌ Deleting conflict ${conflict.id} (${conflict.conflict_type}): Quality line missing`);
            await deleteConflict(api, conflict.id);
            deletedConflicts++;
            continue;
          }
          
          // Check for formatting/wording differences vs real conflicts
          if (isFormattingDifference(qualityLine, attribute, reason)) {
            console.log(`❌ Deleting conflict ${conflict.id} (${conflict.conflict_type}): Formatting/wording difference`);
            console.log(`   Quality: "${qualityLine}" | Attribute: "${attribute}"`);
            await deleteConflict(api, conflict.id);
            deletedConflicts++;
            continue;
          }
          
          console.log(`✅ Keeping conflict ${conflict.id} (${conflict.conflict_type}): Real conflict`);
          console.log(`   Quality: "${qualityLine}" | Attribute: "${attribute}"`);
        }
      }
    }
    
    console.log(`\n🎉 Advanced cleanup completed!`);
    console.log(`📊 Total conflicts analyzed: ${totalConflicts}`);
    console.log(`🗑️ Conflicts deleted: ${deletedConflicts}`);
    console.log(`✅ Real conflicts remaining: ${totalConflicts - deletedConflicts}`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.response?.data || error.message);
  }
}

function isFormattingDifference(qualityLine, attribute, reason) {
  if (!qualityLine || !attribute) return false;
  
  // Check if reason mentions formatting/wording differences
  if (reason) {
    const formattingKeywords = [
      'wording', 'formatting', 'spacing', 'units', 'abbreviation',
      'expressed differently', 'same', 'equivalent', 'minor',
      'extra details', 'adds detail', 'only spacing', 'only differs',
      'wording differs', 'spacing difference', 'formatting difference'
    ];
    
    const reasonLower = reason.toLowerCase();
    if (formattingKeywords.some(keyword => reasonLower.includes(keyword))) {
      return true;
    }
  }
  
  // Check for unit conversions (same value, different units)
  if (isUnitConversion(qualityLine, attribute)) {
    return true;
  }
  
  // Check for spacing differences only
  if (isSpacingDifference(qualityLine, attribute)) {
    return true;
  }
  
  // Check for abbreviation differences only
  if (isAbbreviationDifference(qualityLine, attribute)) {
    return true;
  }
  
  return false;
}

function isUnitConversion(qualityLine, attribute) {
  // Extract numbers and check if they're the same with different units
  const qlNumbers = qualityLine.match(/\d+(?:\.\d+)?/g) || [];
  const attrNumbers = attribute.match(/\d+(?:\.\d+)?/g) || [];
  
  if (qlNumbers.length === 1 && attrNumbers.length === 1) {
    const qlNum = parseFloat(qlNumbers[0]);
    const attrNum = parseFloat(attrNumbers[0]);
    
    // Check for common unit conversions
    if (qlNum === attrNum) return true; // Same number
    if (qlNum * 1000 === attrNum) return true; // kg to g
    if (qlNum === attrNum * 1000) return true; // g to kg
    if (qlNum * 100 === attrNum) return true; // m to cm
    if (qlNum === attrNum * 100) return true; // cm to m
    if (qlNum * 10 === attrNum) return true; // cm to mm
    if (qlNum === attrNum * 10) return true; // mm to cm
  }
  
  return false;
}

function isSpacingDifference(qualityLine, attribute) {
  // Remove all spaces and compare
  const qlNoSpaces = qualityLine.replace(/\s+/g, '');
  const attrNoSpaces = attribute.replace(/\s+/g, '');
  
  return qlNoSpaces.toLowerCase() === attrNoSpaces.toLowerCase();
}

function isAbbreviationDifference(qualityLine, attribute) {
  // Check if one is just an abbreviation of the other
  const qlWords = qualityLine.toLowerCase().split(/\s+/);
  const attrWords = attribute.toLowerCase().split(/\s+/);
  
  // If one has significantly fewer words, it might be an abbreviation
  if (Math.abs(qlWords.length - attrWords.length) > 2) {
    return false;
  }
  
  // Check if all words in shorter version appear in longer version
  const shorter = qlWords.length <= attrWords.length ? qlWords : attrWords;
  const longer = qlWords.length > attrWords.length ? qlWords : attrWords;
  
  return shorter.every(word => longer.some(longWord => longWord.includes(word) || word.includes(longWord)));
}

async function deleteConflict(api, conflictId) {
  try {
    // Mark the conflict as deleted by resolving it with a special "deleted" value
    await api.post('/resolve-conflict', {
      conflictId: conflictId,
      selectedValue: 'deleted',
      comment: 'Automatically deleted - formatting/wording difference, not a real conflict',
      resolvedBy: 'System Advanced Cleanup'
    });
  } catch (error) {
    console.error(`Failed to delete conflict ${conflictId}:`, error.message);
  }
}

advancedCleanup();
