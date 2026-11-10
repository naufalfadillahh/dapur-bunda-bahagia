const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const db = require('./db');
require('dotenv').config();

const app = express();
const upload = multer({ dest: 'ASET/' });
app.use(cors());
app.use(express.json());
app.use('/ASET', express.static(path.join(__dirname, 'ASET')));
app.use(express.static('.')); // Serve static files like index.html, ASET/

// Populate products table with menu items if not exist
const menuItems = [
  { id: 1, name: 'Nasi Goreng', price: 25000, category: 'Makanan', image_path: 'ASET/nasgor.avif' },
  { id: 2, name: 'Ayam Bakar', price: 30000, category: 'Makanan', image_path: 'ASET/ayambakar.jpg' },
  { id: 3, name: 'Es Teh', price: 5000, category: 'Minuman', image_path: 'ASET/esteh.webp' },
  { id: 4, name: 'Mie Goreng', price: 22000, category: 'Makanan', image_path: 'ASET/miegoreng.jpeg' },
  { id: 5, name: 'Jus Jeruk', price: 8000, category: 'Minuman', image_path: 'ASET/jusjeruk.jpg' },
  { id: 6, name: 'Soto Ayam', price: 28000, category: 'Makanan', image_path: 'ASET/sotoayam.jpg' },
  { id: 7, name: 'Kentang Goreng', price: 15000, category: 'Appetizer', image_path: 'ASET/kentanggoreng.jpg' },
];

menuItems.forEach(item => {
  // First try to update existing product
  db.query('UPDATE products SET category = ? WHERE id = ?',
    [item.category, item.id], (err, result) => {
      if (err) console.error('Error updating product:', err);
      // If no rows were updated, insert new product
      if (result && result.affectedRows === 0) {
        db.query('INSERT IGNORE INTO products (id, name, price, category, stock_quantity, image_path) VALUES (?, ?, ?, ?, ?, ?)',
          [item.id, item.name, item.price, item.category, 100, item.image_path], (err) => {
            if (err) console.error('Error inserting product:', err);
          });
      }
    });
});

// Routes

// Get all products
app.get('/api/products', (req, res) => {
  db.query('SELECT id, name, price, category, stock_quantity, image_path FROM products', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Add new product
app.post('/api/products', upload.single('image'), (req, res) => {
  const { name, price, category, stock_quantity } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Name is required' });
  }
  const parsedPrice = parseFloat(price);
  if (isNaN(parsedPrice) || parsedPrice <= 0) {
    return res.status(400).json({ error: 'Valid price is required' });
  }
  const parsedStock = parseInt(stock_quantity);
  if (isNaN(parsedStock) || parsedStock < 0) {
    return res.status(400).json({ error: 'Valid non-negative stock quantity is required' });
  }
  const image_path = req.file ? `ASET/${req.file.filename}` : null;
  if (req.file && !req.file.mimetype.startsWith('image/')) {
    return res.status(400).json({ error: 'Only image files are allowed' });
  }
  db.query('INSERT INTO products (name, price, category, stock_quantity, image_path) VALUES (?, ?, ?, ?, ?)',
    [name.trim(), parsedPrice, category || 'Makanan', parsedStock, image_path], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Product added successfully', id: result.insertId });
    });
});

// Delete product
app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  db.query('SELECT image_path FROM products WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Product not found' });
    const image_path = results[0].image_path;
    db.query('DELETE FROM products WHERE id = ?', [id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      if (image_path && fs.existsSync(image_path)) {
        fs.unlinkSync(image_path);
      }
      res.json({ message: 'Product deleted successfully' });
    });
  });
});

// Update product
app.put('/api/products/:id', upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { name, price, category, stock_quantity } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Name is required' });
  }
  const image_path = req.file ? `ASET/${req.file.filename}` : null;
  if (req.file && !req.file.mimetype.startsWith('image/')) {
    return res.status(400).json({ error: 'Only image files are allowed' });
  }

  // Get current image_path to delete if new image uploaded
  db.query('SELECT image_path FROM products WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Product not found' });
    const oldImagePath = results[0].image_path;

    const updateFields = [];
    const updateValues = [];
    if (name) { 
      updateFields.push('name = ?'); 
      updateValues.push(name.trim()); 
    }
    if (price !== undefined && price !== '') { 
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({ error: 'Valid price is required if provided' });
      }
      updateFields.push('price = ?'); 
      updateValues.push(parsedPrice); 
    }
    if (category !== undefined && category !== '') { 
      updateFields.push('category = ?'); 
      updateValues.push(category); 
    }
    if (stock_quantity !== undefined && stock_quantity !== '') { 
      const parsedStock = parseInt(stock_quantity);
      if (isNaN(parsedStock) || parsedStock < 0) {
        return res.status(400).json({ error: 'Valid non-negative stock quantity is required if provided' });
      }
      updateFields.push('stock_quantity = ?'); 
      updateValues.push(parsedStock); 
    }
    if (image_path) { 
      updateFields.push('image_path = ?'); 
      updateValues.push(image_path); 
    }

    if (updateFields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const query = `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`;
    updateValues.push(id);

    db.query(query, updateValues, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found' });
      // Delete old image if new one uploaded
      if (image_path && oldImagePath && fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
      res.json({ message: 'Product updated successfully' });
    });
  });
});

// Create order
app.post('/api/orders', (req, res) => {
  const { items, totalAmount, paymentMethod } = req.body;
  const query = 'INSERT INTO orders (total_amount, payment_method, status) VALUES (?, ?, ?)';
  db.query(query, [totalAmount, paymentMethod, 'completed'], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    const orderId = result.insertId;
    // Insert order items
    const itemQueries = items.map(item => {
      return new Promise((resolve, reject) => {
        db.query('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
          [orderId, item.id, item.quantity || 1, item.price], (err) => {
            if (err) reject(err);
            else resolve();
          });
      });
    });
    Promise.all(itemQueries).then(() => {
      // Update stock for each product
      const stockUpdates = items.map(item => {
        return new Promise((resolve, reject) => {
          db.query('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [item.quantity || 1, item.id], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      });
      Promise.all(stockUpdates).then(() => {
        res.json({ message: 'Order created and completed', orderId });
      }).catch(err => res.status(500).json({ error: err.message }));
    }).catch(err => res.status(500).json({ error: err.message }));
  });
});

// Update stock
app.put('/api/stock', (req, res) => {
  const { id, stock_quantity } = req.body;
  db.query('UPDATE products SET stock_quantity = ? WHERE id = ?', [stock_quantity, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Stock updated' });
  });
});

// Get reports
app.get('/api/reports', (req, res) => {
  const { period } = req.query; // 'week' or 'month'
  let dateCondition = period === 'week' ? 'DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 1 WEEK)' : 'DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)';
  const query = `
    SELECT DATE(created_at) as date, SUM(total_amount) as total_sales, COUNT(*) as order_count
    FROM orders
    WHERE ${dateCondition} AND status = 'completed'
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    // Format date to YYYY-MM-DD only
    results.forEach(result => {
      result.date = result.date.toISOString().split('T')[0];
    });
    res.json(results);
  });
});

// Get all orders with items
app.get('/api/orders', (req, res) => {
  const query = `
    SELECT o.id, o.total_amount, o.payment_method, o.status, o.created_at,
           oi.product_id, oi.quantity, oi.price, p.name as product_name
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN products p ON oi.product_id = p.id
    ORDER BY o.created_at DESC
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    const orders = {};
    results.forEach(row => {
      if (!orders[row.id]) {
        orders[row.id] = {
          id: row.id,
          total_amount: row.total_amount,
          payment_method: row.payment_method,
          status: row.status,
          created_at: row.created_at,
          items: []
        };
      }
      if (row.product_id) {
        orders[row.id].items.push({
          product_id: row.product_id,
          name: row.product_name,
          quantity: row.quantity,
          price: row.price
        });
      }
    });
    res.json(Object.values(orders));
  });
});

// Complete order (add to report)
app.put('/api/orders/:id/complete', (req, res) => {
  const { id } = req.params;
  const query = 'UPDATE orders SET status = ? WHERE id = ?';
  db.query(query, ['completed', id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order completed and added to report' });
  });
});

// Reset reports: delete all order_items and orders to clear history and reports
app.put('/api/reports/reset', (req, res) => {
  // First, delete all order_items
  db.query('DELETE FROM order_items', (err) => {
    if (err) return res.status(500).json({ error: err.message });

    // Then, delete all orders
    db.query('DELETE FROM orders', (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({ message: 'Reset successful. All orders and items deleted. Reports cleared.' });
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
