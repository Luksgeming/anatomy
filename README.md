# Anatomy · kumpulan figur isometrik

Monorepo berisi figur-figur interaktif yang dibangun dengan kit [Anatomy](https://github.com/wheresryan22/anatomy).
Setiap proyek di `apps/` adalah aplikasi Next.js sendiri: dijalankan, di-build, dan di-deploy terpisah.
Menjalankan satu proyek tidak menjalankan proyek lain.

```
anatomy/
├── packages/
│   └── iso-kit/        kit Anatomy (@anatomy/iso-kit), dipakai bersama semua proyek
└── apps/
    └── rumah/          Rumah Kebun: rumah 2 lantai, kolam, hidroponik NFT, kandang ayam
```

## Menjalankan

Pasang dependensi sekali dari root:

```sh
npm install
```

Lalu jalankan proyek yang diinginkan saja:

| Perintah (dari root) | Fungsi |
|---|---|
| `npm run dev:rumah` | Menjalankan Rumah Kebun di http://localhost:3000 |
| `npm run build:rumah` | Build produksi Rumah Kebun |
| `npm run start:rumah` | Menjalankan hasil build |
| `npm run audit:rumah` | Audit geometri Rumah Kebun |

Atau dengan nama workspace langsung: `npm run <script> -w apps/<nama>`. Detail tiap proyek ada di README-nya
(misalnya `apps/rumah/README.md`), termasuk `.env.local` milik proyek itu sendiri.

## Menambah proyek baru

1. Buat folder `apps/<nama>` berisi aplikasi Next.js (misalnya dengan
   `npx create-next-app@latest apps/<nama> --ts --app --src-dir --no-tailwind --use-npm`, lalu hapus
   `package-lock.json` dan `node_modules` di dalamnya karena dependensi dikelola dari root).
2. Di `apps/<nama>/package.json`: beri `"name": "<nama>"`, tambahkan `"@anatomy/iso-kit": "*"` ke `dependencies`,
   dan pakai port lain di script dev (misalnya `"dev": "next dev -p 3001"`), supaya bisa jalan bersamaan dengan rumah.
3. Di `apps/<nama>/next.config.ts`: tambahkan `transpilePackages: ["@anatomy/iso-kit"]`.
4. Jalankan `npm install` di root, lalu tambahkan script `dev:<nama>` dkk. di `package.json` root.
5. Impor kit dengan `import * as k from "@anatomy/iso-kit/iso-kit.mjs"` (begitu juga `lathe.mjs`, `tube.mjs`,
   `audit.mjs`, `gl.mjs`) dan CSS-nya dengan `import "@anatomy/iso-kit/iso.css"`.
   `apps/rumah/src/figures/homestead/scene/` adalah contoh lengkap cara membangun figur.

## Kit bersama

`packages/iso-kit` adalah salinan kit dari skill Anatomy, ditambah deklarasi tipe `.d.mts`. Perubahan di sini
berlaku untuk semua proyek; jalankan audit tiap proyek setelah mengubahnya.
