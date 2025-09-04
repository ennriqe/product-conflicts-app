const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const XLSX = require('xlsx');
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
        description TEXT,
        overall_reason TEXT,
        overall_equal BOOLEAN,
        responsible_person_name VARCHAR(100),
        responsible_person_email VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add description column if it doesn't exist (for existing databases)
    await pool.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS description TEXT
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

// Update a product
app.put('/api/products/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const { description } = req.body;
    
    const result = await pool.query(
      'UPDATE products SET description = $1 WHERE id = $2 RETURNING *',
      [description, productId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a conflict
app.delete('/api/conflicts/:conflictId', authenticateToken, async (req, res) => {
  try {
    const { conflictId } = req.params;
    
    // Delete resolution records first
    await pool.query('DELETE FROM resolutions WHERE conflict_id = $1', [conflictId]);
    
    // Delete the conflict
    const result = await pool.query('DELETE FROM conflicts WHERE id = $1', [conflictId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Conflict not found' });
    }
    
    res.json({ message: 'Conflict deleted successfully' });
  } catch (error) {
    console.error('Error deleting conflict:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a product
app.delete('/api/products/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Delete all conflicts for this product first
    await pool.query('DELETE FROM conflicts WHERE product_id = $1', [productId]);
    
    // Delete the product
    const result = await pool.query('DELETE FROM products WHERE id = $1', [productId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Export resolved conflicts to Excel
app.get('/api/export-excel', authenticateToken, async (req, res) => {
  try {
    console.log('Starting Excel export...');
    
    // Get all products with their conflicts and resolutions
    const productsQuery = `
      SELECT 
        p.id as product_id,
        p.item_number,
        p.description,
        p.category,
        c.id as conflict_id,
        c.conflict_type,
        c.reason,
        c.quality_line_value,
        c.attribute_value,
        r.resolved_value,
        r.comment,
        r.resolved_by,
        r.resolved_at
      FROM products p
      LEFT JOIN conflicts c ON p.id = c.product_id
      LEFT JOIN resolutions r ON c.id = r.conflict_id
      ORDER BY p.item_number, c.id
    `;
    
    console.log('Executing database query...');
    const result = await pool.query(productsQuery);
    const data = result.rows;
    console.log(`Found ${data.length} rows from database`);
    
    // Group data by product
    const productsMap = new Map();
    
    data.forEach(row => {
      const productId = row.product_id;
      
      if (!productsMap.has(productId)) {
        productsMap.set(productId, {
          item_number: row.item_number,
          description: row.description,
          category: row.category,
          conflicts: []
        });
      }
      
      if (row.conflict_id) {
        productsMap.get(productId).conflicts.push({
          conflict_type: row.conflict_type,
          reason: row.reason,
          quality_line_value: row.quality_line_value,
          attribute_value: row.attribute_value,
          resolved_value: row.resolved_value,
          comment: row.comment,
          resolved_by: row.resolved_by,
          resolved_at: row.resolved_at
        });
      }
    });
    
    console.log(`Grouped into ${productsMap.size} products`);
    
    // Convert to Excel format
    const excelData = [];
    
    // Add header row
    excelData.push([
      'Item Number',
      'Product Description',
      'Category',
      'Conflict Type',
      'Reason',
      'Quality Line Value',
      'Attribute Value',
      'Resolved Value',
      'Comment',
      'Resolved By',
      'Resolved At'
    ]);
    
    // Add data rows
    productsMap.forEach(product => {
      if (product.conflicts.length === 0) {
        // Product with no conflicts
        excelData.push([
          product.item_number,
          product.description,
          product.category,
          'No Conflicts',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]);
      } else {
        // Product with conflicts
        product.conflicts.forEach(conflict => {
          excelData.push([
            product.item_number,
            product.description,
            product.category,
            conflict.conflict_type,
            conflict.reason,
            conflict.quality_line_value,
            conflict.attribute_value,
            conflict.resolved_value || 'Unresolved',
            conflict.comment || '',
            conflict.resolved_by || '',
            conflict.resolved_at || ''
          ]);
        });
      }
    });
    
    console.log(`Created ${excelData.length} rows for Excel`);
    
    // Create Excel workbook
    console.log('Creating Excel workbook...');
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resolved Conflicts');
    
    // Generate Excel buffer
    console.log('Generating Excel buffer...');
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    console.log(`Excel buffer size: ${excelBuffer.length} bytes`);
    
    // Set response headers for file download
    const filename = `product-conflicts-export-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', excelBuffer.length);
    
    console.log('Sending Excel file...');
    // Send the Excel file
    res.send(excelBuffer);
    
  } catch (error) {
    console.error('Error exporting Excel:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
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
