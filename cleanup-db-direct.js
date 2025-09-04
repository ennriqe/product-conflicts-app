const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function cleanupDatabaseDirect() {
  try {
    console.log('🔧 Starting direct database cleanup...');
    
    // Get all conflicts
    const conflictsResult = await pool.query(`
      SELECT c.id, c.conflict_type, c.quality_line_value, c.attribute_value, c.reason
      FROM conflicts c
      ORDER BY c.id
    `);
    
    const conflicts = conflictsResult.rows;
    console.log(`📊 Found ${conflicts.length} total conflicts`);
    
    let deletedCount = 0;
    let keptCount = 0;
    
    for (const conflict of conflicts) {
      const qualityLine = conflict.quality_line_value?.toString().trim();
      const attribute = conflict.attribute_value?.toString().trim();
      
      let shouldDelete = false;
      let reason = '';
      
      // Check if both are empty or missing
      if (!qualityLine && !attribute) {
        shouldDelete = true;
        reason = 'Both values empty';
      }
      // Check if attribute is missing but quality line has data
      else if (qualityLine && (!attribute || 
          attribute === 'No value provided' || 
          attribute === 'Missing' || 
          attribute === '' ||
          attribute === 'null' ||
          attribute === 'undefined')) {
        shouldDelete = true;
        reason = 'Attribute missing - not a conflict';
      }
      // Check if quality line is missing but attribute has data
      else if (attribute && (!qualityLine || 
          qualityLine === 'No value provided' || 
          qualityLine === 'Missing' || 
          qualityLine === '' ||
          qualityLine === 'null' ||
          qualityLine === 'undefined')) {
        shouldDelete = true;
        reason = 'Quality line missing - not a conflict';
      }
      // Check if both values are identical
      else if (qualityLine && attribute && qualityLine === attribute) {
        shouldDelete = true;
        reason = 'Values are identical - no conflict';
      }
      
      if (shouldDelete) {
        console.log(`❌ Deleting conflict ${conflict.id} (${conflict.conflict_type}): ${reason}`);
        console.log(`   Quality: "${qualityLine}" | Attribute: "${attribute}"`);
        
        // Delete the conflict
        await pool.query('DELETE FROM conflicts WHERE id = $1', [conflict.id]);
        deletedCount++;
      } else {
        console.log(`✅ Keeping conflict ${conflict.id} (${conflict.conflict_type}): Real conflict`);
        console.log(`   Quality: "${qualityLine}" | Attribute: "${attribute}"`);
        keptCount++;
      }
    }
    
    console.log(`\n🎉 Database cleanup completed!`);
    console.log(`🗑️ Conflicts deleted: ${deletedCount}`);
    console.log(`✅ Real conflicts kept: ${keptCount}`);
    
    // Get final statistics
    const finalResult = await pool.query('SELECT COUNT(*) FROM conflicts');
    console.log(`📊 Total conflicts remaining: ${finalResult.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  } finally {
    await pool.end();
  }
}

cleanupDatabaseDirect();
