/* =============================================
   TEMUKAN.CO.ID — Main Frontend JavaScript
   ============================================= */

const API = '/api';

// ===================== AUTH STATE =====================

let currentUser = null;

function getToken() {
  return localStorage.getItem('temukan_token');
}

function setToken(token) {
  localStorage.setItem('temukan_token', token);
}

function clearToken() {
  localStorage.removeItem('temukan_token');
  localStorage.removeItem('temukan_user');
}

function saveUser(user) {
  localStorage.setItem('temukan_user', JSON.stringify(user));
  currentUser = user;
}

function loadUser() {
  const raw = localStorage.getItem('temukan_user');
  if (raw) { try { currentUser = JSON.parse(raw); } catch(e) {} }
  return currentUser;
}

// ===================== FETCH HELPERS =====================

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body instanceof FormData) delete headers['Content-Type'];

  const res = await fetch(API + path, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan');
  return data;
}

// ===================== UI HELPERS =====================

function showToast(message, type = 'default') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function showAlert(elementId, message, type = 'error') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type}">${type === 'error' ? '⚠️' : '✅'} ${message}</div>`;
}

function clearAlert(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.innerHTML = '';
}

function openModal(id) {
  document.getElementById(id)?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
  document.body.style.overflow = '';
}

function showLoading(show) {
  const el = document.getElementById('loadingOverlay');
  if (el) el.classList.toggle('active', show);
}

// ===================== NAVBAR / AUTH UI =====================

function updateNavbar() {
  const user = loadUser();
  const guestNav = document.getElementById('guestNav');
  const userNav = document.getElementById('userNav');
  const avatarBtn = document.getElementById('userAvatarBtn');

  if (user && getToken()) {
    guestNav?.classList.add('hidden');
    userNav?.classList.remove('hidden');
    if (avatarBtn) avatarBtn.textContent = user.name.charAt(0).toUpperCase();
  } else {
    guestNav?.classList.remove('hidden');
    userNav?.classList.add('hidden');
  }
}

function toggleDropdown() {
  document.getElementById('dropdownMenu')?.classList.toggle('open');
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  const menu = document.getElementById('dropdownMenu');
  if (menu && !e.target.closest('.user-menu')) {
    menu.classList.remove('open');
  }
});

function logout() {
  clearToken();
  currentUser = null;
  showToast('Berhasil keluar. Sampai jumpa! 👋', 'success');
  setTimeout(() => { window.location.href = '/'; }, 1200);
}

// ===================== LOGIN =====================

function openLoginModal() {
  clearAlert('loginAlert');
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPassword').value = '';
  openModal('loginModal');
}

async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    return showAlert('loginAlert', 'Email dan password wajib diisi.');
  }

  try {
    showLoading(true);
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setToken(data.token);
    saveUser(data.user);
    closeModal('loginModal');
    updateNavbar();
    showToast(`Selamat datang, ${data.user.name}! 🎉`, 'success');
    // Refresh posts jika ada
    if (typeof loadPosts === 'function') loadPosts();
  } catch (err) {
    showAlert('loginAlert', err.message);
  } finally {
    showLoading(false);
  }
}

// ===================== REGISTER =====================

function switchToRegister() {
  closeModal('loginModal');
  setTimeout(() => {
    clearAlert('registerAlert');
    openModal('registerModal');
  }, 200);
}

function switchToLogin() {
  closeModal('registerModal');
  setTimeout(() => {
    clearAlert('loginAlert');
    openModal('loginModal');
  }, 200);
}

async function doRegister() {
  const name     = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const whatsapp = document.getElementById('regWA').value.trim();
  const password = document.getElementById('regPassword').value;

  if (!name || !email || !password) {
    return showAlert('registerAlert', 'Nama, email, dan password wajib diisi.');
  }
  if (password.length < 6) {
    return showAlert('registerAlert', 'Password minimal 6 karakter.');
  }

  try {
    showLoading(true);
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, whatsapp })
    });
    setToken(data.token);
    saveUser(data.user);
    closeModal('registerModal');
    updateNavbar();
    showToast(`Akun berhasil dibuat! Selamat datang, ${data.user.name} 🎉`, 'success');
    if (typeof loadPosts === 'function') loadPosts();
  } catch (err) {
    showAlert('registerAlert', err.message);
  } finally {
    showLoading(false);
  }
}

// ===================== CREATE POST =====================

let selectedType = '';

function openCreatePost() {
  if (!getToken()) {
    showToast('Silakan login terlebih dahulu untuk membuat postingan.', 'default');
    openLoginModal();
    return;
  }
  clearAlert('createPostAlert');
  selectedType = '';
  document.getElementById('postType').value = '';
  document.getElementById('postTitle').value = '';
  document.getElementById('postCategory').value = '';
  document.getElementById('postLocation').value = '';
  document.getElementById('postDesc').value = '';
  document.getElementById('postDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('postImage').value = '';
  document.getElementById('imagePreview')?.classList.add('hidden');
  document.getElementById('typeHilang')?.classList.remove('selected-hilang', 'selected-ditemukan');
  document.getElementById('typeDitemukan')?.classList.remove('selected-hilang', 'selected-ditemukan');
  openModal('createPostModal');
}

function selectType(type) {
  selectedType = type;
  document.getElementById('postType').value = type;
  const btnH = document.getElementById('typeHilang');
  const btnD = document.getElementById('typeDitemukan');
  btnH.className = 'type-btn' + (type === 'hilang' ? ' selected-hilang' : '');
  btnD.className = 'type-btn' + (type === 'ditemukan' ? ' selected-ditemukan' : '');
}

function previewImage(input) {
  const preview = document.getElementById('imagePreview');
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.classList.remove('hidden');
    };
    reader.readAsDataURL(input.files[0]);
  }
}

async function submitPost() {
  const type          = document.getElementById('postType').value;
  const title         = document.getElementById('postTitle').value.trim();
  const category      = document.getElementById('postCategory').value;
  const location      = document.getElementById('postLocation').value.trim();
  const date          = document.getElementById('postDate').value;
  const description   = document.getElementById('postDesc').value.trim();
  const imageFile     = document.getElementById('postImage').files[0];

  if (!type)        return showAlert('createPostAlert', 'Pilih tipe: Hilang atau Ditemukan.');
  if (!title)       return showAlert('createPostAlert', 'Judul wajib diisi.');
  if (!category)    return showAlert('createPostAlert', 'Pilih kategori.');
  if (!location)    return showAlert('createPostAlert', 'Lokasi wajib diisi.');
  if (!date)        return showAlert('createPostAlert', 'Tanggal wajib diisi.');
  if (!description) return showAlert('createPostAlert', 'Deskripsi wajib diisi.');

  const formData = new FormData();
  formData.append('type', type);
  formData.append('title', title);
  formData.append('category', category);
  formData.append('location', location);
  formData.append('date_lost_found', date);
  formData.append('description', description);
  if (imageFile) formData.append('image', imageFile);

  try {
    showLoading(true);
    const token = getToken();
    const res = await fetch(API + '/posts', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal membuat postingan');

    closeModal('createPostModal');
    showToast('Postingan berhasil dipublikasikan! 🎉', 'success');
    if (typeof loadPosts === 'function') loadPosts();
  } catch (err) {
    showAlert('createPostAlert', err.message);
  } finally {
    showLoading(false);
  }
}

// ===================== CATEGORY ICON =====================

function getCategoryIcon(category) {
  const icons = {
    'Dokumen': '📄', 'Dompet': '👜', 'Handphone': '📱',
    'Kunci': '🔑', 'Hewan': '🐾', 'Kendaraan': '🚗',
    'Perhiasan': '💍', 'Pakaian': '👕', 'Lainnya': '📦'
  };
  return icons[category] || '📦';
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeAgo(dateStr) {
  const now = new Date();
  const then = new Date(dateStr);
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'Baru saja';
  if (diff < 3600) return `${Math.floor(diff/60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff/3600)} jam lalu`;
  if (diff < 2592000) return `${Math.floor(diff/86400)} hari lalu`;
  return formatDate(dateStr);
}

// ===================== POST CARD HTML =====================

function renderPostCard(post) {
  const imgHtml = post.image_path
    ? `<img src="${post.image_path}" alt="${post.title}" loading="lazy" />`
    : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:52px;">${getCategoryIcon(post.category)}</div>`;

  const badge = post.type === 'hilang'
    ? `<span class="post-badge badge-hilang">🔴 Hilang</span>`
    : `<span class="post-badge badge-ditemukan">🟢 Ditemukan</span>`;

  return `
    <div class="post-card" onclick="openPostDetail(${post.id})">
      <div class="post-card-img">${imgHtml}</div>
      <div class="post-card-body">
        ${badge}
        <div class="post-title">${escapeHtml(post.title)}</div>
        <div class="post-meta">
          <span>📍 ${escapeHtml(post.location)}</span>
          <span>📅 ${formatDate(post.date_lost_found)}</span>
          <span>🏷️ ${escapeHtml(post.category)}</span>
        </div>
      </div>
      <div class="post-card-footer">
        <span>👤 ${escapeHtml(post.user_name || 'Anonim')}</span>
        <span>${timeAgo(post.created_at)}</span>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===================== POST DETAIL MODAL =====================

async function openPostDetail(id) {
  openModal('postDetailModal');
  document.getElementById('postDetailContent').innerHTML = '<div class="spinner"></div>';

  try {
    const post = await apiFetch(`/posts/${id}`);
    renderPostDetail(post);
  } catch (err) {
    document.getElementById('postDetailContent').innerHTML =
      `<div class="alert alert-error">⚠️ Gagal memuat detail postingan.</div>`;
  }
}

function renderPostDetail(post) {
  const user = loadUser();
  const isOwner = user && user.id === post.user_id;

  const imgHtml = post.image_path
    ? `<img src="${post.image_path}" alt="${post.title}" style="width:100%;max-height:360px;object-fit:cover;border-radius:12px;margin-bottom:20px;">`
    : `<div style="background:var(--blue-pale);border-radius:12px;height:160px;display:flex;align-items:center;justify-content:center;font-size:72px;margin-bottom:20px;">${getCategoryIcon(post.category)}</div>`;

  const badge = post.type === 'hilang'
    ? `<span class="post-badge badge-hilang">🔴 Barang Hilang</span>`
    : `<span class="post-badge badge-ditemukan">🟢 Barang Ditemukan</span>`;

  // Kontak via WA
  let contactHtml = '';
  if (post.user_whatsapp) {
    const waNum = post.user_whatsapp.replace(/^0/, '62').replace(/\D/g, '');
    const waMsg = encodeURIComponent(`Halo ${post.user_name}, saya melihat postingan kamu di Temukan.co.id tentang "${post.title}". Boleh saya tahu lebih lanjut?`);
    contactHtml = `
      <div class="contact-card" style="margin-top:24px">
        <h3>💬 Hubungi ${escapeHtml(post.user_name)}</h3>
        <p>Punya informasi tentang barang ini? Atau ini milikmu?<br>Segera hubungi pemilik postingan!</p>
        <a href="https://wa.me/${waNum}?text=${waMsg}" target="_blank" class="wa-btn">
          <span>📲</span> Chat via WhatsApp
        </a>
      </div>
    `;
  } else {
    contactHtml = `
      <div class="contact-card" style="margin-top:24px">
        <h3>💬 Punya Informasi?</h3>
        <p>Diposting oleh <strong>${escapeHtml(post.user_name)}</strong></p>
        <p style="margin-top:8px;font-size:13px;color:var(--gray-600)">Nomor kontak tidak tersedia. Silakan cek kembali nanti.</p>
      </div>
    `;
  }

  const ownerActions = isOwner ? `
    <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
      ${post.status === 'aktif'
        ? `<button class="btn btn-success btn-sm" onclick="markPostDone(${post.id})">✅ Tandai Selesai</button>`
        : `<button class="btn btn-outline btn-sm" onclick="markPostActive(${post.id})">🔄 Aktifkan Kembali</button>`
      }
    </div>
  ` : '';

  // Share buttons
  const pageUrl = encodeURIComponent(`${window.location.origin}/?post=${post.id}`);
  const shareText = encodeURIComponent(`[${post.type === 'hilang' ? 'HILANG' : 'DITEMUKAN'}] ${post.title} — di ${post.location}. Cek di Temukan.co.id! #SemuaBisaKetemu`);
  const waShareNum = '';
  const shareHtml = `
    <div style="margin-top:20px; padding-top:16px; border-top:1px solid var(--gray-200);">
      <p style="font-size:13px; font-weight:600; color:var(--gray-600); margin-bottom:10px;">🔗 Bagikan Postingan Ini</p>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <a href="https://wa.me/?text=${shareText}%20${pageUrl}" target="_blank"
           style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#25D366;color:white;border-radius:20px;font-size:13px;font-weight:500;text-decoration:none;">
          📲 WhatsApp
        </a>
        <a href="https://twitter.com/intent/tweet?text=${shareText}&url=${pageUrl}" target="_blank"
           style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#1DA1F2;color:white;border-radius:20px;font-size:13px;font-weight:500;text-decoration:none;">
          🐦 Twitter/X
        </a>
        <a href="https://www.facebook.com/sharer/sharer.php?u=${pageUrl}" target="_blank"
           style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#1877F2;color:white;border-radius:20px;font-size:13px;font-weight:500;text-decoration:none;">
          📘 Facebook
        </a>
        <button onclick="copyPostLink(${post.id})"
           style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:var(--gray-200);color:var(--gray-800);border-radius:20px;font-size:13px;font-weight:500;border:none;cursor:pointer;">
          🔗 Salin Link
        </button>
      </div>
    </div>
  `;

  document.getElementById('detailModalTitle').textContent =
    post.type === 'hilang' ? '🔴 Barang Hilang' : '🟢 Barang Ditemukan';

  document.getElementById('postDetailContent').innerHTML = `
    ${imgHtml}
    <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:12px">
      ${badge}
      ${post.status === 'selesai' ? '<span class="post-badge badge-selesai">✅ Selesai</span>' : ''}
      <h2 style="font-size:clamp(18px,3vw,24px);font-weight:700;flex:1">${escapeHtml(post.title)}</h2>
    </div>
    <div class="post-detail-meta">
      <span>📍 ${escapeHtml(post.location)}</span>
      <span>📅 ${formatDate(post.date_lost_found)}</span>
      <span>🏷️ ${escapeHtml(post.category)}</span>
      <span>🕐 Diposting ${timeAgo(post.created_at)}</span>
    </div>
    <div class="post-detail-desc">${escapeHtml(post.description).replace(/\n/g, '<br>')}</div>
    ${contactHtml}
    ${ownerActions}
    ${shareHtml}
  `;
}

function copyPostLink(id) {
  const url = `${window.location.origin}/?post=${id}`;
  navigator.clipboard.writeText(url).then(() => {
    showToast('Link berhasil disalin! 🔗', 'success');
  }).catch(() => {
    // Fallback untuk browser lama
    const el = document.createElement('textarea');
    el.value = url;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast('Link berhasil disalin! 🔗', 'success');
  });
}

async function markPostDone(id) {
  try {
    await apiFetch(`/posts/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'selesai' }) });
    showToast('Postingan ditandai sebagai selesai! 🎉', 'success');
    closeModal('postDetailModal');
    if (typeof loadPosts === 'function') loadPosts();
    if (typeof loadMyPosts === 'function') loadMyPosts();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function markPostActive(id) {
  try {
    await apiFetch(`/posts/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'aktif' }) });
    showToast('Postingan diaktifkan kembali.', 'success');
    closeModal('postDetailModal');
    if (typeof loadPosts === 'function') loadPosts();
    if (typeof loadMyPosts === 'function') loadMyPosts();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ===================== CLOSE ON OVERLAY CLICK =====================
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

// Enter key on search
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    if (document.getElementById('loginModal')?.classList.contains('open')) doLogin();
    else if (document.getElementById('registerModal')?.classList.contains('open')) doRegister();
  }
});

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
  updateNavbar();
});
