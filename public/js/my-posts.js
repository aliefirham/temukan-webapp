/* =============================================
   TEMUKAN.CO.ID — My Posts Page Logic
   ============================================= */

let allMyPosts = [];
let currentStatusFilter = 'aktif';

// Cek login
document.addEventListener('DOMContentLoaded', () => {
  if (!getToken()) {
    showToast('Silakan login terlebih dahulu.', 'error');
    setTimeout(() => { window.location.href = '/'; }, 1500);
    return;
  }
  loadMyPosts();
});

async function loadMyPosts() {
  const list = document.getElementById('myPostsList');
  list.innerHTML = '<div class="spinner"></div>';

  try {
    allMyPosts = await apiFetch('/posts/user/my');
    renderMyPosts();
  } catch (err) {
    list.innerHTML = `<div class="alert alert-error">⚠️ Gagal memuat postingan: ${err.message}</div>`;
  }
}

function filterMyPosts(status, btn) {
  currentStatusFilter = status;
  document.querySelectorAll('.chip[data-status]').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderMyPosts();
}

function renderMyPosts() {
  const list = document.getElementById('myPostsList');

  let filtered = allMyPosts;
  if (currentStatusFilter !== 'all') {
    filtered = allMyPosts.filter(p => p.status === currentStatusFilter);
  }

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="icon">📭</div>
        <h3>Belum ada postingan</h3>
        <p>Buat postingan pertamamu sekarang!</p>
        <button class="btn btn-primary" style="margin-top:16px" onclick="openCreatePost()">+ Buat Postingan</button>
      </div>
    `;
    return;
  }

  list.innerHTML = filtered.map(post => `
    <div class="my-post-item">
      <div class="my-post-thumb">
        ${post.image_path
          ? `<img src="${post.image_path}" alt="${escapeHtml(post.title)}" style="width:80px;height:80px;object-fit:cover;border-radius:8px">`
          : getCategoryIcon(post.category)
        }
      </div>
      <div class="my-post-info">
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px;flex-wrap:wrap">
          <span class="post-badge ${post.type === 'hilang' ? 'badge-hilang' : 'badge-ditemukan'}">
            ${post.type === 'hilang' ? '🔴 Hilang' : '🟢 Ditemukan'}
          </span>
          ${post.status === 'selesai' ? '<span class="post-badge badge-selesai">✅ Selesai</span>' : ''}
        </div>
        <h4>${escapeHtml(post.title)}</h4>
        <p>📍 ${escapeHtml(post.location)} · 📅 ${formatDate(post.date_lost_found)} · 🏷️ ${escapeHtml(post.category)}</p>
        <p style="font-size:12px;color:var(--gray-600);margin-top:2px">Diposting ${timeAgo(post.created_at)}</p>
        <div class="my-post-actions">
          <button class="btn btn-outline btn-sm" onclick="openPostDetail(${post.id})">👁️ Lihat</button>
          <button class="btn btn-ghost btn-sm" onclick="openEditPost(${post.id})">✏️ Edit</button>
          ${post.status === 'aktif'
            ? `<button class="btn btn-success btn-sm" onclick="markPostDone(${post.id})">✅ Selesai</button>`
            : `<button class="btn btn-outline btn-sm" onclick="markPostActive(${post.id})">🔄 Aktifkan</button>`
          }
          <button class="btn btn-danger btn-sm" onclick="confirmDeletePost(${post.id})">🗑️ Hapus</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ===================== EDIT POST =====================

function openEditPost(id) {
  const post = allMyPosts.find(p => p.id === id);
  if (!post) return;

  document.getElementById('editPostId').value = id;
  document.getElementById('editTitle').value = post.title;
  document.getElementById('editCategory').value = post.category;
  document.getElementById('editDate').value = post.date_lost_found;
  document.getElementById('editLocation').value = post.location;
  document.getElementById('editDesc').value = post.description;
  document.getElementById('editImagePreview').classList.add('hidden');
  clearAlert('editPostAlert');
  openModal('editPostModal');
}

function previewEditImage(input) {
  const preview = document.getElementById('editImagePreview');
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.classList.remove('hidden');
    };
    reader.readAsDataURL(input.files[0]);
  }
}

async function saveEditPost() {
  const id       = document.getElementById('editPostId').value;
  const title    = document.getElementById('editTitle').value.trim();
  const category = document.getElementById('editCategory').value;
  const date     = document.getElementById('editDate').value;
  const location = document.getElementById('editLocation').value.trim();
  const desc     = document.getElementById('editDesc').value.trim();
  const imgFile  = document.getElementById('editImage').files[0];

  if (!title || !location || !desc) {
    return showAlert('editPostAlert', 'Judul, lokasi, dan deskripsi wajib diisi.');
  }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('category', category);
  formData.append('date_lost_found', date);
  formData.append('location', location);
  formData.append('description', desc);
  if (imgFile) formData.append('image', imgFile);

  try {
    showLoading(true);
    const res = await fetch(`/api/posts/${id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    closeModal('editPostModal');
    showToast('Postingan berhasil diperbarui!', 'success');
    loadMyPosts();
  } catch (err) {
    showAlert('editPostAlert', err.message);
  } finally {
    showLoading(false);
  }
}

// ===================== DELETE POST =====================

function confirmDeletePost(id) {
  document.getElementById('deletePostId').value = id;
  openModal('deleteConfirmModal');
}

async function confirmDelete() {
  const id = document.getElementById('deletePostId').value;
  try {
    showLoading(true);
    await apiFetch(`/posts/${id}`, { method: 'DELETE' });
    closeModal('deleteConfirmModal');
    showToast('Postingan berhasil dihapus.', 'success');
    loadMyPosts();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    showLoading(false);
  }
}
