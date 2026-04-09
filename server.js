require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Temukan API berjalan dengan baik 🎉' });
});

// Semua route lain → kirim ke index.html (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🔍 Temukan.co.id berjalan di: http://localhost:${PORT}`);
  console.log(`📦 API tersedia di:            http://localhost:${PORT}/api`);
  console.log(`\nTekan Ctrl+C untuk menghentikan server.\n`);
});
