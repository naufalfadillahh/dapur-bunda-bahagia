// Dapur Bunda Bahagia - panel admin
const rupiah = (n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const capital = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '');
const methodName = { tunai: 'Tunai', qris: 'QRIS', debit: 'Kartu debit', kredit: 'Kartu kredit' };
const DAY = 864e5;

let products = [];
let orders = [];
let currentEditId = null;
let reportPeriod = 'week';

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2400);
}

async function api(url, opts) {
  const res = await fetch(url, opts);
  let data = {};
  try { data = await res.json(); } catch { /* respons kosong */ }
  if (!res.ok) throw new Error(data.error || data.message || 'Permintaan gagal');
  return data;
}

// ---------- Produk ----------
async function fetchProducts() {
  try {
    products = (await api('/api/products')).map((p) => ({ ...p, category: capital(p.category.trim()) }));
    displayProducts();
    renderOverview();
  } catch (err) {
    console.error(err);
    $('#productsList').innerHTML = '<tr><td colspan="5" class="muted">Produk gagal dimuat.</td></tr>';
  }
}

function stockPill(n) {
  if (n <= 0) return '<span class="pill none">Habis</span>';
  if (n <= 5) return `<span class="pill low">${n} · menipis</span>`;
  return `<span class="pill">${n}</span>`;
}

function displayProducts() {
  $('#productsList').innerHTML = products.map((p) => `
    <tr>
      <td><div class="prod"><img src="${esc(p.image_path)}" alt="" onerror="this.style.visibility='hidden'">${esc(p.name)}</div></td>
      <td>${esc(p.category)}</td>
      <td>${rupiah(p.price)}</td>
      <td>${stockPill(p.stock_quantity)}</td>
      <td><div class="actions">
        <input class="stock-input" type="number" min="0" id="stock-${p.id}" value="${p.stock_quantity}" aria-label="Stok ${esc(p.name)}">
        <button class="btn btn-sm" onclick="updateStock(${p.id})">Simpan stok</button>
        <button class="btn btn-sm" onclick="editProduct(${p.id})">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id})">Hapus</button>
      </div></td>
    </tr>`).join('');
}

async function updateStock(id) {
  const value = parseInt($(`#stock-${id}`).value, 10);
  if (isNaN(value) || value < 0) { toast('Stok harus angka 0 atau lebih'); return; }
  try {
    await api('/api/stock', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, stock_quantity: value }) });
    toast('Stok diperbarui');
    fetchProducts();
  } catch (err) { toast(err.message); }
}

function productForm(prefix) {
  const fd = new FormData();
  fd.append('name', $(`#${prefix}Name`).value.trim());
  fd.append('price', $(`#${prefix}Price`).value);
  fd.append('category', $(`#${prefix}Category`).value);
  fd.append('stock_quantity', $(`#${prefix}Stock`).value);
  const file = $(`#${prefix}Image`).files[0];
  if (file) fd.append('image', file);
  return fd;
}

$('#addProductForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const r = await api('/api/products', { method: 'POST', body: productForm('product') });
    toast(r.message || 'Produk ditambahkan');
    e.target.reset();
    fetchProducts();
  } catch (err) { toast(err.message); }
});

async function deleteProduct(id) {
  const p = products.find((x) => x.id === id);
  if (!confirm(`Hapus produk ${p ? p.name : ''}?`)) return;
  try {
    const r = await api(`/api/products/${id}`, { method: 'DELETE' });
    toast(r.message || 'Produk dihapus');
    fetchProducts();
  } catch (err) { toast(err.message); }
}

function editProduct(id) {
  const p = products.find((x) => x.id === id);
  if (!p) return;
  currentEditId = id;
  $('#editName').value = p.name;
  $('#editPrice').value = p.price;
  $('#editCategory').value = p.category;
  $('#editStock').value = p.stock_quantity;
  $('#editModal').hidden = false;
}

function closeEditModal() {
  $('#editModal').hidden = true;
  $('#editProductForm').reset();
  currentEditId = null;
}

$('#editProductForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const r = await api(`/api/products/${currentEditId}`, { method: 'PUT', body: productForm('edit') });
    toast(r.message || 'Produk diperbarui');
    closeEditModal();
    fetchProducts();
  } catch (err) { toast(err.message); }
});

// ---------- Pesanan ----------
async function fetchOrders() {
  try {
    orders = await api('/api/orders');
    displayOrders();
    renderOverview();
  } catch (err) {
    console.error(err);
    $('#pendingOrdersList').innerHTML = '<p class="muted">Pesanan gagal dimuat.</p>';
  }
}

function orderCard(o, withAction) {
  const when = new Date(o.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  return `
    <article class="order">
      <div class="order-head"><b>Pesanan #${esc(o.id)}</b><span class="muted">${when}</span></div>
      <ul>${(o.items || []).map((it) => `<li>${esc(it.name || 'Produk')} × ${it.quantity} · ${rupiah(it.price * it.quantity)}</li>`).join('')}</ul>
      <div class="order-foot">
        <span><b>${rupiah(o.total_amount)}</b> · ${esc(methodName[o.payment_method] || o.payment_method)}</span>
        ${withAction ? `<button class="btn btn-sm btn-primary" onclick="completeOrder(${o.id})">Tandai selesai</button>` : '<span class="pill">Selesai</span>'}
      </div>
    </article>`;
}

function displayOrders() {
  const pending = orders.filter((o) => o.status === 'pending');
  const done = orders.filter((o) => o.status === 'completed');
  $('#pendingOrdersList').innerHTML = pending.length ? pending.map((o) => orderCard(o, true)).join('') : '<p class="muted">Tidak ada pesanan yang menunggu. Pesanan baru dari halaman toko akan muncul di sini.</p>';
  $('#completedOrdersList').innerHTML = done.length ? done.map((o) => orderCard(o, false)).join('') : '<p class="muted">Belum ada pesanan selesai.</p>';
  $('#pendingCount').textContent = pending.length;
}

async function completeOrder(id) {
  try {
    const r = await api(`/api/orders/${id}/complete`, { method: 'PUT', headers: { 'Content-Type': 'application/json' } });
    toast(r.message ? 'Pesanan ditandai selesai' : 'Berhasil');
    fetchOrders();
  } catch (err) { toast(err.message); }
}

// ---------- Ringkasan ----------
function renderOverview() {
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const doneOrders = orders.filter((o) => o.status === 'completed');
  const sum = (list) => list.reduce((s, o) => s + Number(o.total_amount), 0);
  $('#statToday').textContent = rupiah(sum(doneOrders.filter((o) => String(o.created_at).slice(0, 10) === today)));
  $('#statWeek').textContent = rupiah(sum(doneOrders.filter((o) => now - Date.parse(o.created_at) < 7 * DAY)));
  $('#statPending').textContent = orders.filter((o) => o.status === 'pending').length;
  $('#statLow').textContent = products.filter((p) => p.stock_quantity <= 5).length;

  const sold = {};
  orders.forEach((o) => (o.items || []).forEach((it) => {
    const k = it.name || 'Produk';
    sold[k] = (sold[k] || 0) + Number(it.quantity);
  }));
  const top = Object.entries(sold).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = top.length ? top[0][1] : 1;
  $('#bestSellers').innerHTML = top.length
    ? top.map(([name, qty]) => `<div class="bar-row"><span>${esc(name)}</span><div class="bar"><i style="width:${(qty / max) * 100}%"></i></div><span class="v">${qty} porsi</span></div>`).join('')
    : '<p class="muted">Belum ada data penjualan.</p>';
}

// ---------- Laporan ----------
async function fetchReport(period) {
  reportPeriod = period;
  $('#weeklyReport').classList.toggle('active', period === 'week');
  $('#monthlyReport').classList.toggle('active', period === 'month');
  try {
    const rows = await api(`/api/reports?period=${period}`);
    if (!rows.length) { $('#reportResult').innerHTML = '<p class="muted">Tidak ada penjualan pada periode ini.</p>'; return; }
    const max = Math.max(...rows.map((r) => Number(r.total_sales)));
    const total = rows.reduce((s, r) => s + Number(r.total_sales), 0);
    const count = rows.reduce((s, r) => s + Number(r.order_count), 0);
    $('#reportResult').innerHTML = `
      <div class="stats" style="margin-bottom:16px">
        <div class="stat"><b>${rupiah(total)}</b><span>Total penjualan</span></div>
        <div class="stat"><b>${count}</b><span>Pesanan selesai</span></div>
        <div class="stat"><b>${rupiah(count ? total / count : 0)}</b><span>Rata-rata per pesanan</span></div>
      </div>
      <div class="bars">${rows.map((r) => {
        const d = new Date(r.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
        return `<div class="bar-row"><span>${d}</span><div class="bar"><i style="width:${(Number(r.total_sales) / max) * 100}%"></i></div><span class="v">${rupiah(r.total_sales)} · ${r.order_count}×</span></div>`;
      }).join('')}</div>`;
  } catch (err) {
    console.error(err);
    $('#reportResult').innerHTML = '<p class="muted">Laporan gagal dimuat.</p>';
  }
}

async function resetReports() {
  if (!confirm('Reset laporan? Semua data pesanan akan dihapus.')) return;
  try {
    await api('/api/reports/reset', { method: 'PUT', headers: { 'Content-Type': 'application/json' } });
    toast('Laporan direset');
    fetchOrders();
    fetchReport(reportPeriod);
  } catch (err) { toast(err.message); }
}

// ---------- Navigasi ----------
function showSection(id) {
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.section === id));
  document.querySelectorAll('.section').forEach((s) => s.classList.toggle('hidden', s.id !== id));
  if (id === 'reports') fetchReport(reportPeriod);
  window.scrollTo(0, 0);
}
document.querySelectorAll('.nav-btn').forEach((b) => b.addEventListener('click', () => showSection(b.dataset.section)));
document.querySelectorAll('.sub-nav-btn').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.sub-nav-btn').forEach((x) => x.classList.toggle('active', x === b));
  document.querySelectorAll('.sub-section').forEach((s) => s.classList.toggle('hidden', s.id !== b.dataset.sub + 'Orders'));
}));
$('#weeklyReport').addEventListener('click', () => fetchReport('week'));
$('#monthlyReport').addEventListener('click', () => fetchReport('month'));
$('#resetReport').addEventListener('click', resetReports);
$('#fetchOrders').addEventListener('click', fetchOrders);
$('#refreshAll').addEventListener('click', () => { fetchProducts(); fetchOrders(); });
$('#editModal').addEventListener('click', (e) => { if (e.target.id === 'editModal') closeEditModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeEditModal(); });

if (/vercel\.app$/.test(location.hostname)) $('#demoBanner').hidden = false;

fetchProducts();
fetchOrders();
