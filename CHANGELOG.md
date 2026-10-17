# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/), versi mengikuti [SemVer](https://semver.org/).

## [1.1.0]

### Ditambahkan
- Parameter `detail` (`lite` atau `full`) pada semua tool `generate_*`.
- Parameter `includeContent` pada `generate_full_blueprint`.
- Field `endpoints`, `entities`, dan `screens` pada fitur, dipakai matriks keterlacakan.
- Bagian Orphans pada matriks keterlacakan: endpoint, tabel, dan layar yang tidak dipakai fitur mana pun.
- Aturan anti-slop untuk UI dan teks di `05_DESIGN.md`.
- Pemeriksaan kualitas tulisan dan placeholder pada `audit_spec_completeness`.

### Diubah
- Preset hanya dipakai jika `templatePreset` disebut. Sebelumnya `saas-b2b` dipakai diam-diam.
- Bagian yang tidak diisi ditandai `[NOT SUPPLIED]` atau `UNMAPPED`, tidak diisi data contoh.
- Status PRD menjadi `DRAFT_FOR_REVIEW`, dan ADR menjadi `PROPOSED`.
- `generate_full_blueprint` tanpa `outputDir` tidak lagi mengembalikan potongan 500 karakter. Isi lengkap hanya dikirim dengan `includeContent: true`.
- Skema `techStack` dan `nfr` dipakai bersama oleh semua tool, sehingga field tidak lagi terbuang.
- Auditor memakai pola yang lebih ketat untuk kode error, Gherkin, dan state UI.

### Diperbaiki
- DDL: aturan `ON DELETE` mengikuti `cascadeRules`. Sebelumnya setiap foreign key menjadi `CASCADE`.
- DDL: sintaks `REFERENCES tabel(kolom)` dan urutan tabel induk lebih dulu.
- DDL: `CREATE INDEX IF NOT EXISTS`, dan setiap foreign key diberi indeks.
- Auditor: kata `etc.` sekarang terdeteksi.

## [1.0.0]

- Rilis awal: tujuh dokumen, delapan tool, tiga preset.
