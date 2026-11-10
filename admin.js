// Global products array
let products = [];
let currentEditId = null;

// Fetch and display products for stock management
async function fetchProducts() {
  try {
    const response = await fetch('/api/products');
    products = await response.json();
    displayProducts(products);
  } catch (error) {
    console.error('Error fetching products:', error);
  }
}

// Display products with stock update form
function displayProducts(products) {
  const productsList = document.getElementById('productsList');
  productsList.innerHTML = '';
  products.forEach(product => {
    const productDiv = document.createElement('div');
    productDiv.innerHTML = `
      <h3>${product.name}</h3>
      <p>Kategori: ${product.category}</p>
      <p>Stok Saat Ini: ${product.stock_quantity}</p>
      <p>Harga: Rp ${product.price}</p>
      <img src="${product.image_path ? product.image_path : ''}" alt="${product.name}" style="max-width: 100px; height: auto;">
      <input type="number" id="stock-${product.id}" value="${product.stock_quantity}" min="0">
      <button onclick="updateStock(${product.id})">Update Stok</button>
      <button onclick="editProduct(${product.id})" style="background-color: #2196F3; color: white; border: none; padding: 5px 10px; margin-left: 5px; border-radius: 4px; cursor: pointer;">Edit</button>
      <button onclick="deleteProduct(${product.id})" style="background-color: #f44336; color: white; border: none; padding: 5px 10px; margin-left: 5px; border-radius: 4px; cursor: pointer;">Hapus</button>
    `;
    productsList.appendChild(productDiv);
  });
}

// Update stock
async function updateStock(id) {
  const stockInput = document.getElementById(`stock-${id}`);
  const stock_quantity = parseInt(stockInput.value);
  try {
    const response = await fetch('/api/stock', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, stock_quantity })
    });
    const result = await response.json();
    alert(result.message);
    fetchProducts(); // Refresh list
  } catch (error) {
    console.error('Error updating stock:', error);
    alert('Gagal update stok');
  }
}

// Reports
document.getElementById('weeklyReport').addEventListener('click', () => fetchReport('week'));
document.getElementById('monthlyReport').addEventListener('click', () => fetchReport('month'));
document.getElementById('resetReport').addEventListener('click', resetReports);

async function fetchReport(period) {
  try {
    const response = await fetch(`/api/reports?period=${period}`);
    const reports = await response.json();
    displayReport(reports, period);
  } catch (error) {
    console.error('Error fetching report:', error);
  }
}

// Display report
function displayReport(reports, period) {
  const reportResult = document.getElementById('reportResult');
  if (reports.length === 0) {
    reportResult.innerHTML = '<p>Tidak ada data penjualan.</p>';
    return;
  }
  let html = `<h3>Laporan ${period === 'week' ? 'Mingguan' : 'Bulanan'}</h3><table border="1"><tr><th>Tanggal</th><th>Total Penjualan</th><th>Jumlah Pesanan</th></tr>`;
  reports.forEach(report => {
    html += `<tr><td>${report.date}</td><td>Rp ${report.total_sales}</td><td>${report.order_count}</td></tr>`;
  });
  html += '</table>';
  reportResult.innerHTML = html;
}

// Reset reports
async function resetReports() {
  if (!confirm('Apakah Anda yakin ingin mereset laporan? Semua pesanan completed akan menjadi pending.')) return;
  try {
    const response = await fetch('/api/reports/reset', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await response.json();
    if (response.ok) {
      alert(result.message);
      fetchOrders(); // Refresh orders list
      document.getElementById('reportResult').innerHTML = '<p>Laporan telah direset.</p>';
    } else {
      alert('Gagal: ' + result.error);
    }
  } catch (error) {
    console.error('Error resetting reports:', error);
    alert('Terjadi kesalahan saat mereset laporan.');
  }
}

// Fetch and display orders
async function fetchOrders() {
  try {
    const response = await fetch('/api/orders');
    const orders = await response.json();
    displayOrders(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
  }
}

// Display orders
function displayOrders(orders) {
  const pendingList = document.getElementById('pendingOrdersList');
  const completedList = document.getElementById('completedOrdersList');
  pendingList.innerHTML = '';
  completedList.innerHTML = '';

  const pendingOrders = orders.filter(order => order.status === 'pending');
  const completedOrders = orders.filter(order => order.status === 'completed');

  if (pendingOrders.length === 0) {
    pendingList.innerHTML = '<p>Tidak ada pesanan masuk.</p>';
  } else {
    pendingOrders.forEach(order => {
      const orderDiv = document.createElement('div');
      orderDiv.style.border = '1px solid #ccc';
      orderDiv.style.padding = '10px';
      orderDiv.style.marginBottom = '10px';
      const buttonHtml = `<button onclick="completeOrder(${order.id})" style="background-color: #4CAF50; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-left: 10px;">Tambahkan ke Laporan</button>`;
      orderDiv.innerHTML = `
        <h4>Pesanan #${order.id} - ${order.status} - ${new Date(order.created_at).toLocaleString()}${buttonHtml}</h4>
        <p>Total: Rp ${order.total_amount} - Metode: ${order.payment_method}</p>
        <h5>Item:</h5>
        <ul>
          ${order.items.map(item => `<li>${item.name} x${item.quantity} - Rp ${item.price * item.quantity}</li>`).join('')}
        </ul>
      `;
      pendingList.appendChild(orderDiv);
    });
  }

  if (completedOrders.length === 0) {
    completedList.innerHTML = '<p>Tidak ada pesanan yang sudah dikonfirmasi.</p>';
  } else {
    completedOrders.forEach(order => {
      const orderDiv = document.createElement('div');
      orderDiv.style.border = '1px solid #ccc';
      orderDiv.style.padding = '10px';
      orderDiv.style.marginBottom = '10px';
      orderDiv.innerHTML = `
        <h4>Pesanan #${order.id} - ${order.status} - ${new Date(order.created_at).toLocaleString()}</h4>
        <p>Total: Rp ${order.total_amount} - Metode: ${order.payment_method}</p>
        <h5>Item:</h5>
        <ul>
          ${order.items.map(item => `<li>${item.name} x${item.quantity} - Rp ${item.price * item.quantity}</li>`).join('')}
        </ul>
      `;
      completedList.appendChild(orderDiv);
    });
  }
}

// Complete order
async function completeOrder(id) {
  if (!confirm('Tambahkan pesanan ini ke laporan?')) return;
  try {
    const response = await fetch(`/api/orders/${id}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await response.json();
    if (response.ok) {
      alert(result.message);
      fetchOrders(); // Refresh list
    } else {
      alert('Gagal: ' + result.error);
    }
  } catch (error) {
    console.error('Error completing order:', error);
    alert('Terjadi kesalahan saat menyelesaikan pesanan.');
  }
}

// Add new product
document.getElementById('addProductForm').addEventListener('submit', addProduct);

async function addProduct(event) {
  event.preventDefault();
  const formData = new FormData();
  formData.append('name', document.getElementById('productName').value);
  formData.append('price', document.getElementById('productPrice').value);
  formData.append('category', document.getElementById('productCategory').value);
  formData.append('stock_quantity', document.getElementById('productStock').value);
  const imageFile = document.getElementById('productImage').files[0];
  if (imageFile) formData.append('image', imageFile);

  try {
    const response = await fetch('/api/products', {
      method: 'POST',
      body: formData
    });
    const result = await response.json();
    if (response.ok) {
      alert(result.message);
      document.getElementById('addProductForm').reset();
      fetchProducts(); // Refresh list
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    console.error('Error adding product:', error);
    alert('Gagal menambah produk');
  }
}

// Delete product
async function deleteProduct(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;
  try {
    const response = await fetch(`/api/products/${id}`, {
      method: 'DELETE'
    });
    const result = await response.json();
    if (response.ok) {
      alert(result.message);
      fetchProducts(); // Refresh list
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    alert('Gagal menghapus produk');
  }
}

// Event listener for fetch orders button
document.getElementById('fetchOrders').addEventListener('click', fetchOrders);

// Sidebar navigation
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    // Remove active from all nav-btn
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    // Add active to clicked
    btn.classList.add('active');
    // Hide all sections
    document.querySelectorAll('.section').forEach(sec => sec.classList.add('hidden'));
    // Show the target section
    const sectionId = btn.dataset.section;
    document.getElementById(sectionId).classList.remove('hidden');
  });
});

// Sub-sidebar for orders
document.querySelectorAll('.sub-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    // Remove active from sub-nav-btn
    document.querySelectorAll('.sub-nav-btn').forEach(b => b.classList.remove('active'));
    // Add active to clicked
    btn.classList.add('active');
    // Hide all sub-sections
    document.querySelectorAll('.sub-section').forEach(sec => sec.classList.add('hidden'));
    // Show the target sub-section
    const subId = btn.dataset.sub + 'Orders';
    document.getElementById(subId).classList.remove('hidden');
  });
});

// Edit product
function editProduct(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  currentEditId = id;
  document.getElementById('editName').value = product.name;
  document.getElementById('editPrice').value = product.price;
  document.getElementById('editCategory').value = product.category;
  document.getElementById('editStock').value = product.stock_quantity;
  document.getElementById('editModal').style.display = 'block';
}

// Close edit modal
function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
  document.getElementById('editProductForm').reset();
  currentEditId = null;
}

// Edit product form submit
document.getElementById('editProductForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData();
  formData.append('name', document.getElementById('editName').value);
  formData.append('price', document.getElementById('editPrice').value);
  formData.append('category', document.getElementById('editCategory').value);
  formData.append('stock_quantity', document.getElementById('editStock').value);
  const imageFile = document.getElementById('editImage').files[0];
  if (imageFile) formData.append('image', imageFile);

  try {
    const response = await fetch(`/api/products/${currentEditId}`, {
      method: 'PUT',
      body: formData
    });
    const result = await response.json();
    if (response.ok) {
      alert(result.message);
      fetchProducts(); // Refresh list
      closeEditModal();
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    console.error('Error updating product:', error);
    alert('Gagal update produk');
  }
});

// Initialize
fetchProducts();
fetchOrders();

// 