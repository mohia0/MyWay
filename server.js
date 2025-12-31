const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./db');
const { authenticateAdmin } = require('./auth');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
initDatabase();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG and JPG images are allowed'));
    }
  }
});

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// API Routes

// Upload image
app.post('/api/upload', authenticateAdmin, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const db = require('./db').getDb();
  const imageId = uuidv4();
  
  db.prepare(`
    INSERT INTO images (id, filename, original_name, upload_date)
    VALUES (?, ?, ?, datetime('now'))
  `).run(imageId, req.file.filename, req.file.originalname);

  res.json({
    id: imageId,
    filename: req.file.filename,
    originalName: req.file.originalname,
    url: `/uploads/${req.file.filename}`
  });
});

// Get all images
app.get('/api/images', (req, res) => {
  const db = require('./db').getDb();
  const images = db.prepare(`
    SELECT id, original_name as originalName, filename, upload_date as uploadDate,
           status, latest_version
    FROM images
    ORDER BY upload_date DESC
  `).all();

  res.json(images);
});

// Get single image with comments and versions
app.get('/api/images/:id', (req, res) => {
  const db = require('./db').getDb();
  const image = db.prepare(`
    SELECT id, original_name as originalName, filename, upload_date as uploadDate,
           status, latest_version as latestVersion
    FROM images
    WHERE id = ?
  `).get(req.params.id);

  if (!image) {
    return res.status(404).json({ error: 'Image not found' });
  }

  const comments = db.prepare(`
    SELECT id, x, y, comment, created_at as createdAt, author
    FROM comments
    WHERE image_id = ?
    ORDER BY created_at ASC
  `).all(req.params.id);

  const versions = db.prepare(`
    SELECT id, version_number as versionNumber, created_at as createdAt, status, note
    FROM versions
    WHERE image_id = ?
    ORDER BY version_number DESC
  `).all(req.params.id);

  res.json({
    ...image,
    comments,
    versions
  });
});

// Add comment (pin)
app.post('/api/images/:id/comments', (req, res) => {
  const db = require('./db').getDb();
  const { x, y, comment, author } = req.body;

  if (!x || !y || !comment) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const commentId = uuidv4();
  db.prepare(`
    INSERT INTO comments (id, image_id, x, y, comment, author, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(commentId, req.params.id, x, y, comment, author || 'Anonymous');

  const newComment = db.prepare(`
    SELECT id, x, y, comment, created_at as createdAt, author
    FROM comments
    WHERE id = ?
  `).get(commentId);

  res.json(newComment);
});

// Update image status (approve/request changes)
app.post('/api/images/:id/status', (req, res) => {
  const db = require('./db').getDb();
  const { status, note } = req.body;

  if (!['approved', 'changes_requested'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  // Get current latest version
  const image = db.prepare('SELECT latest_version FROM images WHERE id = ?').get(req.params.id);
  const nextVersion = (image?.latest_version || 0) + 1;

  // Create new version record
  db.prepare(`
    INSERT INTO versions (id, image_id, version_number, status, note, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(uuidv4(), req.params.id, nextVersion, status, note || '');

  // Update image status and version
  db.prepare(`
    UPDATE images
    SET status = ?, latest_version = ?
    WHERE id = ?
  `).run(status, nextVersion, req.params.id);

  res.json({ success: true, version: nextVersion, status });
});

// Delete comment (admin only)
app.delete('/api/comments/:id', authenticateAdmin, (req, res) => {
  const db = require('./db').getDb();
  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Delete image (admin only)
app.delete('/api/images/:id', authenticateAdmin, (req, res) => {
  const db = require('./db').getDb();
  
  // Get filename to delete file
  const image = db.prepare('SELECT filename FROM images WHERE id = ?').get(req.params.id);
  if (image) {
    const filePath = path.join(uploadsDir, image.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  // Delete from database (cascade will handle related records)
  db.prepare('DELETE FROM images WHERE id = ?').run(req.params.id);
  
  res.json({ success: true });
});

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const { verifyPassword } = require('./auth');
  
  if (verifyPassword(password)) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// Simple session check (in production, use proper session management)
app.get('/api/admin/check', (req, res) => {
  // This is a simple check - in production use proper sessions/cookies
  res.json({ authenticated: false }); // Will be handled by middleware
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Client view: http://localhost:${PORT}`);
  console.log(`Admin view: http://localhost:${PORT}/admin.html`);
});

