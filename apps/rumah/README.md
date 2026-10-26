# Rumah Tropis

Figur isometrik interaktif: rumah tropis modern Indonesia dua lantai dengan carport, taman, kebun pangan, pohon
buah, area jemur, tandon air hujan dan zona homestead (kandang ayam, kompos, gudang alat), digambar dengan kit [Anatomy](https://github.com/wheresryan22/anatomy) di atas Next.js + TypeScript.
Kit-nya dipakai dari paket bersama `@anatomy/iso-kit` (`packages/iso-kit` di root).

## Menjalankan

Proyek ini bagian dari monorepo (lihat `README.md` di root). Dari root: `npm install` sekali, lalu
`npm run dev:rumah`. Dari folder ini perintah di bawah juga bisa dipakai langsung.

```sh
npm run dev      # membangun scene (cepat) lalu menjalankan Next.js di http://localhost:3000
npm run build    # membangun scene penuh (urutan gambar diselesaikan untuk semua pose) lalu next build
```

| Script | Fungsi |
|---|---|
| `npm run scene:fast` | Bangun ulang `scene.json` dengan urutan gambar diam saja (beberapa detik). |
| `npm run scene` | Bangun penuh, termasuk setiap frame saat rumah dibuka (±1 menit). |
| `npm run audit` | Bangun penuh + audit geometri: tidak ada pipa yang menembus benda, urutan gambar benar di setiap frame. |

## Mengubah rumah dengan teks

Di bawah gambar ada kotak **Ubah rumah**. Tulis permintaan seperti "tambah ayam jadi 6" atau "carport cukup 1 mobil";
Claude (`claude-opus-5-5`) mengubahnya menjadi konfigurasi baru, server membangun ulang scene (±5 detik), dan halaman
memuat ulang gambarnya. **Batalkan** mengembalikan perubahan terakhir, **Kembalikan awal** ke bentuk bawaan.

1. Salin `.env.example` menjadi `.env.local` dan isi `ANTHROPIC_API_KEY`.
2. `npm run dev`, buka http://localhost:3000, lalu tulis perubahan di kotak teks.

Yang bisa diubah dari teks (lihat `src/figures/homestead/config.ts` untuk batasnya): judul, jumlah mobil dan motor,
jumlah ayam, isi tiap bedengan (cabai, tomat, bayam, kangkung, terong, serai, pandan), pohon buah (pepaya, pisang,
jeruk nipis, jambu), pohon peneduh, lampu taman, dan balkon. Hal yang belum ada di konfigurasi (kolam renang, kamar
tambahan, denah ruang) perlu kode geometri baru; AI akan menyebutnya sebagai "belum bisa".

- Konfigurasi aktif disimpan di `data/homestead.json` (bisa di-commit), riwayat untuk "Batalkan" di
  `data/homestead-history.json`.
- Jawaban AI hanya berupa data: setiap nilai divalidasi dan dijepit ke batas aman oleh `sanitize()` sebelum dibangun.
  Pakai `npm run audit` dengan `HS_CONFIG` untuk mengaudit konfigurasi di ujung batasnya.
- Di **production** kotak ini hanya aktif bila `HS_EDIT_TOKEN` diatur, dan setiap permintaan harus membawa token itu.
  Tanpa token, pengunjung tidak bisa memakai kredit API Anda.
- Mengubah file di server butuh hosting Node.js dengan disk yang bisa ditulis (VPS, Docker, `next start`). Di hosting
  serverless (misalnya Vercel) file tidak bertahan; untuk itu simpan konfigurasi di database/KV.

## Struktur

```
src/
  app/                         halaman Next.js (layout, page, CSS global)
  app/api/homestead/route.ts   POST edit / undo / reset
  components/ThemeToggle.tsx   tombol tema terang/gelap
  figures/homestead/
    config.ts                  konfigurasi yang bisa diubah + batas aman + sanitize()
    model.ts                   angka nyata dari konfigurasi: luas, atap, air hujan, bedengan, telur, teks readout
    server/edit.ts             Claude → konfigurasi baru → build ulang scene, riwayat, batalkan
    HomesteadEdit.tsx          kotak teks "Ubah rumah"
    scene/                     geometri (dijalankan Node saat build, bukan di browser)
      world.ts                 tata letak kavling dan assembly yang bisa diangkat
      core.ts                  proyeksi, recorder audit, helper box/cyl/ball/pipe/compound
      stand.ts house.ts interior.ts roof.ts garden.ts food.ts coop.ts
      build.ts                 menyusun semuanya → generated/scene.json (+ preview HTML)
    generated/scene.json       hasil build: SVG per item, kunci urutan, data untuk halaman
    HomesteadFigure.tsx        server component: SVG statis, legenda dan keterangan
    HomesteadLive.tsx          client component: pegas explode, fokus/zoom, waktu, klik benda, ayam, tur
    homestead.css              token, mode malam (color-mix), kontrol
docs/concept.md                konsep, angka, dan daftar part
```

## Cara kerja

- Satuan dunia: 1 unit = 5 cm. Kamera isometrik azimuth 45°, elevasi 30°.
- Setiap part merekam bentuk aslinya ke recorder audit. `A.settle` menghitung urutan gambar dari geometri
  (ray-cast), bukan diatur dengan mata, untuk pose diam dan setiap frame saat atap/lantai 2 terangkat.
- Saat rumah dibuka, atap dan lantai 2 terangkat dan fasad sisi dekat disembunyikan agar ruang terlihat.
- Mode malam mencampur semua token warna ke palet malam dengan `color-mix`, jadi urutan dan bagian yang
  tertutup tetap benar. Lampu, lentera, dan kaca jendela menyala hangat.
- Adaptasi tropis digambar nyata: lantai +40 cm, tritisan 1,2 m, peneduh jendela, jendela tinggi untuk ventilasi
  silang, paving rumput, talang ke tandon dan sumur resapan.

## Kontrol

Arahkan kursor ke rumah untuk membukanya. Panah atas/bawah: buka lantai, **N**: siang/malam,
Esc: tutup. Klik benda untuk berinteraksi (pintu, lampu ruangan, panen, mobil, ayam). Saat tidak disentuh, figur
menjalankan tur otomatis. Tombol **Depan-kanan / Depan-kiri / Belakang-kiri / Belakang-kanan** memutar rumah 360°.

## Blueprint

`npm run blueprint` membuat `public/blueprint/blueprint-rumah-a3.pdf`, 5 lembar A3:

1. Kertas biru: tampak depan, belakang, samping kiri dan kanan dengan ukuran dan ketinggian, plus site plan.
2. Kertas biru: denah lantai 1 dan 2 dengan nama dan luas ruang.
3. Exploded view: pondasi, lantai, dinding dan atap dipisah per lapis.
4. Tampak 360°: rumah dari empat sudut.
5. Detail: dapur, servis, ruang keluarga, teras, kamar, kamar mandi, carport, kebun, kandang, tandon.

Semua gambar adalah scene yang sama dibangun dari kamera lain (`print/views.mjs`: `HS_AZIMUTH`, `HS_ELEVATION`,
`HS_PIECES`, `HS_OPEN`, `HS_EXPLODE`), dan setiap ukuran diproyeksikan lewat kamera tampak itu sendiri
(`print/sheets.mjs`). `npm run views` membangun ulang tampaknya saja.
