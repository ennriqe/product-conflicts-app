const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
async function initializeDatabase() {
  try {
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

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'karsten2025_secret_key';

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { password } = req.body;
  
  if (password === 'karsten2025') {
    const token = jwt.sign({ user: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, message: 'Login successful' });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// Get all responsible persons
app.get('/api/responsible-persons', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT responsible_person_name, responsible_person_email 
      FROM products 
      WHERE responsible_person_name IS NOT NULL 
      ORDER BY responsible_person_name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching responsible persons:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get products for a specific responsible person
app.get('/api/products/:email', authenticateToken, async (req, res) => {
  try {
    const { email } = req.params;
    
    const productsResult = await pool.query(`
      SELECT p.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', c.id,
                   'conflict_type', c.conflict_type,
                   'quality_line_value', c.quality_line_value,
                   'attribute_value', c.attribute_value,
                   'reason', c.reason,
                   'is_equal', c.is_equal,
                   'resolved_value', c.resolved_value,
                   'resolution_comment', c.resolution_comment,
                   'resolved_by', c.resolved_by,
                   'resolved_at', c.resolved_at
                 )
               ) FILTER (WHERE c.id IS NOT NULL), 
               '[]'
             ) as conflicts
      FROM products p
      LEFT JOIN conflicts c ON p.id = c.product_id
      WHERE p.responsible_person_email = $1
      GROUP BY p.id, p.item_number, p.category, p.overall_reason, p.overall_equal, 
               p.responsible_person_name, p.responsible_person_email, p.created_at
      ORDER BY p.item_number
    `, [email]);

    res.json(productsResult.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resolve a conflict
app.post('/api/resolve-conflict', authenticateToken, async (req, res) => {
  try {
    const { conflictId, selectedValue, comment, resolvedBy } = req.body;
    
    // Update the conflict with resolution
    await pool.query(`
      UPDATE conflicts 
      SET resolved_value = $1, resolution_comment = $2, resolved_by = $3, resolved_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [selectedValue, comment, resolvedBy, conflictId]);

    // Insert resolution record
    await pool.query(`
      INSERT INTO resolutions (conflict_id, selected_value, comment, resolved_by)
      VALUES ($1, $2, $3, $4)
    `, [conflictId, selectedValue, comment, resolvedBy]);

    res.json({ message: 'Conflict resolved successfully' });
  } catch (error) {
    console.error('Error resolving conflict:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload and process Excel file
app.post('/api/upload-excel', authenticateToken, multer({ dest: 'uploads/' }).single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read Excel file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Clear existing data
    await pool.query('DELETE FROM conflicts');
    await pool.query('DELETE FROM products');

    // Process each row
    for (const row of data) {
      if (!row.item_number) continue;

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

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({ message: 'Excel file processed successfully', count: data.length });
  } catch (error) {
    console.error('Error processing Excel file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root endpoint for debugging
app.get('/', (req, res) => {
  res.json({ 
    message: 'Product Conflicts Backend API', 
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: ['/api/health', '/api/login', '/api/responsible-persons', '/api/products/:email']
  });
});

// Initialize database and start server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

module.exports = app;
