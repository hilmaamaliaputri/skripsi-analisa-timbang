# Koleksi Jurnal

Rujukan untuk skripsi **Implementasi CRNN-CTC untuk Pengenalan Angka Display
Seven Segment pada Aplikasi Pencatatan Timbangan Digital Berbasis PWA**.

Dikumpulkan 15 Oktober 2026 dari Crossref, OpenAlex, DOAJ, dan Garuda.

---

## Isi folder

```
jurnal/
│
├── README.md                 ← kamu sedang di sini
├── INDEKS-JURNAL.md          ← indeks utama, dikelompokkan per kebutuhan bab
├── UNDUH-MANUAL.md           ← paper yang perlu kamu unduh sendiri
├── references.bib            ← BibTeX siap pakai
├── data-open-access.json     ← data mentah status akses & kualitas jurnal
│
└── pdf/                      ← 29 berkas PDF
```

---

## Cara memakai

**Kalau kamu butuh rujukan untuk bab tertentu**

Buka `INDEKS-JURNAL.md`. Paper di situ sudah dikelompokkan sesuai kebutuhan bab:

- **Kelompok A** — pondasi metode, CRNN dan CTC
- **Kelompok B** — objek penelitian, seven segment dan display meter
- **Kelompok C** — inferensi on-device, ONNX, WebAssembly
- **Kelompok D** — Progressive Web App dan offline-first
- **Kelompok E** — data sintetis dan augmentasi
- **Kelompok F** — evaluasi dan metrik

**Kalau kamu butuh PDF-nya**

Buka folder `pdf/`. Nama berkasnya berpola `tahun_penulis_judul.pdf`, jadi bisa
diurutkan langsung dengan pengelola berkas.

**Kalau kamu butuh sitasi**

Ambil dari `references.bib`. Kuncinya juga tercantum di `INDEKS-JURNAL.md`,
jadi kamu bisa cocokkan mana entri BibTeX untuk paper mana.

---

## Status akses

Dari 111 DOI yang diperiksa lewat Unpaywall:

| Status | Jumlah | Artinya |
|---|---|---|
| Sudah terunduh | 29 | Ada di folder `pdf/` |
| Diblokir penerbit | 21 | Open access, tapi perlu kamu klik sendiri |
| Tertutup | 46 | Butuh akses institusi atau pembelian |
| Gagal diperiksa | 7 | DOI tidak valid, entri sampah |

Penjelasan lebih rinci:

**Sudah terunduh (29 berkas)**

Semua sudah diverifikasi byte pertamanya `%PDF`, bukan halaman HTML yang menyamar.
Ukuran total sekitar 47 MB.

**Diblokir penerbit (21 berkas)**

Paper-paper ini **lisensinya bebas** — open access atau CC-BY. Yang menghalangi
bukan hak akses, melainkan proteksi anti-bot Cloudflare yang menolak unduhan
otomatis. Tautan langsungnya ada di `UNDUH-MANUAL.md`; buka di browser dan
unduh satu per satu.

**Tertutup (46 berkas)**

Mayoritas dari IEEE dan ACM. Perpustakaan Unsil biasanya berlangganan IEEE
Xplore. Kalau iya, unduh dari sana lalu taruh di folder `pdf/`.

---

## Cara membaca kolom kualitas

Di `INDEKS-JURNAL.md` ada kolom `DOAJ`, `h`, `2y`, dan `Negara`.

**`DOAJ`** — jurnal terdaftar di Directory of Open Access Journals.

**`h`** — indeks-h jurnal di OpenAlex. Makin besar, makin banyak disitasi.

**`2y`** — rata-rata sitasi dua tahun terakhir. Ini proksi impact factor.

**`Negara`** — negara penerbit.

### Peringatan penting

Angka-angka di atas adalah **sinyal dari OpenAlex, bukan sertifikat akreditasi.**

Jangan menulis "jurnal ini Sinta 2" atau "Scopus Q1" hanya berdasar tabel itu.
Akreditasi jurnal Indonesia hanya sah kalau dicek di Sinta. Peringkat Scopus
hanya sah kalau dicek di Scopus.

### Tanda †

Sebagian baris di indeks ditandai **†**. Artinya wadahnya bukan jurnal, melainkan
repositori preprint seperti SSRN, Zenodo, atau repositori kampus.

Angka `h` dan `2y` pada baris bertanda † adalah milik wadahnya, **bukan** mutu
papernya. Contohnya SSRN punya indeks-h 417 karena platformnya besar — itu tidak
berarti paper di dalamnya bermutu tinggi. Paper di wadah begini biasanya belum
melalui peer review.

---

## Dua paper pondasi

Dua paper ini adalah dasar metode skripsimu. Keduanya sudah ada di `pdf/`.

**CTC — Graves, Fernández, Gomez, Schmidhuber (2006)**

: *Connectionist Temporal Classification: Labelling Unsegmented Sequence Data
  with Recurrent Neural Networks.* ICML 2006.
  DOI `10.1145/1143844.1143891`

  Paper asal algoritma CTC. Tertutup di Unpaywall, tapi versi resminya tersedia
  bebas di situs penulisnya sendiri. Sudah diunduh.

**CRNN — Shi, Bai, Yao (2017)**

: *An End-to-End Trainable Neural Network for Image-based Sequence Recognition
  and Its Application to Scene Text Recognition.* IEEE TPAMI.
  DOI `10.1109/tpami.2016.2646371`

  Arsitektur CRNN yang kamu pakai. Terbit di IEEE TPAMI, indeks-h jurnal 562 —
  salah satu venue puncak di bidang ini.

---

## Catatan pemakaian

**Belum satu pun dibaca.** DOI dan judulnya benar, tapi judul yang benar tidak
berarti isinya relevan. Baca minimal abstraknya sebelum memasukkannya ke daftar
pustaka.

**PDF bukan selalu versi final penerbit.** Unpaywall bisa mengembalikan preprint
atau versi penulis. Untuk sitasi resmi, rujuk DOI dan periksa nomor halaman di
versi penerbit.

**Bidang ini didominasi prosiding konferensi.** IEEE TPAMI memang jurnal, tapi
ECTI-CON, ICASSP, KST, JCSSE, dan TENCON adalah prosiding konferensi. Di ilmu
komputer, konferensi top justru lebih bergengsi daripada banyak jurnal. Ini
normal dan diterima di sidang.

**Periksa lisensi sebelum mengutip panjang.** Sebagian CC-BY, sebagian tertutup.
Kolom lisensi ada di `data-open-access.json`.
