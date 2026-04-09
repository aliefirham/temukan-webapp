const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const authMiddleware = require('../middleware/auth');

// Konfigurasi upload foto
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/jpeg|jpg|png|webp/.test(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar (jpg, png, webp) yang diizinkan.'));
    }
  }
});

// Mapping category group → daftar kategori
const CATEGORY_GROUPS = {
  barang:    ['Dompet', 'Kunci', 'Perhiasan', 'Pakaian', 'Lainnya'],
  kendaraan: ['Kendaraan'],
  dokumen:   ['Dokumen'],
  hewan:     ['Hewan'],
  gadget:    ['Handphone']
};

// GET /api/posts — semua postingan (search & filter + pagination)
router.get('/', (req, res) => {
  const { q, type, category, categoryGroup, location, status, page = 1, limit = 12 } = req.query;

  let where = 'WHERE 1=1';
  const params = [];

  if (q) {
    where += ' AND (p.title LIKE ? OR p.description LIKE ? OR p.location LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (type && ['hilang', 'ditemukan'].includes(type)) {
    where += ' AND p.type = ?';
    params.push(type);
  }
  // Filter by categoryGroup (Barang, Kendaraan, dll)
  if (categoryGroup && CATEGORY_GROUPS[categoryGroup.toLowerCase()]) {
    const cats = CATEGORY_GROUPS[categoryGroup.toLowerCase()];
    where += ` AND p.category IN (${cats.map(() => '?').join(',')})`;
    params.push(...cats);
  } else if (category) {
    // Filter by single category (backward compat)
    where += ' AND p.category = ?';
    params.push(category);
  }
  if (location) {
    where += ' AND p.location LIKE ?';
    params.push(`%${location}%`);
  }
  if (status && ['aktif', 'selesai'].includes(status)) {
    where += ' AND p.status = ?';
    params.push(status);
  } else {
    where += " AND p.status = 'aktif'";
  }

  const baseFrom = `FROM posts p JOIN users u ON p.user_id = u.id ${where}`;

  const totalRow = db.get(`SELECT COUNT(*) as total ${baseFrom}`, params);
  const total = totalRow ? totalRow.total : 0;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const posts = db.all(
    `SELECT p.*, u.name as user_name, u.whatsapp as user_whatsapp
     ${baseFrom}
     ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), offset]
  );

  res.json({
    posts,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    }
  });
});

// GET /api/posts/user/my — postingan milik user (harus SEBELUM /:id)
router.get('/user/my', authMiddleware, (req, res) => {
  const posts = db.all(
    'SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json(posts);
});

// GET /api/posts/:id — detail postingan
router.get('/:id', (req, res) => {
  const post = db.get(
    `SELECT p.*, u.name as user_name, u.whatsapp as user_whatsapp, u.email as user_email
     FROM posts p JOIN users u ON p.user_id = u.id
     WHERE p.id = ?`,
    [req.params.id]
  );
  if (!post) return res.status(404).json({ error: 'Postingan tidak ditemukan.' });
  res.json(post);
});

// POST /api/posts — buat postingan baru
router.post('/', authMiddleware, upload.single('image'), (req, res) => {
  const { type, title, description, category, location, date_lost_found } = req.body;

  if (!type || !title || !description || !category || !location || !date_lost_found) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Semua field wajib diisi.' });
  }
  if (!['hilang', 'ditemukan'].includes(type)) {
    return res.status(400).json({ error: 'Tipe harus "hilang" atau "ditemukan".' });
  }

  const image_path = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const result = db.run(
      `INSERT INTO posts
         (user_id, type, title, description, category, location, date_lost_found, image_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, type, title, description, category, location, date_lost_found, image_path]
    );
    const newPost = db.get('SELECT * FROM posts WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ message: 'Postingan berhasil dibuat!', post: newPost });
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// PUT /api/posts/:id — edit postingan
router.put('/:id', authMiddleware, upload.single('image'), (req, res) => {
  const post = db.get('SELECT * FROM posts WHERE id = ?', [req.params.id]);
  if (!post) return res.status(404).json({ error: 'Postingan tidak ditemukan.' });
  if (post.user_id !== req.user.id) return res.status(403).json({ error: 'Tidak diizinkan.' });

  const { type, title, description, category, location, date_lost_found } = req.body;
  let image_path = post.image_path;

  if (req.file) {
    if (post.image_path) {
      const oldPath = path.join(__dirname, '..', post.image_path);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    image_path = `/uploads/${req.file.filename}`;
  }

  db.run(
    `UPDATE posts SET type=?, title=?, description=?, category=?,
     location=?, date_lost_found=?, image_path=? WHERE id=?`,
    [
      type || post.type, title || post.title,
      description || post.description, category || post.category,
      location || post.location, date_lost_found || post.date_lost_found,
      image_path, post.id
    ]
  );
  res.json({ message: 'Postingan berhasil diperbarui.' });
});

// PATCH /api/posts/:id/status — tandai selesai / aktif
router.patch('/:id/status', authMiddleware, (req, res) => {
  const post = db.get('SELECT * FROM posts WHERE id = ?', [req.params.id]);
  if (!post) return res.status(404).json({ error: 'Postingan tidak ditemukan.' });
  if (post.user_id !== req.user.id) return res.status(403).json({ error: 'Tidak diizinkan.' });

  const { status } = req.body;
  if (!['aktif', 'selesai'].includes(status))
    return res.status(400).json({ error: 'Status harus "aktif" atau "selesai".' });

  db.run('UPDATE posts SET status = ? WHERE id = ?', [status, post.id]);
  res.json({ message: `Postingan ditandai sebagai ${status}.` });
});

// DELETE /api/posts/:id
router.delete('/:id', authMiddleware, (req, res) => {
  const post = db.get('SELECT * FROM posts WHERE id = ?', [req.params.id]);
  if (!post) return res.status(404).json({ error: 'Postingan tidak ditemukan.' });
  if (post.user_id !== req.user.id) return res.status(403).json({ error: 'Tidak diizinkan.' });

  if (post.image_path) {
    const imgPath = path.join(__dirname, '..', post.image_path);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  }

  db.run('DELETE FROM posts WHERE id = ?', [post.id]);
  res.json({ message: 'Postingan berhasil dihapus.' });
});

module.exports = router;
