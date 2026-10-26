# Kamar William

Kamar William (3 × 3 × 3 m) dalam 3D realistis yang bisa dimasuki dari sudut pandang orang pertama: cat hangat,
panel kisi kayu oak, dipan rendah, lemari jati William dengan stikernya, meja kerja, rak baju, dan lampu oranye
remang yang bisa diatur. Next.js + TypeScript + Three.js (React Three Fiber).

## Menjalankan

Dari root monorepo: `npm run dev:kamar` (port 3001). Dari folder ini: `npm run dev`.

| Script | Fungsi |
|---|---|
| `npm run dev` | Next.js di http://localhost:3001 |
| `npm run blueprint` | Memotret model 3D lalu membuat `public/blueprint/blueprint-kamar-william-a3.pdf` (server hidup sebentar, lalu mati sendiri) |

## Kontrol

- **Lihat:** klik lalu geser. **Jalan:** W A S D / panah (Q E untuk belok), atau tombol arah di kanan bawah.
- **Sudut pandang:** Dari pintu, Bersandar di kasur, Di meja, Sudut lemari.
- **Klik benda:** lampu gantung rotan, LED headboard, LED kolong, lampu tidur, lampu meja, laptop, softbox, pintu, tirai, AC.
- **Panel kanan atas:** Malam/Siang, peredup, saklar tiap lampu, pintu, tirai, AC.
- **Simpan gambar** menyimpan tampilan saat ini; **Blueprint PDF** mengunduh lembar blueprint.

Kanvas hanya menggambar saat ada yang berubah (melihat, berjalan, menekan saklar), jadi kamar yang didiamkan tidak
memakai GPU sama sekali.

## Blueprint (4 lembar A3)

1. Kertas biru: denah (potongan +2,00) dan tampak keempat dinding dari dalam, dengan ukuran dalam milimeter.
2. Exploded view: dinding digeser keluar, plafon diangkat, bagian-bagian dinamai.
3. Tampak 360°: empat sudut kamar.
4. Detail: meja, kepala kasur, lemari, rak baju, pintu, jendela & AC, nakas, lampu gantung.

Semua gambar diambil dari model 3D yang sama oleh halaman `/blueprint` (`src/blueprint/`), lalu disusun oleh
`print/sheets.mjs`.

## Struktur

```
src/room/
  layout.ts        ukuran dan posisi semua benda (meter), juga dipakai untuk tabrakan saat berjalan
  materials.tsx    material PBR: plester, keramik, oak, jati, kain (tekstur CC0 dari ambientCG)
  pbr.ts           pemuat tekstur + UV dalam meter
  textures.ts      tekstur prosedural kecil: poster, stiker, lukisan, alas meja, layar
  Lights.tsx       semua lampu (2700 K), peredup, siang/malam
  Player.tsx       kamera orang pertama dan tabrakan
  Room.tsx         kanvas, efek (AO, bloom, AgX), panel kontrol
  parts/           Shell (dinding, pintu, jendela, AC), Bed, Desk, Storage, Decor
src/blueprint/     pemotret blueprint (shots.ts = daftar bidikan)
print/             blueprint.mjs (pipeline), sheets.mjs (tata letak PDF)
public/textures/   tekstur PBR (unduh ulang: node ../../scripts/fetch-textures.mjs kamar-william <id>)
```
