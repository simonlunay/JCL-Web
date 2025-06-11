const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: './pass.env' });

console.log('ADMIN_USER:', process.env.ADMIN_USER);
console.log('ADMIN_PASS:', process.env.ADMIN_PASS);

if (!fs.existsSync('./public/uploads')) {
  fs.mkdirSync('./public/uploads', { recursive: true });
}

const app = express();
const DATA_FILE = './items.json';

// Serve admin.html on root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'used.html'));
});

// Set up multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });



// Parse JSON bodies
app.use(express.json());

// Helper functions
function readItems() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE));
}
function saveItems(items) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));
}

// GET all items with cache control header to prevent caching
app.get('/api/items', (req, res) => {
  const items = readItems();
  console.log('GET /api/items returning', items.length, 'items');
  res.set('Cache-Control', 'no-store');  // IMPORTANT: no cache
  res.json(items);
});

// POST new item with upload
app.post('/api/items', upload.single('photo'), (req, res) => {
  console.log('POST /api/items called');
  const items = readItems();

  const newItem = {
    id: Date.now(),
    title: req.body.title,
    description: req.body.description,
    price: parseFloat(req.body.price),
    photoUrl: req.file ? `/uploads/${req.file.filename}` : null,
  };

  items.push(newItem);
  saveItems(items);
  console.log('Item added:', newItem);
  res.json({ message: 'Item added', item: newItem });
});

// Basic Auth for admin routes (optional)
const basicAuth = require('express-basic-auth');

app.get('/admin', basicAuth({
  users: { [process.env.ADMIN_USER]: process.env.ADMIN_PASS },
  challenge: true,
  unauthorizedResponse: () => 'Unauthorized',
  
}), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use(express.static('public'));
// PUT update item
app.put('/api/items/:id', upload.single('photo'), (req, res) => {
  console.log(`PUT /api/items/${req.params.id} called`);
  const items = readItems();
  const id = parseInt(req.params.id);
  const index = items.findIndex(i => i.id === id);
  if (index === -1) return res.status(404).json({ error: 'Item not found' });

  items[index].title = req.body.title || items[index].title;
  items[index].description = req.body.description || items[index].description;
  items[index].price = req.body.price ? parseFloat(req.body.price) : items[index].price;

  if (req.file) {
    if (items[index].photoUrl) {
      const oldPath = path.join(__dirname, 'public', items[index].photoUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    items[index].photoUrl = `/uploads/${req.file.filename}`;
  }

  saveItems(items);
  console.log('Item updated:', items[index]);
  res.json({ message: 'Item updated', item: items[index] });
});

// DELETE item
app.delete('/api/items/:id', (req, res) => {
  console.log(`DELETE /api/items/${req.params.id} called`);
  const items = readItems();
  const id = parseInt(req.params.id);
  const filtered = items.filter(i => i.id !== id);
  if (filtered.length === items.length) return res.status(404).json({ error: 'Item not found' });

  saveItems(filtered);
  console.log('Item deleted:', id);
  res.json({ message: 'Item deleted' });
});

app.listen(3000, () => console.log('Server started on http://localhost:3000'));
