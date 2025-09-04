const { Pool } = require('pg');
const XLSX = require('xlsx');
const fs = require('fs');

// Database connection - you'll need to replace this with your actual database URL
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://product_conflicts_db_user:password@dpg-d2ssre95pdvs738vdm0g-a:5432/product_conflicts_db';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function populateDatabase() {
  try {
    console.log('Starting database population...');
    
    // Read Excel file
    const workbook = XLSX.readFile('backend/results_conflict.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Found ${data.length} rows in Excel file`);

    // Clear existing data
    await pool.query('DELETE FROM resolutions');
    await pool.query('DELETE FROM conflicts');
    await pool.query('DELETE FROM products');

    console.log('Cleared existing data');

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row.item_number) continue;

      console.log(`Processing item ${row.item_number} (${i + 1}/${data.length})`);

      // Insert product
      const productResult = await pool.query(`
        INSERT INTO products (item_number, category, overall_reason, overall_equal, responsible_person_name, responsible_person_email)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        row.item_number,
        row.category,
        row.overall_reason,
        row.overall_equal === 'Yes',
        row.Name,
        row.Email
      ]);

      const productId = productResult.rows[0].id;

      // Process conflicts for each attribute
      const conflictTypes = [
        'Color/Scent/Flavor or any form of variant/assortis',
        'Size',
        'Capacity',
        'Weight',
        'Material',
        'Light Color',
        'Modes/Settings',
        'Content',
        'Specifications',
        'Description',
        'Packaging',
        'Printing',
        'Battery',
        'Power',
        'Input',
        'Output',
        'Voltage',
        'Charging Time',
        'Use Time',
        'Cable/Connector',
        'Waterproof Rating',
        'Compatibility',
        'Temperature/Heating',
        'Solar Specs'
      ];

      for (const conflictType of conflictTypes) {
        const qualityLineKey = `${conflictType} (quality_lines)`;
        const attributeKey = `${conflictType} (attributes)`;
        const equalKey = `${conflictType} equal`;
        const reasonKey = `${conflictType} reason`;

        if (row[qualityLineKey] || row[attributeKey]) {
          await pool.query(`
            INSERT INTO conflicts (product_id, conflict_type, quality_line_value, attribute_value, reason, is_equal)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            productId,
            conflictType,
            row[qualityLineKey] || null,
            row[attributeKey] || null,
            row[reasonKey] || null,
            row[equalKey] === 'Yes'
          ]);
        }
      }
    }

    console.log('Database population completed successfully!');
    
    // Get some statistics
    const productCount = await pool.query('SELECT COUNT(*) FROM products');
    const conflictCount = await pool.query('SELECT COUNT(*) FROM conflicts');
    const personCount = await pool.query('SELECT COUNT(DISTINCT responsible_person_email) FROM products');
    
    console.log(`\nStatistics:`);
    console.log(`- Products: ${productCount.rows[0].count}`);
    console.log(`- Conflicts: ${conflictCount.rows[0].count}`);
    console.log(`- Responsible persons: ${personCount.rows[0].count}`);

  } catch (error) {
    console.error('Error populating database:', error);
  } finally {
    await pool.end();
  }
}

populateDatabase();
