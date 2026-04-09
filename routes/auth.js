const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const authMiddleware = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'temukan_secret_key_2024';

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, password, whatsapp } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: 'Nama, email, dan password wajib diisi.' });

  if (password.length < 6)
    return res.status(400).json({ error: 'Password minimal 6 karakter.' });

  const existing = db.get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing)
    return res.status(409).json({ error: 'Email sudah terdaftar.' });

  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    const result = db.run(
      'INSERT INTO users (name, email, password, whatsapp) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, whatsapp || null]
    );

    const token = jwt.sign(
      { id: result.lastInsertRowid, name, email },
      JWT_SECRET, { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registrasi berhasil!',
      token,
      user: { id: result.lastInsertRowid, name, email, whatsapp: whatsapp || null }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'Email dan password wajib diisi.' });

  const user = db.get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user)
    return res.status(401).json({ error: 'Email atau password salah.' });

  const isValid = bcrypt.compareSync(password, user.password);
  if (!isValid)
    return res.status(401).json({ error: 'Email atau password salah.' });

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    JWT_SECRET, { expiresIn: '7d' }
  );

  res.json({
    message: 'Login berhasil!',
    token,
    user: { id: user.id, name: user.name, email: user.email, whatsapp: user.whatsapp }
  });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const user = db.get(
    'SELECT id, name, email, whatsapp, created_at FROM users WHERE id = ?',
    [req.user.id]
  );
  if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' });
  res.json(user);
});

// PUT /api/auth/me
router.put('/me', authMiddleware, (req, res) => {
  const { name, whatsapp } = req.body;
  if (!name) return res.status(400).json({ error: 'Nama wajib diisi.' });
  db.run(
    'UPDATE users SET name = ?, whatsapp = ? WHERE id = ?',
    [name, whatsapp || null, req.user.id]
  );
  res.json({ message: 'Profil berhasil diperbarui.' });
});

module.exports = router;
