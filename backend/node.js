const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const basicAuth = require('express-basic-auth');
const { Pool } = require('pg');
require('dotenv').config({ path: './pass.env' });

console.log('ADMIN_USER:', process.env.ADMIN_USER);
console.log('ADMIN_PASS:', process.env.ADMIN_PASS);
console.log('DATABASE_URL:', process.env.DATABASE_URL);

if (!fs.existsSync('./public/uploads')) {
  fs.mkdirSync('./public/uploads', { recursive: true });
}

const app = express();

// Middleware to parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (put this before route handlers)
app.use(express.static('public'));

// Set up PostgreSQL connection pool to Supabase
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Set up multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './public/uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Serve used.html on root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'used.html'));
});

// GET all items
app.get('/api/items', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM items ORDER BY id DESC');
    console.log('GET /api/items returning', result.rows.length, 'items');
    res.set('Cache-Control', 'no-store'); // no cache
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching items:', err);
    res.status(500).json({ error: 'Error fetching items' });
  }
});

// POST new item with upload
app.post('/api/items', upload.single('photo'), async (req, res) => {
  const { title, description } = req.body;
  const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const result = await pool.query(
      'INSERT INTO items (title, description, photo_url) VALUES ($1, $2, $3) RETURNING *',
      [title, description, photoUrl]
    );
    console.log('Item added:', result.rows[0]);
    res.json({ message: 'Item added', item: result.rows[0] });
  } catch (err) {
    console.error('Error adding item:', err);
    res.status(500).json({ error: 'Error adding item' });
  }
});

// Basic Auth for admin routes (optional)
app.get('/admin.html', basicAuth({
  users: { [process.env.ADMIN_USER]: process.env.ADMIN_PASS },
  challenge: true,
  unauthorizedResponse: () => 'Unauthorized',
}), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// PUT update item
app.put('/api/items/:id', upload.single('photo'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid item ID' });

  const { title, description } = req.body;

  try {
    const existingResult = await pool.query('SELECT * FROM items WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    let photoUrl = existingResult.rows[0].photo_url;

    if (req.file) {
      if (photoUrl) {
        const oldPath = path.join(__dirname, 'public', photoUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      photoUrl = `/uploads/${req.file.filename}`;
    }

    const updatedResult = await pool.query(
      'UPDATE items SET title = $1, description = $2, photo_url = $3 WHERE id = $4 RETURNING *',
      [
        title || existingResult.rows[0].title,
        description || existingResult.rows[0].description,
        photoUrl,
        id,
      ]
    );

    console.log('Item updated:', updatedResult.rows[0]);
    res.json({ message: 'Item updated', item: updatedResult.rows[0] });
  } catch (err) {
    console.error('Error updating item:', err);
    res.status(500).json({ error: 'Error updating item' });
  }
});

// DELETE item
app.delete('/api/items/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid item ID' });

  try {
    const existingResult = await pool.query('SELECT * FROM items WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const photoUrl = existingResult.rows[0].photo_url;
    if (photoUrl) {
      const photoPath = path.join(__dirname, 'public', photoUrl);
      if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
    }

    await pool.query('DELETE FROM items WHERE id = $1', [id]);
    console.log('Item deleted:', id);
    res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error('Error deleting item:', err);
    res.status(500).json({ error: 'Error deleting item' });
  }
});

// Start server
app.listen(3000, () => console.log('Server started on http://localhost:3000'));
