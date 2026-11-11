# Dapur Bunda Bahagia

Website pemesanan katering rumahan dengan panel admin. Node.js + Express + MySQL.

**Demo live:** https://dapur-bunda-naufal.vercel.app · **Panel admin:** https://dapur-bunda-naufal.vercel.app/admin.html

## Fitur

**Halaman toko**
- Menu per kategori dengan pencarian, foto, harga dalam format Rupiah, dan indikator stok (menipis/habis)
- Keranjang dengan pengatur jumlah yang tidak bisa melebihi stok; di HP muncul sebagai panel geser
- Checkout: tunai (tombol uang pas dan nominal cepat, kembalian otomatis), QRIS, atau kartu debit (simulasi, tanpa meminta data kartu)
- Struk pesanan yang bisa dicetak

**Panel admin**
- Ringkasan: penjualan hari ini dan 7 hari, pesanan menunggu, stok menipis, produk terlaris
- Pesanan: pesanan baru masuk sebagai *menunggu*, lalu ditandai selesai oleh admin
- Produk & stok: ubah stok langsung di tabel, edit, hapus, tambah produk dengan foto
- Laporan 7/30 hari dengan grafik batang dan rata-rata per pesanan

## Menjalankan

Salin `.env.example` menjadi `.env`, isi kredensial MySQL, lalu:

```bash
npm install
node server.js
```

## Versi online (mode demo)

Versi di Vercel memakai `api/demo.js` sebagai pengganti `server.js` + MySQL. Menu dan contoh pesanan diambil dari backup database. Pesanan dan perubahan stok tersimpan sementara di memori, sedangkan tambah/ubah/hapus produk dinonaktifkan.
