const axios = require('axios');

const API_BASE_URL = 'https://product-conflicts-app.onrender.com/api';

async function cleanupResolvedConflicts() {
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
    
    console.log('📊 Getting all products to analyze resolved conflicts...');
    
    // Get all responsible persons
    const personsResponse = await api.get('/responsible-persons');
    const persons = personsResponse.data;
    
    console.log(`👥 Found ${persons.length} responsible persons`);
    
    let totalResolvedConflicts = 0;
    let deletedResolvedConflicts = 0;
    
    for (const person of persons) {
      console.log(`\n🔍 Processing products for ${person.responsible_person_name}...`);
      
      // Get products for this person
      const productsResponse = await api.get(`/products/${person.responsible_person_email}`);
      const products = productsResponse.data;
      
      console.log(`📦 Found ${products.length} products`);
      
      for (const product of products) {
        if (!product.conflicts || product.conflicts.length === 0) continue;
        
        for (const conflict of product.conflicts) {
          // Only process resolved conflicts
          if (!conflict.resolved_value) continue;
          
          totalResolvedConflicts++;
          
          const qualityLine = conflict.quality_line_value?.toString().trim();
          const attribute = conflict.attribute_value?.toString().trim();
          const resolvedValue = conflict.resolved_value?.toString().trim();
          const comment = conflict.comment?.toString().trim();
          
          // Check if this resolved conflict was actually a real conflict
          if (isRealConflict(qualityLine, attribute, resolvedValue, comment)) {
            console.log(`✅ Keeping resolved conflict ${conflict.id} (${conflict.conflict_type}): Real conflict`);
            console.log(`   Quality: "${qualityLine}" | Attribute: "${attribute}" | Resolved: "${resolvedValue}"`);
          } else {
            console.log(`❌ Deleting resolved conflict ${conflict.id} (${conflict.conflict_type}): Not a real conflict`);
            console.log(`   Quality: "${qualityLine}" | Attribute: "${attribute}" | Resolved: "${resolvedValue}"`);
            await deleteResolvedConflict(api, conflict.id);
            deletedResolvedConflicts++;
          }
        }
      }
    }
    
    console.log(`\n🎉 Resolved conflicts cleanup completed!`);
    console.log(`📊 Total resolved conflicts analyzed: ${totalResolvedConflicts}`);
    console.log(`🗑️ Resolved conflicts deleted: ${deletedResolvedConflicts}`);
    console.log(`✅ Real resolved conflicts kept: ${totalResolvedConflicts - deletedResolvedConflicts}`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.response?.data || error.message);
  }
}

function isRealConflict(qualityLine, attribute, resolvedValue, comment) {
  if (!qualityLine || !attribute) return false;
  
  // Check if the resolved value is "deleted" (meaning it was marked as non-conflict)
  if (resolvedValue === 'deleted') return false;
  
  // Check if comment indicates it was deleted as non-conflict
  if (comment && (
    comment.includes('not a real conflict') ||
    comment.includes('formatting/wording difference') ||
    comment.includes('not a conflict') ||
    comment.includes('missing data')
  )) {
    return false;
  }
  
  // Check if it's a formatting difference that was resolved
  if (isFormattingDifference(qualityLine, attribute)) {
    return false;
  }
  
  // Check if both values are essentially the same
  if (areValuesEquivalent(qualityLine, attribute)) {
    return false;
  }
  
  // If we get here, it's likely a real conflict
  return true;
}

function isFormattingDifference(qualityLine, attribute) {
  if (!qualityLine || !attribute) return false;
  
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

function areValuesEquivalent(qualityLine, attribute) {
  if (!qualityLine || !attribute) return false;
  
  // Remove common formatting differences
  const ql = qualityLine.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
  const attr = attribute.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
  
  return ql.trim() === attr.trim();
}

async function deleteResolvedConflict(api, conflictId) {
  try {
    // Delete the conflict entirely
    await api.delete(`/conflicts/${conflictId}`);
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`Conflict ${conflictId} already deleted, skipping...`);
    } else {
      console.error(`Failed to delete resolved conflict ${conflictId}:`, error.message);
    }
  }
}

cleanupResolvedConflicts();
