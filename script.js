// Dapur Bunda Bahagia - halaman pemesanan
const rupiah = (n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const capital = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '');

let menu = [];
let cart = [];
let filter = { cat: '', q: '' };

// ---------- Data ----------
async function fetchMenu() {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    menu = (await res.json()).map((p) => ({ ...p, category: capital(p.category.trim()), price: Number(p.price), stock_quantity: Number(p.stock_quantity) }));
    // buang item keranjang yang stoknya sudah berubah
    cart = cart.filter((c) => menu.some((m) => m.id === c.id)).map((c) => ({ ...c, quantity: Math.min(c.quantity, stockOf(c.id)) })).filter((c) => c.quantity > 0);
    displayMenu();
    updateCart();
  } catch (err) {
    console.error('Gagal memuat menu:', err);
    $('#foodMenu').innerHTML = '<div class="empty"><p>Menu belum bisa dimuat.</p><button class="btn" onclick="fetchMenu()">Coba lagi</button></div>';
  }
}

const stockOf = (id) => (menu.find((m) => m.id === id) || {}).stock_quantity || 0;
const inCart = (id) => (cart.find((c) => c.id === id) || {}).quantity || 0;

// ---------- Menu ----------
function displayMenu() {
  const box = $('#foodMenu');
  const q = filter.q.toLowerCase();
  const items = menu.filter((m) => (!filter.cat || m.category === filter.cat) && (!q || m.name.toLowerCase().includes(q)));
  if (!items.length) {
    box.innerHTML = '<div class="empty"><p>Tidak ada menu yang cocok.</p></div>';
    return;
  }
  box.innerHTML = items.map((item) => {
    const qty = inCart(item.id);
    const left = item.stock_quantity - qty;
    const out = item.stock_quantity <= 0;
    const stockText = out ? 'Habis' : left <= 3 ? `Sisa ${left}` : `Stok ${item.stock_quantity}`;
    const action = out
      ? '<button class="btn btn-block" disabled>Habis</button>'
      : qty
        ? `<div class="stepper" aria-label="Jumlah ${esc(item.name)}"><button onclick="changeQty(${item.id},-1)" aria-label="Kurangi">−</button><span>${qty}</span><button onclick="changeQty(${item.id},1)" ${left <= 0 ? 'disabled' : ''} aria-label="Tambah">+</button></div>`
        : `<button class="btn btn-primary btn-block" onclick="addToCart(${item.id})">+ Tambah</button>`;
    return `
      <article class="food${out ? ' out' : ''}">
        <div class="food-img"><img src="${esc(item.image_path)}" alt="${esc(item.name)}" loading="lazy" onerror="this.src='ASET/background.webp'"><span class="badge">${esc(item.category)}</span></div>
        <div class="food-body">
          <h3>${esc(item.name)}</h3>
          <div class="food-meta"><b>${rupiah(item.price)}</b><span class="stock${!out && left <= 3 ? ' low' : ''}${out ? ' none' : ''}">${stockText}</span></div>
          ${action}
        </div>
      </article>`;
  }).join('');
}

// ---------- Keranjang ----------
function addToCart(id) {
  const item = menu.find((m) => m.id === id);
  if (!item || inCart(id) >= item.stock_quantity) { toast('Stok tidak mencukupi'); return; }
  const existing = cart.find((c) => c.id === id);
  if (existing) existing.quantity += 1;
  else cart.push({ id: item.id, name: item.name, price: item.price, quantity: 1 });
  updateCart();
  displayMenu();
  toast(`${item.name} ditambahkan`);
}

function changeQty(id, delta) {
  const c = cart.find((x) => x.id === id);
  if (!c) return;
  if (delta > 0 && c.quantity >= stockOf(id)) { toast('Stok tidak mencukupi'); return; }
  c.quantity += delta;
  if (c.quantity <= 0) cart = cart.filter((x) => x.id !== id);
  updateCart();
  displayMenu();
}

function removeFromCart(id) {
  cart = cart.filter((x) => x.id !== id);
  updateCart();
  displayMenu();
}

const cartTotal = () => cart.reduce((s, c) => s + c.price * c.quantity, 0);
const cartCount = () => cart.reduce((s, c) => s + c.quantity, 0);

function updateCart() {
  const list = $('#orderList');
  if (!cart.length) {
    list.innerHTML = '<div class="cart-empty"><span>🍽️</span><p>Keranjang masih kosong.<br>Tambahkan menu favoritmu.</p></div>';
  } else {
    list.innerHTML = cart.map((c) => `
      <div class="cart-item">
        <div><b>${esc(c.name)}</b><small>${rupiah(c.price)}</small></div>
        <div class="stepper sm"><button onclick="changeQty(${c.id},-1)" aria-label="Kurangi ${esc(c.name)}">−</button><span>${c.quantity}</span><button onclick="changeQty(${c.id},1)" aria-label="Tambah ${esc(c.name)}">+</button></div>
        <div class="line"><b>${rupiah(c.price * c.quantity)}</b><button class="link danger" onclick="removeFromCart(${c.id})">Hapus</button></div>
      </div>`).join('');
  }
  $('#cartTotal').textContent = rupiah(cartTotal());
  $('#checkoutButton').disabled = !cart.length;
  $('#cartBar').hidden = !cart.length;
  $('#cartBarCount').textContent = `${cartCount()} item`;
  $('#cartBarTotal').textContent = rupiah(cartTotal());
}

function openCart(open) {
  document.body.classList.toggle('cart-open', open);
  $('#cartBackdrop').hidden = !open;
}

// ---------- Checkout ----------
const methodName = { tunai: 'Tunai', qris: 'QRIS', debit: 'Kartu debit' };
const currentMethod = () => document.querySelector('input[name=method]:checked').value;
const parseMoney = (s) => parseInt(String(s).replace(/\D/g, ''), 10) || 0;

function openCheckout() {
  if (!cart.length) return;
  openCart(false);
  const total = cartTotal();
  $('#receipt').innerHTML = `
    <ul>${cart.map((c) => `<li><span>${esc(c.name)} × ${c.quantity}</span><span>${rupiah(c.price * c.quantity)}</span></li>`).join('')}</ul>
    <div class="row total"><span>Total</span><b>${rupiah(total)}</b></div>`;
  const quick = [total, Math.ceil(total / 10000) * 10000, Math.ceil(total / 50000) * 50000, Math.ceil(total / 100000) * 100000]
    .filter((v, i, a) => v >= total && a.indexOf(v) === i).slice(0, 4);
  $('#quickCash').innerHTML = quick.map((v) => `<button type="button" class="chip" data-cash="${v}">${v === total ? 'Uang pas' : rupiah(v)}</button>`).join('');
  $('#amountPaid').value = '';
  document.querySelector('input[name=method][value=tunai]').checked = true;
  syncMethod();
  $('#payError').textContent = '';
  $('#checkoutModal').hidden = false;
  $('#amountPaid').focus();
}

function syncMethod() {
  const m = currentMethod();
  $('#tunaiAmount').hidden = m !== 'tunai';
  $('#paymentGateway').hidden = m === 'tunai';
  $('#gatewayText').textContent = m === 'qris'
    ? 'Pindai kode QR dengan aplikasi pembayaran (simulasi). Tidak ada data yang dikirim ke penyedia pembayaran.'
    : 'Simulasi pembayaran kartu debit di kasir. Tidak ada data kartu yang diminta atau disimpan.';
  $('#paymentGateway').classList.toggle('is-qris', m === 'qris');
  updateChange();
}

function updateChange() {
  const paid = parseMoney($('#amountPaid').value);
  const total = cartTotal();
  const info = $('#changeInfo');
  if (!paid) { info.textContent = ''; info.className = 'change'; return; }
  if (paid < total) { info.textContent = `Kurang ${rupiah(total - paid)}`; info.className = 'change bad'; }
  else { info.textContent = `Kembalian ${rupiah(paid - total)}`; info.className = 'change ok'; }
}

async function pay(e) {
  e.preventDefault();
  const total = cartTotal();
  const method = currentMethod();
  const paid = method === 'tunai' ? parseMoney($('#amountPaid').value) : total;
  if (method === 'tunai' && paid < total) { $('#payError').textContent = 'Jumlah uang kurang dari total belanja.'; return; }

  const btn = $('#payButton');
  btn.disabled = true; btn.textContent = 'Memproses…';
  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart, totalAmount: total, paymentMethod: method }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memproses pesanan');
    showReceipt(data.orderId, total, method, paid);
    cart = [];
    updateCart();
    fetchMenu();
  } catch (err) {
    console.error(err);
    $('#payError').textContent = 'Pesanan gagal diproses. Coba lagi sebentar lagi.';
  } finally {
    btn.disabled = false; btn.textContent = 'Bayar';
  }
}

function showReceipt(orderId, total, method, paid) {
  const now = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  $('#receiptBody').innerHTML = `
    <p class="muted">No. pesanan <b>#${esc(orderId)}</b> · ${now}</p>
    <ul class="summary-list">${cart.map((c) => `<li><span>${esc(c.name)} × ${c.quantity}</span><span>${rupiah(c.price * c.quantity)}</span></li>`).join('')}</ul>
    <div class="row total"><span>Total</span><b>${rupiah(total)}</b></div>
    <div class="row"><span>Metode</span><span>${methodName[method]}</span></div>
    ${method === 'tunai' ? `<div class="row"><span>Dibayar</span><span>${rupiah(paid)}</span></div><div class="row"><span>Kembalian</span><b>${rupiah(paid - total)}</b></div>` : ''}
    <p class="muted thanks">Terima kasih! Pesananmu sedang disiapkan.</p>`;
  $('#checkoutModal').hidden = true;
  $('#receiptModal').hidden = false;
}

// ---------- Utilitas ----------
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 1800);
}

// ---------- Event ----------
document.querySelectorAll('#menuButtons .chip').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('#menuButtons .chip').forEach((x) => x.classList.toggle('on', x === b));
  filter.cat = b.dataset.cat;
  displayMenu();
}));
$('#searchInput').addEventListener('input', (e) => { filter.q = e.target.value.trim(); displayMenu(); });
$('#checkoutButton').addEventListener('click', openCheckout);
$('#cartBar').addEventListener('click', () => openCart(true));
$('#cartClose').addEventListener('click', () => openCart(false));
$('#cartBackdrop').addEventListener('click', () => openCart(false));
document.querySelectorAll('input[name=method]').forEach((r) => r.addEventListener('change', syncMethod));
$('#amountPaid').addEventListener('input', (e) => {
  const n = parseMoney(e.target.value);
  e.target.value = n ? n.toLocaleString('id-ID') : '';
  $('#payError').textContent = '';
  updateChange();
});
$('#quickCash').addEventListener('click', (e) => {
  const v = e.target.dataset.cash;
  if (!v) return;
  $('#amountPaid').value = Number(v).toLocaleString('id-ID');
  updateChange();
});
$('#paymentForm').addEventListener('submit', pay);
document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => { b.closest('.modal-bg').hidden = true; }));
document.querySelectorAll('.modal-bg').forEach((m) => m.addEventListener('click', (e) => { if (e.target === m) m.hidden = true; }));
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  document.querySelectorAll('.modal-bg').forEach((m) => (m.hidden = true));
  openCart(false);
});

$('#year').textContent = new Date().getFullYear();
if (/vercel\.app$/.test(location.hostname)) {
  $('#demoNote').textContent = 'Versi demo: pesanan dan stok tersimpan sementara di server dan bisa kembali ke data awal sewaktu-waktu.';
}

fetchMenu();
updateCart();
