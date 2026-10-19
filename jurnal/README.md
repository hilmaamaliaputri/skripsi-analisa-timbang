# Koleksi Jurnal

Rujukan untuk skripsi:

> **Implementasi CRNN-CTC untuk Pengenalan Angka Display Seven Segment pada
> Aplikasi Pencatatan Timbangan Digital Berbasis PWA**

Dikumpulkan 15 Oktober 2026 dari Crossref, OpenAlex, DOAJ, dan Garuda.
Diperbarui 19 Oktober 2026.

---

## Isi folder

```
jurnal/
│
├── README.md                 ← kamu sedang di sini
├── INDEKS-JURNAL.md          ← indeks utama: tabel per bab + kunci BibTeX
├── UNDUH-MANUAL.md           ← tautan paper yang perlu kamu unduh sendiri
├── references.bib            ← 76 entri BibTeX, siap dipakai LaTeX
├── data-open-access.json     ← data mentah: status akses, indeks-h, negara
│
└── pdf/                      ← 29 berkas PDF (22 relevan, 7 di luar topik)
```

`latex/references.bib` dan `jurnal/references.bib` isinya sama. Yang di folder
`jurnal/` ini versi induk.

---

## Cara memakai

### Kalau kamu butuh rujukan untuk bab tertentu

Buka `INDEKS-JURNAL.md`. Paper di sana dikelompokkan menurut kebutuhan bab,
bukan menurut tahun:

| Kelompok | Isi | Jumlah |
|---|---|---|
| **A** | Pondasi metode — CRNN dan CTC | 23 |
| **B** | Objek penelitian — seven segment dan display meter | 31 |
| **C** | Inferensi on-device — ONNX, WebAssembly, edge | 12 |
| **D** | Progressive Web App dan offline-first | 5 |
| **E** | Data sintetis dan augmentasi | 0 |
| **F** | Evaluasi dan metrik | 5 |

Kelompok E kosong. Paper sintetis yang ditemukan semuanya tentang objek lain
(livestock, radar, pejalan kaki), jadi tidak lolos saring relevansi. Ini artinya
kamu masih perlu mencari sendiri rujukan untuk bagian data sintetis.

### Kalau kamu butuh PDF-nya

Buka folder `pdf/`. Nama berkasnya berpola `tahun_penulis_judul.pdf`, jadi bisa
langsung diurutkan.

Status tiap paper ada di kolom **PDF** pada indeks:

- `ada` — berkasnya sudah ada di folder `pdf/`
- `403` — lisensinya bebas, tapi penerbit memblokir unduhan otomatis. Unduh
  sendiri lewat tautan di `UNDUH-MANUAL.md`
- `tertutup` — butuh akses institusi atau pembelian

### Kalau kamu butuh sitasi LaTeX

Ambil dari `references.bib`. Ada 76 entri.

Daftar kuncinya ada di bagian **Kunci BibTeX** pada `INDEKS-JURNAL.md`, lengkap
dengan judul dan tahun, jadi kamu bisa tahu kunci mana untuk paper mana.

```latex
\parencite{gravesalex2006connectionis}   % CTC, Graves dkk. 2006
```

Sudah diuji: `main.tex` dengan `references.bib` ini terkompilasi bersih —
5 sitasi terpasang, nol undefined.

### Kalau kamu butuh data mentah

`data-open-access.json` berisi 111 record: DOI, judul, penulis, tahun, status
akses, indeks-h jurnal, negara penerbit. Dipakai kalau kamu mau menghitung
sendiri atau menyaring ulang.

---

## Status akses

Dari 111 DOI yang diperiksa lewat Unpaywall:

| Status | Jumlah | Artinya |
|---|---|---|
| Open access | 65 | Boleh dibaca dan diunduh |
| └ gold | 36 | Terbit langsung open access di jurnalnya |
| └ green | 15 | Versi penulis di repositori kampus |
| └ hybrid | 10 | Jurnal berlangganan, artikel ini dibuka |
| └ bronze | 4 | Gratis dibaca di situs penerbit, tanpa lisensi terbuka |
| Tertutup | 39 | Butuh akses institusi atau pembelian |
| Gagal diperiksa | 7 | DOI tidak terdaftar di Unpaywall |

Dari 49 paper yang punya tautan PDF langsung, **29 berhasil diunduh** dan
**20 ditolak penerbit** dengan `HTTP 403`.

Yang 20 itu bukan soal lisensi — lisensinya bebas. Yang menghalangi adalah
proteksi anti-bot Cloudflare yang menolak unduhan otomatis. Tautannya ada di
`UNDUH-MANUAL.md`; buka di browser dan unduh satu per satu.

Mayoritas yang tertutup berasal dari IEEE dan ACM. Perpustakaan Unsil biasanya
berlangganan IEEE Xplore. Kalau iya, unduh dari sana lalu taruh di `pdf/`.

---

## Cara membaca kolom kualitas

Di `INDEKS-JURNAL.md` ada kolom `DOAJ`, `h`, `2y`, dan `Negara`.

**`DOAJ`** — jurnal terdaftar di Directory of Open Access Journals.

**`h`** — indeks-h jurnal di OpenAlex. Makin besar, makin banyak disitasi.

**`2y`** — rata-rata sitasi dua tahun terakhir. Ini proksi impact factor.

**`Negara`** — negara penerbit.

### Peringatan penting

Angka-angka itu **sinyal dari OpenAlex, bukan sertifikat akreditasi.**

Jangan menulis "jurnal ini Sinta 2" atau "Scopus Q1" hanya berdasar tabel itu.
Akreditasi jurnal Indonesia hanya sah kalau dicek di Sinta. Peringkat Scopus
hanya sah kalau dicek di Scopus.

### Tanda †

Sebagian baris ditandai **†**. Artinya wadahnya bukan jurnal, melainkan
repositori preprint seperti SSRN, Zenodo, atau repositori kampus.

Angka `h` dan `2y` pada baris bertanda † adalah milik wadahnya, **bukan** mutu
papernya. SSRN punya indeks-h 417 karena platformnya besar — itu tidak berarti
paper di dalamnya bermutu tinggi. Paper di wadah begini biasanya belum melalui
peer review.

---

## Dua paper pondasi

Keduanya sudah ada di `pdf/`.

**CTC — Graves, Fernández, Gomez, Schmidhuber (2006)**

: *Connectionist Temporal Classification: Labelling Unsegmented Sequence Data
  with Recurrent Neural Networks.* ICML 2006.
  DOI `10.1145/1143844.1143891`

  Paper asal algoritma CTC. Tertutup di Unpaywall, tapi versi resminya tersedia
  bebas di situs penulisnya sendiri.

**CRNN — Shi, Bai, Yao (2017)**

: *An End-to-End Trainable Neural Network for Image-based Sequence Recognition
  and Its Application to Scene Text Recognition.* IEEE TPAMI.
  DOI `10.1109/tpami.2016.2646371`

  Arsitektur CRNN yang kamu pakai. Terbit di IEEE TPAMI, indeks-h jurnal 562 —
  salah satu venue puncak di bidang ini.

---

## Catatan pemakaian

**Belum satu pun dibaca.**

Judul dan DOI-nya benar, tapi judul yang benar tidak berarti isinya relevan.
Baca minimal abstraknya sebelum memasukkannya ke daftar pustaka. Paper yang
tidak kamu baca jangan dimasukkan.

**PDF bukan selalu versi final penerbit.**

Unpaywall bisa mengembalikan preprint atau versi penulis. Untuk sitasi resmi,
rujuk DOI dan periksa nomor halaman di versi penerbit.

**Bidang ini didominasi prosiding konferensi.**

IEEE TPAMI memang jurnal, tapi ECTI-CON, ICASSP, KST, JCSSE, dan TENCON adalah
prosiding konferensi. Di ilmu komputer, konferensi top justru lebih bergengsi
daripada banyak jurnal. Ini normal dan diterima di sidang.

**Periksa lisensi sebelum mengutip panjang.**

Sebagian CC-BY, sebagian tertutup. Kolom lisensi ada di `data-open-access.json`.

**Jangan mengarang klaim akreditasi.**

Lihat peringatan di bagian Cara membaca kolom kualitas.

---

## Yang disaring keluar

Dari 111 record, tidak semuanya masuk indeks:

| Keputusan | Jumlah | Alasan |
|---|---|---|
| Masuk indeks dan BibTeX | 76 | Relevan dengan topik skripsi |
| Dipisah "di luar topik" | 26 | Ikut terbawa pencarian, tidak relevan |
| Dibuang | 9 | Tanpa tahun terbit, atau lampiran Crossref |

Yang **dibuang** tidak muncul di mana pun: 9 record itu berupa potongan lampiran
(`..._supp1.pdf`) dan rekaman tesis di repositori kampus tanpa tahun. Keduanya
tidak bisa disitasi dengan benar.

Yang **di luar topik** tetap didaftar di bagian bawah `INDEKS-JURNAL.md` supaya
kamu tahu apa saja yang sempat terbawa. Tujuh di antaranya PDF-nya ikut terunduh
dan boleh dihapus kalau mengganggu.

---

## Cara memperbarui

Kalau nanti kamu menemukan paper baru dan mau memasukkannya:

1. Taruh PDF-nya di `pdf/` dengan nama `tahun_penulis_judul.pdf`.
2. Tambahkan entrinya ke `references.bib` secara manual, atau lewat Zotero
   (local API aktif di `http://127.0.0.1:23119/api/`).
3. Tambahkan barisnya ke kelompok yang sesuai di `INDEKS-JURNAL.md`.

Jangan menjalankan ulang skrip pengumpul tanpa memeriksa hasilnya. Skrip itu
menimpa `references.bib` dan `INDEKS-JURNAL.md` dari data mentah. Entri yang
kamu tambahkan manual akan hilang kalau tidak ikut masuk ke
`data-open-access.json`.
