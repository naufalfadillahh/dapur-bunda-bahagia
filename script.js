// Daftar menu makanan dari API
let menu = [];

// Fetch menu dari API
async function fetchMenu() {
  try {
    const response = await fetch('/api/products');
    menu = await response.json();
    displayMenu();
  } catch (error) {
    console.error('Error fetching menu:', error);
  }
}

// Menampilkan menu makanan
function displayMenu(category = null) {
  const foodMenu = document.getElementById('foodMenu');
  foodMenu.innerHTML = ''; // Reset menu

  let filteredMenu = category ? menu.filter(item => item.category.toLowerCase().trim() === category.toLowerCase().trim()) : menu;

  const categories = {};
  filteredMenu.forEach(item => {
    if (!categories[item.category]) categories[item.category] = [];
    categories[item.category].push(item);
  });

  for (const [cat, items] of Object.entries(categories)) {
    const catDiv = document.createElement('div');
    catDiv.innerHTML = `<h3>${cat.charAt(0).toUpperCase() + cat.slice(1)}</h3>`;
    const catItems = document.createElement('div');
    catItems.classList.add('categoryItems');
    items.forEach(item => {
      const foodItem = document.createElement('div');
      foodItem.classList.add('foodItem');
      if (item.stock_quantity <= 0) {
        foodItem.classList.add('out-of-stock');
      }
      foodItem.innerHTML = `
        <img src="${item.image_path}" alt="${item.name}">
        <h3>${item.name}</h3>
        <p>Rp ${item.price}</p>
        <p>Stok: ${item.stock_quantity}</p>
        <button onclick="addToCart(${item.id})" ${item.stock_quantity <= 0 ? 'disabled' : ''}>Tambah ke Keranjang</button>
      `;
      catItems.appendChild(foodItem);
    });
    catDiv.appendChild(catItems);
    foodMenu.appendChild(catDiv);
  }
}

// Keranjang belanja
let cart = [];

// Menambah produk ke keranjang
function addToCart(id) {
  const item = menu.find(item => item.id === id);
  if (!item || item.stock_quantity <= 0) return;

  const existing = cart.find(c => c.id === id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ id: item.id, name: item.name, price: item.price, quantity: 1 });
  }

  updateCart();
}

// Menambah quantity item di keranjang
function increaseQuantity(id) {
  const item = cart.find(c => c.id === id);
  if (item) {
    item.quantity += 1;
    updateCart();
  }
}

// Mengurangi quantity item di keranjang
function decreaseQuantity(id) {
  const item = cart.find(c => c.id === id);
  if (item && item.quantity > 1) {
    item.quantity -= 1;
    updateCart();
  } else if (item && item.quantity === 1) {
    removeFromCart(id);
  }
}

// Menghapus item dari keranjang
function removeFromCart(id) {
  cart = cart.filter(c => c.id !== id);
  updateCart();
}

// Mengupdate tampilan keranjang
function updateCart() {
  const orderList = document.getElementById('orderList');
  orderList.innerHTML = ''; // Reset order list

  if (cart.length === 0) {
    orderList.innerHTML = '<p>Belum ada pesanan</p>';
    document.getElementById('checkoutButton').style.display = 'none';
    return;
  }

  let total = 0;
  cart.forEach(item => {
    const orderItem = document.createElement('div');
    orderItem.innerHTML = `
      <p>${item.name} - Rp ${item.price}</p>
      <button onclick="decreaseQuantity(${item.id})" style="background-color: #ff9800; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">-</button>
      <span> x${item.quantity} </span>
      <button onclick="increaseQuantity(${item.id})" style="background-color: #4CAF50; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">+</button>
      <span> - Rp ${item.price * item.quantity}</span>
      <button onclick="removeFromCart(${item.id})" style="background-color: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-left: 10px;">Hapus</button>
    `;
    orderList.appendChild(orderItem);
    total += item.price * item.quantity;
  });

  const totalPrice = document.createElement('div');
  totalPrice.innerHTML = `<strong>Total: Rp ${total}</strong>`;
  orderList.appendChild(totalPrice);

  // Menyimpan total harga untuk proses pembayaran
  document.getElementById('checkoutButton').style.display = 'block';
}

// Hapus item dari keranjang (decrement quantity jika >1, atau hapus jika 1)
function removeFromCart(id) {
  const index = cart.findIndex(c => c.id === id);
  if (index !== -1) {
    if (cart[index].quantity > 1) {
      cart[index].quantity -= 1;
    } else {
      cart.splice(index, 1);
    }
    updateCart();
  }
}

// Checkout dan menampilkan form pembayaran
document.getElementById('checkoutButton').addEventListener('click', () => {
  if (cart.length === 0) {
    alert('Anda belum memesan');
    return;
  }

  document.getElementById('orderSection').style.display = 'none';
  document.getElementById('paymentSection').style.display = 'block';

  // Hitung total harga berdasarkan barang yang ada di keranjang
  let totalAmount = 0;
  cart.forEach(item => totalAmount += item.price * item.quantity);

  // Tampilkan total harga dan daftar item yang sudah dihitung di halaman pembayaran
  const receipt = document.getElementById('receipt');
  receipt.innerHTML = `<p><strong>Total yang harus dibayar: Rp ${totalAmount}</strong></p><div><h3>Daftar Pesanan</h3>${cart.map(item => `<p>${item.name} x${item.quantity} - Rp ${item.price * item.quantity}</p>`).join('')}</div>`;

  // Set default to tunai and initialize display
  document.getElementById('paymentMethod').value = 'tunai';
  document.getElementById('paymentMethod').dispatchEvent(new Event('change'));
});

// Event listener for payment method change
document.getElementById('paymentMethod').addEventListener('change', function() {
  const method = this.value;
  const tunaiAmount = document.getElementById('tunaiAmount');
  const paymentGateway = document.getElementById('paymentGateway');
  const amountPaid = document.getElementById('amountPaid');
  const cardNumber = document.getElementById('cardNumber');
  const expiryDate = document.getElementById('expiryDate');
  const cvv = document.getElementById('cvv');

  if (method === 'tunai') {
    tunaiAmount.style.display = 'block';
    paymentGateway.style.display = 'none';
    amountPaid.required = true;
    // Remove required for card fields when hidden
    if (cardNumber) cardNumber.required = false;
    if (expiryDate) expiryDate.required = false;
    if (cvv) cvv.required = false;
  } else {
    tunaiAmount.style.display = 'none';
    paymentGateway.style.display = 'block';
    amountPaid.required = false;
    amountPaid.value = '';
    // Add required for card fields when shown
    if (cardNumber) cardNumber.required = true;
    if (expiryDate) expiryDate.required = true;
    if (cvv) cvv.required = true;
  }
});

// Proses pembayaran
document.getElementById('paymentForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const paymentMethod = document.getElementById('paymentMethod').value;

  // Hitung total harga berdasarkan barang yang ada di keranjang
  let totalAmount = 0;
  cart.forEach(item => totalAmount += item.price * item.quantity);

  // Validasi jumlah yang dibayar
  if (cart.length === 0) {
    alert('Anda belum memesan');
    return;
  }

  let isValid = false;
  let amountPaid = 0;
  let message = '';

  if (paymentMethod === 'tunai') {
    const amountInput = document.getElementById('amountPaid').value;
    amountPaid = parseInt(amountInput);
    if (!amountInput || isNaN(amountPaid)) {
      alert('Jumlah bayar harus diisi dengan angka yang valid!');
      return;
    }
    if (amountPaid < totalAmount) {
      alert('Jumlah bayar kurang dari total harga!');
      return;
    }
    const change = amountPaid - totalAmount;
    message = `Pembayaran tunai berhasil! Kembalian: Rp ${change}`;
    isValid = true;
  } else {
    // Validasi payment gateway untuk debit/kredit
    const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
    const expiryDate = document.getElementById('expiryDate').value;
    const cvv = document.getElementById('cvv').value;

    if (cardNumber.length !== 16 || !/^\d{16}$/.test(cardNumber)) {
      alert('Nomor kartu harus tepat 16 digit angka!');
      return;
    }
    if (!expiryDate) {
      alert('Tanggal kadaluarsa harus diisi!');
      return;
    }
    if (cvv.length !== 3 || !/^\d{3}$/.test(cvv)) {
      alert('CVV harus tepat 3 digit angka!');
      return;
    }
    message = `Pembayaran dengan ${paymentMethod} berhasil diproses melalui gateway!`;
    isValid = true;
  }

  if (isValid) {
    // Kirim pesanan ke API
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart, totalAmount, paymentMethod })
    })
    .then(response => response.json())
    .then(data => {
      const change = paymentMethod === 'tunai' ? amountPaid - totalAmount : 0;
      const struk = `
Nomor Pesanan: ${data.orderId}

Daftar Pesanan:
${cart.map(item => `${item.name} x${item.quantity} - Rp ${item.price * item.quantity}`).join('\n')}

Total: Rp ${totalAmount}
Metode Pembayaran: ${paymentMethod}
${paymentMethod === 'tunai' ? `Kembalian: Rp ${change}` : ''}

Pesanan Selesai!

Terima kasih atas pesanannya!
      `;
      alert(struk);

      // Kosongkan keranjang dan reset tampilan setelah pembayaran
      cart = []; // Kosongkan keranjang setelah pembayaran
      updateCart();

      // Reset tampilan dan tampilkan kembali menu utama
      document.getElementById('paymentSection').style.display = 'none';
      document.getElementById('orderSection').style.display = 'block';

      // Bersihkan form pembayaran dan receipt untuk mencegah riwayat sebelumnya
      document.getElementById('amountPaid').value = '';
      document.getElementById('cardNumber').value = '';
      document.getElementById('expiryDate').value = '';
      document.getElementById('cvv').value = '';
      document.getElementById('receipt').innerHTML = '';

      // Refresh menu untuk update stok
      fetchMenu();
    })
    .catch(error => {
      console.error('Error submitting order:', error);
      alert('Terjadi kesalahan saat memproses pesanan.');
    });
  }
});

// Event listeners for menu buttons
document.getElementById('showAll').addEventListener('click', () => displayMenu());
document.getElementById('showMakanan').addEventListener('click', () => displayMenu('Makanan'));
document.getElementById('showMinuman').addEventListener('click', () => displayMenu('Minuman'));
document.getElementById('showAppetizer').addEventListener('click', () => displayMenu('Appetizer'));

// Event listener for edit order button
document.getElementById('editOrderButton').addEventListener('click', () => {
  document.getElementById('paymentSection').style.display = 'none';
  document.getElementById('orderSection').style.display = 'block';
});

// Memulai aplikasi
fetchMenu();
