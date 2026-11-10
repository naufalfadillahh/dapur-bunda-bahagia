# Dapur Bunda Bahagia

Website pemesanan katering dengan panel admin (produk, stok, pesanan, laporan). Node.js + Express + MySQL.

Jalankan: salin `.env.example` menjadi `.env`, isi kredensial MySQL, lalu `npm install` dan `node server.js`.

## Versi online (mode demo)

Versi di Vercel memakai `api/demo.js` sebagai pengganti `server.js` + MySQL. Menu dan contoh pesanan diambil dari backup database. Pesanan dan perubahan stok tersimpan sementara di memori, sedangkan tambah/ubah/hapus produk dinonaktifkan.

