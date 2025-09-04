const { Pool } = require('pg');
const XLSX = require('xlsx');
require('dotenv').config({ path: '.env.local' });

// Load database URL from environment variable
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://product_conflicts_db_user:YOUR_DATABASE_PASSWORD@dpg-d2ssre95pdvs738vdm0g-a.oregon-postgres.render.com:5432/product_conflicts_db?sslmode=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function setupDatabase() {
  try {
    console.log('🔧 Setting up database tables...');
    
    // Create products table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        item_number VARCHAR(50) UNIQUE NOT NULL,
        category VARCHAR(100),
        overall_reason TEXT,
        overall_equal BOOLEAN,
        responsible_person_name VARCHAR(100),
        responsible_person_email VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create conflicts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conflicts (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id),
        conflict_type VARCHAR(100) NOT NULL,
        quality_line_value TEXT,
        attribute_value TEXT,
        reason TEXT,
        is_equal BOOLEAN,
        resolved_value TEXT,
        resolution_comment TEXT,
        resolved_by VARCHAR(100),
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create resolutions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS resolutions (
        id SERIAL PRIMARY KEY,
        conflict_id INTEGER REFERENCES conflicts(id),
        selected_value TEXT NOT NULL,
        comment TEXT,
        resolved_by VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database tables created successfully!');
    
    // Check if data already exists
    const existingProducts = await pool.query('SELECT COUNT(*) FROM products');
    if (existingProducts.rows[0].count > 0) {
      console.log(`📊 Database already contains ${existingProducts.rows[0].count} products`);
      console.log('💡 To repopulate, first run: DELETE FROM resolutions; DELETE FROM conflicts; DELETE FROM products;');
      return;
    }

    console.log('📁 Reading Excel file...');
    
    // Read Excel file
    const workbook = XLSX.readFile('backend/results_conflict.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Found ${data.length} rows in Excel file`);

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row.item_number) continue;

      console.log(`🔄 Processing item ${row.item_number} (${i + 1}/${data.length})`);

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

    console.log('🎉 Database population completed successfully!');
    
    // Get some statistics
    const productCount = await pool.query('SELECT COUNT(*) FROM products');
    const conflictCount = await pool.query('SELECT COUNT(*) FROM conflicts');
    const personCount = await pool.query('SELECT COUNT(DISTINCT responsible_person_email) FROM products');
    
    console.log(`\n📈 Statistics:`);
    console.log(`   Products: ${productCount.rows[0].count}`);
    console.log(`   Conflicts: ${conflictCount.rows[0].count}`);
    console.log(`   Responsible persons: ${personCount.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    if (error.message.includes('YOUR_DATABASE_PASSWORD')) {
      console.log('\n💡 To fix this:');
      console.log('1. Go to your Render dashboard');
      console.log('2. Click on your database');
      console.log('3. Copy the connection string');
      console.log('4. Replace YOUR_DATABASE_PASSWORD in this file with the actual password');
      console.log('5. Run: node setup-database.js');
    }
  } finally {
    await pool.end();
  }
}

setupDatabase();
