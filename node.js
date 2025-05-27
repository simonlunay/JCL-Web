const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

if (!fs.existsSync('./public/uploads')) {
  fs.mkdirSync('./public/uploads', { recursive: true });
}

const app = express();
const DATA_FILE = './items.json';

// Serve used.html on root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'used.html'));
});

// Set up multer storage (files go to /public/uploads)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/uploads/');
  },
  filename: function (req, file, cb) {
    // Make filename unique with timestamp + original extension
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Serve static files from /public (including uploads)
app.use(express.static('public'));

// Parse JSON bodies for PUT/DELETE and other JSON requests
app.use(express.json());

// Helper: Read items from file
function readItems() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

// Helper: Save items to file
function saveItems(items) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));
}

// GET all items
app.get('/api/items', (req, res) => {
  res.json(readItems());
});

// POST new item with file upload (photo)
app.post('/api/items', upload.single('photo'), (req, res) => {
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
  res.json({ message: 'Item added', item: newItem });
});

const basicAuth = require('express-basic-auth');

// Protect admin routes
app.use('/admin', basicAuth({
  users: { 'admin': 'yourStrongPassword' },
  challenge: true,
  unauthorizedResponse: (req) => 'Unauthorized',
}));

// Serve admin page at /admin
app.use('/admin', express.static('admin'));

// PUT route to update item by ID, with optional photo upload
app.put('/api/items/:id', upload.single('photo'), (req, res) => {
  const items = readItems();
  const id = parseInt(req.params.id);
  const index = items.findIndex(i => i.id === id);
  if (index === -1) return res.status(404).json({ error: 'Item not found' });

  // Update fields from req.body
  items[index].title = req.body.title || items[index].title;
  items[index].description = req.body.description || items[index].description;
  items[index].price = req.body.price ? parseFloat(req.body.price) : items[index].price;

  // Handle new photo upload
  if (req.file) {
    if (items[index].photoUrl) {
      const oldPath = path.join(__dirname, 'public', items[index].photoUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    items[index].photoUrl = `/uploads/${req.file.filename}`;
  }

  saveItems(items);
  res.json({ message: 'Item updated', item: items[index] });
});

// DELETE item
app.delete('/api/items/:id', (req, res) => {
  const items = readItems();
  const id = parseInt(req.params.id);
  const filtered = items.filter(i => i.id !== id);
  if (filtered.length === items.length) return res.status(404).json({ error: 'Item not found' });

  saveItems(filtered);
  res.json({ message: 'Item deleted' });
});

app.listen(3000, () => console.log('Server started on http://localhost:3000'));
