# Syno — Testing Flow
> Last updated: 2026-05-07

Butuh 2 akun berbeda untuk test fitur social (send, split, gift, friends). Buka 2 browser atau 1 normal + 1 incognito.

---

## SETUP

**Akun yang dibutuhkan:**
- **User A** — pengirim (browser normal)
- **User B** — penerima (incognito / browser lain)

**Pastikan:**
- App running: `npm run dev`
- `.env` sudah diisi (Supabase, Privy, Solana RPC, Firebase)
- Supabase: sudah run `supabase/full.sql`
- Devnet SOL: faucet di [faucet.solana.com](https://faucet.solana.com) pakai wallet address yang muncul di Profile

---

## 1. AUTH

### Login
- [ ] Buka `localhost:3000` → klik Get Started → redirect ke `/login`
- [ ] Login via Email OTP → masukkan kode → redirect ke `/onboarding`
- [ ] Login via Google OAuth → redirect ke `/onboarding`
- [ ] Login via Solana Wallet (Phantom/OKX) → redirect ke `/onboarding`

### Onboarding
- [ ] Isi username (minimal 3 karakter, huruf kecil) → klik Continue
- [ ] Redirect ke `/app` (dashboard)
- [ ] Cek Supabase tabel `users` → row baru dengan `wallet_address` dan `privy_wallet_id` terisi

### Logout
- [ ] Klik avatar di sidebar → Logout
- [ ] Redirect ke `/login`
- [ ] Refresh halaman setelah logout → tetap di `/login`, tidak loop

### Session restore
- [ ] Login → refresh halaman → tetap di `/app`, tidak minta login ulang
- [ ] Tutup tab → buka lagi → tetap logged in

---

## 2. DASHBOARD

- [ ] Balance card menampilkan saldo SOL + estimasi USD
- [ ] 6 action buttons tampil: Send, Request, Swap, Split, Gift, Payroll
- [ ] Holdings list tampil token yang dimiliki
- [ ] Recent activity tampil (kosong kalau baru daftar)
- [ ] Onboarding tour muncul saat pertama kali login (driver.js)
  - Tour harus cover semua 6 tombol aksi

---

## 3. SEND

**Prereq:** User A punya SOL di devnet, User B sudah terdaftar.

### Send SOL ke @username
- [ ] Klik Send → modal terbuka
- [ ] Ketik `@[username User B]` di field To
- [ ] Pilih token SOL, isi amount (misal 0.001)
- [ ] Klik Send → toast "Transaction confirmed" muncul
- [ ] Cek explorer link di toast → transaksi valid di devnet
- [ ] User B: cek balance bertambah
- [ ] User B: cek notifikasi muncul ("Payment received from @...")
- [ ] Cek Supabase tabel `payments` → row baru dengan `status: confirmed`

### Send SPL (USDC) ke @username
- [ ] Ulangi flow di atas, tapi pilih USDC sebagai token
- [ ] Pastikan User B punya USDC ATA terbuat otomatis

### Send ke wallet address langsung
- [ ] Di field To, paste wallet address 44 karakter
- [ ] Send berhasil tanpa perlu @username

### Auto-swap (inputToken != outputToken)
- [ ] Ini butuh setup payment link dulu (lihat section Request)
- [ ] Atau test via API langsung: kirim `inputToken: SOL_MINT, outputToken: USDC_MINT`

### Send dengan memo
- [ ] Isi field memo "buat makan siang"
- [ ] Cek notifikasi User B mengandung memo

---

## 4. REQUEST (Payment Link)

**Flow: User B minta bayar ke User A**

- [ ] User B klik Request → modal terbuka
- [ ] Isi amount + pilih token (USDC) + optional memo
- [ ] Klik Create Request → QR code + link muncul
- [ ] Klik Copy Link → paste ke browser baru → halaman `/pay/[id]` terbuka
- [ ] Di `/pay/[id]`: User A login → pilih token untuk bayar (bisa beda dari request token)
  - Kalau User A bayar pakai SOL tapi request USDC → Jupiter auto-swap
- [ ] Klik Pay → transaction confirmed
- [ ] User B: cek notifikasi "Payment request fulfilled"
- [ ] Cek Supabase `payments` → status berubah dari `pending` ke `confirmed`
- [ ] Share via WhatsApp/Telegram button berfungsi

---

## 5. SPLIT BILL

**Flow: User A bikin split, tambah User B sebagai peserta**

- [ ] Klik Split → modal terbuka
- [ ] Isi title "Makan malam", total amount 0.01 SOL
- [ ] Tambah peserta: ketik @username User B → klik Add
- [ ] Amount per orang terhitung otomatis
- [ ] Klik Create Split → berhasil
- [ ] User B: cek notifikasi "You've been added to a split"
- [ ] Cek halaman `/app/split` → split bill muncul di list
- [ ] Klik detail split → tampil status per peserta
- [ ] Copy link peserta User B → buka di browser User B
- [ ] User B bayar via payment link → status berubah ke `paid`
- [ ] User A: cek notifikasi "split_paid" dari User B
- [ ] Kalau semua peserta bayar → notifikasi "split_settled" ke User A
- [ ] Cek Supabase `split_bills` → status berubah ke `settled`

---

## 6. GIFT ENVELOPE

**Flow: User A bikin gift, User B claim**

### Buat gift
- [ ] Klik Gift → modal terbuka
- [ ] Isi total amount (misal 0.005 SOL), jumlah slot (misal 3)
- [ ] Klik Create Gift → link gift terbuat
- [ ] Share link → buka `/gift/[id]` di browser User B

### Claim gift (SOL)
- [ ] User B login → klik Claim
- [ ] Transaction confirmed
- [ ] User B: saldo bertambah (amount / total_slots)
- [ ] User A: notifikasi "Gift claimed by @..."
- [ ] Kalau slot habis → notifikasi "Gift fully claimed"

### Claim gift (SPL token)
- [ ] Ulangi dengan token USDC
- [ ] Pastikan partial signing berjalan: creator sign transfer, claimer sign sebagai fee payer
- [ ] Cek Supabase `gift_claims` → row baru per claim

### Edge cases
- [ ] Claim dua kali pakai akun yang sama → error "Already claimed"
- [ ] Slot habis → error "All slots claimed"

---

## 7. PAYROLL

**Flow: User A kirim ke banyak orang sekaligus**

- [ ] Klik Payroll → modal terbuka
- [ ] Tambah User B: @username, amount 0.001 SOL
- [ ] Tambah recipient lain (bisa pakai wallet address)
- [ ] Klik Send All → proses sequential, satu tx per orang
- [ ] Setiap recipient dapat notifikasi "Payroll received"
- [ ] Cek Supabase `payments` → multiple rows, masing-masing `confirmed`

---

## 8. SWAP

**Flow: tukar SOL ke USDC (atau token lain)**

- [ ] Klik Swap → modal terbuka
- [ ] Pilih input token: SOL, isi amount
- [ ] Pilih output token: USDC
- [ ] Quote dari Jupiter muncul otomatis (debounced 500ms)
- [ ] Tampil estimasi output + price impact + slippage
- [ ] Klik Swap → transaction confirmed
- [ ] Cek balance berubah: SOL berkurang, USDC bertambah

### Slippage
- [ ] Ubah slippage dari 0.5% ke 1% → quote update
- [ ] Swap tetap berhasil

---

## 9. PRIVATE SEND (MagicBlock)

**Prereq: USDC atau USDT saja**

- [ ] Di Send modal, aktifkan mode Private (toggle jika ada)
- [ ] Atau test via `/api/payments/private-send-umbra` langsung
- [ ] Transaction tidak muncul di on-chain history publik
- [ ] Receiver tetap dapat USDC

> Kalau fitur private send belum ada UI toggle-nya, skip dan test via Postman.

---

## 10. EARN (Jupiter Lend)

- [ ] Buka `/app/portfolio` → tab Earn (atau `/app/earn`)
- [ ] Tampil list lending markets dari Jupiter
- [ ] Cek APY dan TVL tampil
- [ ] Deposit: pilih market, isi amount → konfirmasi
- [ ] Cek posisi muncul di list "Your Positions"
- [ ] Withdraw: klik posisi → isi amount → konfirmasi

---

## 11. RECURRING PAYMENTS

- [ ] Buka `/app/recurring`
- [ ] Buat recurring baru: @username, amount, interval (daily/weekly/monthly)
- [ ] Recurring muncul di list
- [ ] Toggle pause/resume → status berubah
- [ ] Delete → hilang dari list
- [ ] Test trigger: `POST /api/recurring/run` → cek payment tereksekusi

---

## 12. NOTIFICATIONS

- [ ] Bell icon di sidebar menampilkan unread count (badge merah)
- [ ] Buka `/app/notifications` → list notifikasi muncul
- [ ] Klik satu notifikasi → status berubah ke read, badge berkurang
- [ ] Klik "Mark all read" → semua read, badge hilang

### FCM Push (browser notification)
- [ ] Pastikan browser notification permission: Allow
- [ ] User B login di browser yang berbeda
- [ ] User A kirim uang ke User B
- [ ] Browser User B (meski tab tidak aktif) menerima push notification
- [ ] Kalau tab aktif → service worker `showNotification` tetap muncul

### Semua trigger notifikasi:
| Event | Penerima |
|---|---|
| Send berhasil | Receiver |
| Payment link dibayar | Creator link |
| Split dibuat | Semua peserta |
| Peserta bayar split | Creator split |
| Semua peserta bayar split (settled) | Creator split |
| Gift di-claim | Creator gift |
| Semua slot gift di-claim | Creator gift |
| Payroll dikirim | Setiap recipient |
| Seseorang add kamu sebagai friend | Kamu |

---

## 13. FRIENDS

- [ ] Buka `/app/people` → tab Friends
- [ ] Klik Add Friend → isi @username User B → Add
- [ ] User B muncul di friends list
- [ ] User B: cek notifikasi "added you as a friend"
- [ ] Remove friend → hilang dari list
- [ ] Send modal: klik ikon Users → dropdown friends muncul → pilih User B → otomatis terisi

---

## 14. ACTIVITY & HISTORY

- [ ] Buka `/app/activity`
- [ ] Tab "In-App": tampil semua payments dari Supabase
- [ ] Tab "On-Chain": tampil tx history dari Helius
- [ ] Filter bekerja (kalau ada)
- [ ] Export: klik Export → download CSV/PDF dengan data transaksi

---

## 15. PORTFOLIO & ANALYTICS

- [ ] Buka `/app/portfolio`
- [ ] Balance dalam USD tampil
- [ ] Holdings chart (ApexCharts) tampil
- [ ] Toggle USD/token amount di input
- [ ] Spending analytics: tampil chart pengeluaran per periode
- [ ] GoldRush wallet risk score tampil

---

## 16. PROFILE

- [ ] Buka `/app/profile`
- [ ] Username tampil
- [ ] Wallet address tampil (shortAddr format)
- [ ] Klik Export Private Key → muncul konfirmasi → private key tampil (devnet, aman)
- [ ] Avatar (Dicebear generated) tampil

---

## 17. DARK MODE

- [ ] Klik toggle dark mode di sidebar
- [ ] Semua halaman berubah ke dark
- [ ] Refresh halaman → preference tersimpan
- [ ] Landing page (`/`) tidak terpengaruh dark mode

---

## 18. LANDING PAGE & PUBLIC PAGES

- [ ] `/` — landing page tampil (hardcoded light colors)
- [ ] `/pay/[id]` — bisa dibuka tanpa login, setelah bayar redirect ke signup
- [ ] `/gift/[id]` — bisa dibuka tanpa login, setelah claim redirect ke signup

---

## QUICK SANITY CHECK (sebelum demo/pitch)

Urutan test minimal 5 menit sebelum presentasi:

```
1. Login User A → dashboard load
2. Send 0.001 SOL ke User B → confirmed
3. User B cek notifikasi muncul
4. Buat gift 0.003 SOL 3 slot → share link
5. User B claim → balance bertambah
6. Cek /app/activity → transaksi keduanya muncul
```

Kalau 6 langkah ini works → app siap demo.

---

## KNOWN EDGE CASES

| Situasi | Expected behavior |
|---|---|
| Send ke diri sendiri | Error "Cannot send to yourself" |
| Username tidak ditemukan | Error "User not found" |
| Saldo tidak cukup | Tx gagal di Solana, error dari RPC |
| Gift slot habis | Error "All slots claimed" |
| Claim gift dua kali | Error "Already claimed" |
| Add friend dua kali | Error "Already a friend" |
| Payment link sudah dibayar | Error "Payment link not found or already paid" |
| Session expired | Redirect ke `/login`, tidak loop |
