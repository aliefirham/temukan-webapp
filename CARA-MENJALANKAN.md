# 🔍 Temukan.co.id — Cara Menjalankan

## Prasyarat

Pastikan sudah terinstall di komputer kamu:
- **Node.js** versi 18 ke atas → https://nodejs.org
- **npm** (sudah termasuk dalam Node.js)

> Untuk Windows, `better-sqlite3` membutuhkan **Visual Studio Build Tools** atau **windows-build-tools**.
> Cara install: buka Command Prompt sebagai Administrator, jalankan:
> `npm install -g windows-build-tools`

---

## Cara Menjalankan (Windows)

### Cara Mudah — Klik 2x file `start.bat`

Atau via Command Prompt:

```bash
cd temukan-webapp
npm install
node server.js
```

Buka browser: **http://localhost:3000**

---

## Struktur File

```
temukan-webapp/
├── server.js          ← Entry point server
├── database.js        ← Setup SQLite database
├── middleware/
│   └── auth.js        ← JWT authentication
├── routes/
│   ├── auth.js        ← Register, Login API
│   └── posts.js       ← CRUD postingan API
├── public/
│   ├── index.html     ← Halaman utama
│   ├── my-posts.html  ← Halaman postingan saya
│   ├── css/
│   │   └── style.css  ← Styling
│   ├── js/
│   │   ├── app.js     ← Logic utama & auth
│   │   ├── index.js   ← Logic halaman utama
│   │   └── my-posts.js← Logic halaman my posts
│   └── img/
│       └── logo.png   ← Logo Temukan
├── uploads/           ← Foto yang diupload user (auto-dibuat)
├── temukan.db         ← Database SQLite (auto-dibuat)
├── .env               ← Konfigurasi (copy dari .env.example)
└── start.bat          ← Script startup Windows
```

---

## API Endpoints

### Auth
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | /api/auth/register | Daftar akun baru |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Info user yang login |
| PUT | /api/auth/me | Update profil |

### Posts
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | /api/posts | Semua postingan (search + filter) |
| POST | /api/posts | Buat postingan baru |
| GET | /api/posts/user/my | Postingan milik saya |
| GET | /api/posts/:id | Detail postingan |
| PUT | /api/posts/:id | Edit postingan |
| PATCH | /api/posts/:id/status | Tandai selesai/aktif |
| DELETE | /api/posts/:id | Hapus postingan |

### Query Parameters (GET /api/posts)
- `q` — kata kunci pencarian
- `type` — `hilang` atau `ditemukan`
- `category` — kategori barang
- `location` — lokasi (partial match)
- `status` — `aktif` atau `selesai`
- `page` — halaman (default: 1)
- `limit` — jumlah per halaman (default: 12)

---

## Deploy ke Internet

Untuk deploy gratis, gunakan salah satu:
- **Railway** → https://railway.app (paling mudah)
- **Render** → https://render.com
- **Heroku** → https://heroku.com

Untuk domain `temukan.co.id`, arahkan domain ke server setelah deploy.
