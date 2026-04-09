/* =============================================
   TEMUKAN.CO.ID — Index Page Logic
   ============================================= */

let currentPage = 1;
let currentView = 'grid';
let currentFilters = { q: '', type: '', category: '', categoryGroup: '', location: '', sort: 'newest' };

// ===================== LOAD POSTS =====================

async function loadPosts(page = 1) {
  currentPage = page;
  const grid = document.getElementById('postsGrid');
  if (!grid) return;

  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px"><div class="spinner"></div></div>';

  const params = new URLSearchParams();
  if (currentFilters.q)             params.set('q', currentFilters.q);
  if (currentFilters.type)          params.set('type', currentFilters.type);
  if (currentFilters.categoryGroup) params.set('categoryGroup', currentFilters.categoryGroup);
  else if (currentFilters.category) params.set('category', currentFilters.category);
  if (currentFilters.location)      params.set('location', currentFilters.location);
  if (currentFilters.sort)          params.set('sort', currentFilters.sort);
  params.set('page', page);
  params.set('limit', 12);

  try {
    const data = await apiFetch(`/posts?${params}`);
    renderPosts(data.posts);
    renderPagination(data.pagination);
    updateSectionHeader(data.pagination.total);
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="icon">😕</div>
      <h3>Gagal memuat postingan</h3>
      <p>${err.message}</p>
    </div>`;
  }
}

function renderPosts(posts) {
  const grid = document.getElementById('postsGrid');
  if (!posts || posts.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="icon">🔍</div>
        <h3>Belum ada postingan</h3>
        <p>Jadilah yang pertama memposting barang hilang atau ditemukan!</p>
        <button class="btn btn-primary" style="margin-top:16px" onclick="openCreatePost()">+ Buat Postingan</button>
      </div>
    `;
    return;
  }
  grid.innerHTML = posts.map(renderPostCard).join('');
}

function renderPagination(pagination) {
  const el = document.getElementById('pagination');
  if (!el) return;
  if (pagination.totalPages <= 1) { el.innerHTML = ''; return; }

  let html = '';
  html += `<button class="page-btn" onclick="loadPosts(${pagination.page - 1})" ${pagination.page <= 1 ? 'disabled' : ''}>‹</button>`;

  for (let i = 1; i <= pagination.totalPages; i++) {
    if (i === 1 || i === pagination.totalPages || Math.abs(i - pagination.page) <= 2) {
      html += `<button class="page-btn ${i === pagination.page ? 'active' : ''}" onclick="loadPosts(${i})">${i}</button>`;
    } else if (Math.abs(i - pagination.page) === 3) {
      html += `<button class="page-btn" disabled>…</button>`;
    }
  }

  html += `<button class="page-btn" onclick="loadPosts(${pagination.page + 1})" ${pagination.page >= pagination.totalPages ? 'disabled' : ''}>›</button>`;
  el.innerHTML = html;
}

function updateSectionHeader(total) {
  const titleEl = document.getElementById('sectionTitle');
  const countEl = document.getElementById('sectionCount');
  if (!titleEl) return;

  let title = 'Postingan Terbaru';
  if (currentFilters.type === 'hilang') title = 'Barang Hilang';
  else if (currentFilters.type === 'ditemukan') title = 'Barang Ditemukan';
  if (currentFilters.q) title = `Hasil pencarian: "${currentFilters.q}"`;

  titleEl.textContent = title;
  if (countEl) countEl.textContent = `${total} postingan`;
}

// ===================== LOAD STATS =====================

async function loadStats() {
  try {
    // Load total
    const all = await apiFetch('/posts?limit=1&status=aktif');
    const hilang = await apiFetch('/posts?type=hilang&limit=1&status=aktif');
    const ditemukan = await apiFetch('/posts?type=ditemukan&limit=1&status=aktif');

    const animateCount = (el, target) => {
      if (!el) return;
      let count = 0;
      const step = Math.ceil(target / 30);
      const timer = setInterval(() => {
        count = Math.min(count + step, target);
        el.textContent = count.toLocaleString('id-ID');
        if (count >= target) clearInterval(timer);
      }, 40);
    };

    animateCount(document.getElementById('totalPosts'), all.pagination.total);
    animateCount(document.getElementById('totalHilang'), hilang.pagination.total);
    animateCount(document.getElementById('totalDitemukan'), ditemukan.pagination.total);
  } catch (e) {
    // Sembunyikan stats jika gagal
    document.getElementById('heroStats')?.classList.add('hidden');
  }
}

// ===================== SEARCH & FILTER =====================

function doSearch() {
  const heroInput = document.getElementById('heroSearchInput');
  const navInput = document.getElementById('navSearch');
  const q = (heroInput?.value || navInput?.value || '').trim();
  currentFilters.q = q;
  currentPage = 1;
  // Scroll ke grid
  document.getElementById('postsGrid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  loadPosts(1);
}

function applyFilters() {
  currentFilters.location = document.getElementById('filterLocation')?.value || '';
  currentFilters.sort = document.getElementById('sortBy')?.value || 'newest';
  loadPosts(1);
}

function setView(mode) {
  currentView = mode;
  const grid = document.getElementById('postsGrid');
  const btnGrid = document.getElementById('viewGrid');
  const btnList = document.getElementById('viewList');
  if (!grid) return;

  if (mode === 'list') {
    grid.classList.add('list-view');
    btnGrid?.classList.remove('active');
    btnList?.classList.add('active');
  } else {
    grid.classList.remove('list-view');
    btnGrid?.classList.add('active');
    btnList?.classList.remove('active');
  }
}

// Category tabs
document.querySelectorAll('.cat-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilters.categoryGroup = tab.dataset.group;
    currentFilters.category = '';
    loadPosts(1);
  });
});

// Filter chips (Semua / Hilang / Ditemukan)
document.querySelectorAll('.chip[data-type]').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip[data-type]').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentFilters.type = chip.dataset.type;
    loadPosts(1);
  });
});

// Navbar search enter
document.getElementById('navSearch')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    currentFilters.q = e.target.value.trim();
    loadPosts(1);
  }
});

document.getElementById('heroSearchInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doSearch();
});

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
  loadPosts(1);
  loadStats();
});
