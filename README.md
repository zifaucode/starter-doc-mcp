# starter-doc-mcp

[![CI](https://github.com/zifaucode/starter-doc-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/zifaucode/starter-doc-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933.svg)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/MCP-server-6e56cf.svg)](https://modelcontextprotocol.io)

Server [Model Context Protocol](https://modelcontextprotocol.io) yang menghasilkan dokumen rekayasa perangkat lunak (PRD, SRS, ERD, SDD, DESIGN, matriks keterlacakan, dan instruksi agen) sebagai Markdown, supaya agen coding membangun dari spesifikasi tertulis dan tidak menebak.

Prinsip utamanya: **yang tidak diberikan tidak dikarang.** Bagian yang belum kamu isi tampil sebagai `[NOT SUPPLIED]` atau `UNMAPPED`, bukan diisi data palsu.

## Isi

- [Instalasi](#instalasi)
- [Pasang di editor](#pasang-di-editor)
- [Cara memanggil](#cara-memanggil)
- [Tool yang tersedia](#tool-yang-tersedia)
- [Dokumen yang dihasilkan](#dokumen-yang-dihasilkan)
- [Mode lite dan full](#mode-lite-dan-full)
- [Preset](#preset)
- [Batasan](#batasan)
- [Pengembangan](#pengembangan)

## Instalasi

Butuh Node.js 18 atau lebih baru.

**Cara cepat, tanpa clone** (saat pertama dijalankan, npm membangun paketnya sendiri):

```bash
npx -y github:zifaucode/starter-doc-mcp
```

**Dari kode sumber:**

```bash
git clone https://github.com/zifaucode/starter-doc-mcp.git
cd starter-doc-mcp
npm install
npm run build
```

Hasil build ada di `dist/index.js`. Server berbicara lewat stdio, jadi tidak membuka port dan tidak butuh variabel lingkungan.

## Pasang di editor

Semua klien memakai pola yang sama: satu perintah dan satu argumen. Ganti `ABSOLUTE_PATH` dengan lokasi hasil clone-mu.

### Zed

Buka `settings.json` (`zed: open settings`), lalu tambahkan:

```json
{
  "context_servers": {
    "starter-doc-mcp": {
      "enabled": true,
      "remote": false,
      "command": "npx",
      "args": ["-y", "github:zifaucode/starter-doc-mcp"]
    }
  }
}
```

Dari hasil clone: ganti `command` dengan `node` dan `args` dengan `["ABSOLUTE_PATH/dist/index.js"]`. Di Windows, tulis garis miring ganda terbalik (`D:\\proyek\\starter-doc-mcp\\dist\\index.js`).

### Claude Code

```bash
claude mcp add starter-doc-mcp -- npx -y github:zifaucode/starter-doc-mcp
```

### Claude Desktop

`claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "starter-doc-mcp": {
      "command": "npx",
      "args": ["-y", "github:zifaucode/starter-doc-mcp"]
    }
  }
}
```

### Cursor, Windsurf, Cline, Roo Code

Bentuk JSON-nya sama dengan Claude Desktop. Letakkan di `.cursor/mcp.json` untuk Cursor, atau di berkas konfigurasi MCP milik editor masing-masing.

Setelah menyimpan, restart editor atau muat ulang server MCP-nya. Jika tool tidak muncul, cek lognya. Penyebab paling umum: path salah, atau `npm run build` belum dijalankan.

## Cara memanggil

Tidak ada perintah slash. Minta dengan kalimat biasa dan sebut nama servernya, lalu model memilih tool. Pakai model yang mendukung tool use.

Satu paket lengkap:

```
Pakai starter-doc-mcp, buat blueprint untuk "Tagihan Freelancer".
Deskripsi: aplikasi pencatat dan pengirim invoice untuk freelancer.
Fitur utama: buat invoice, kirim invoice lewat email, tandai lunas.
Mode lite, simpan ke docs/blueprint.
```

Satu dokumen saja:

```
Pakai starter-doc-mcp, buat SRS saja untuk proyek ini, simpan ke docs/SRS.md.
```

Audit:

```
Audit docs/blueprint/02_SRS.md dengan audit_spec_completeness.
```

Jika tool tidak terpanggil, sebut namanya: "pakai tool `generate_full_blueprint` dari starter-doc-mcp".

Saran alur kerja:

1. Panggil `generate_full_blueprint` dengan `outputDir`. Balasannya pendek dan memuat daftar **Still to supply**, yaitu hal yang masih harus kamu isi.
2. Lengkapi daftar itu, lalu panggil ulang.
3. Jalankan `audit_spec_completeness` pada dokumen yang penting.
4. Minta agen coding membaca `00_AGENT_INSTRUCTIONS.md` lebih dulu.

`outputDir` dan `outputPath` dihitung dari folder kerja server. Untuk menyimpan di tempat tertentu, tulis path lengkapnya.

## Tool yang tersedia

| Tool | Fungsi |
| :--- | :--- |
| `generate_full_blueprint` | Menghasilkan ketujuh dokumen sekaligus. |
| `generate_prd` | PRD: persona, in-scope dan out-of-scope, prioritas MoSCoW, skenario Gherkin. |
| `generate_srs` | SRS: kebutuhan fungsional bernomor, aturan bisnis, matriks error, kebutuhan non-fungsional. |
| `generate_erd` | ERD: diagram Mermaid, kamus data, DDL migrasi SQL. |
| `generate_sdd` | SDD: diagram arsitektur, kontrak API, ADR. |
| `generate_design_spec` | DESIGN: token desain, tipografi, matriks 5 state layar, aturan anti-slop. |
| `audit_spec_completeness` | Memeriksa teks spesifikasi dengan rubrik berbasis pola, lalu memberi skor 0 sampai 100. |
| `list_blueprint_templates` | Menampilkan preset yang tersedia. |

Parameter yang umum:

| Parameter | Keterangan |
| :--- | :--- |
| `projectName`, `description` | Wajib. |
| `keyFeatures` | Fitur beserta `businessRules`, `gherkinScenarios`, dan tautan `endpoints`, `entities`, `screens`. |
| `entities`, `apiEndpoints`, `uiScreens` | Model data, kontrak API, dan layar. |
| `techStack`, `nfr`, `outOfScope` | Teknologi, target non-fungsional, dan batasan lingkup. |
| `templatePreset` | `saas-b2b`, `ecommerce`, atau `ai-agent-platform`. Opsional. |
| `detail` | `lite` atau `full` (default `full`). |
| `outputDir` / `outputPath` | Lokasi simpan. Tanpa ini, tidak ada yang tersimpan. |
| `includeContent` | Hanya untuk `generate_full_blueprint` tanpa `outputDir`: kembalikan isi lengkap (besar, sekitar 12 ribu token). |

## Dokumen yang dihasilkan

| Berkas | Isi |
| :--- | :--- |
| `00_AGENT_INSTRUCTIONS.md` | Urutan kerja untuk agen coding dan aturan berhenti saat ada celah. |
| `01_PRD.md` | Lingkup, persona, prioritas, skenario Gherkin. |
| `02_SRS.md` | Kebutuhan fungsional `SRS-FR-xxx`, aturan bisnis, error, non-fungsional. |
| `03_ERD.md` | Tabel, relasi, indeks, DDL. Urutan tabel mengikuti dependensi foreign key. |
| `04_SDD.md` | Arsitektur, endpoint, urutan alur, ADR berstatus `PROPOSED`. |
| `05_DESIGN.md` | Desain visual dan state layar, plus aturan UI dan teks. |
| `06_TRACEABILITY_MATRIX.md` | Tautan fitur ke endpoint, tabel, dan layar, plus daftar yang tidak terpakai. |

Dokumen ini adalah **draf untuk ditinjau manusia**. PRD berstatus `DRAFT_FOR_REVIEW`, dan generator tidak menyetujui hasilnya sendiri.

## Mode lite dan full

`full` memuat semuanya. `lite` membuang materi referensi (glosarium, diagram, tabel risiko, bentuk fixture, wireframe) dan mempertahankan isi yang dipakai untuk membangun: lingkup, aturan, skema, kontrak API, dan matriks state. Pada preset `saas-b2b`, `lite` kira-kira 24% lebih kecil.

## Preset

Preset hanya dipakai jika kamu menyebutnya lewat `templatePreset`. Tanpa itu, tidak ada fitur, tabel, atau endpoint yang dipinjam dari produk lain, dan bagian kosong ditandai `[NOT SUPPLIED]`.

## Batasan

- **Auditor memeriksa pola teks.** Ia mencari kata ambigu, kode error, skenario Gherkin, tipe data, dan state layar. Skor tinggi berarti pola itu ada, bukan berarti spesifikasinya benar.
- **Skor dokumen tunggal bisa rendah.** Rubrik menilai satu paket. Gherkin, misalnya, hanya ada di PRD.
- **Bagian 3.0 SRS berbentuk API web** (token Bearer, kode HTTP). Sesuaikan jika produkmu bukan layanan web.
- **Rancangan data dari input bukan fakta.** Tabel, endpoint, dan layar yang kamu atau agen usulkan perlu ditinjau sebelum dipakai.
- DDL berdialek PostgreSQL. Untuk mesin lain, dokumen memberi peringatan agar kamu menerjemahkannya.

## Pengembangan

```bash
npm install
npm run dev      # jalankan server dari sumber (tsx)
npm run build    # bangun dist/index.js
npm test         # jalankan test
```

Struktur:

```
src/
  index.ts        definisi tool MCP dan skema input
  engine/         generator (gabungan input dan preset) dan auditor
  templates/      satu berkas per dokumen, plus preset
  types/          tipe data proyek
  utils/          penulisan berkas
tests/            test dengan node:test
```

Menambah dokumen baru: buat `src/templates/<nama>.ts`, panggil dari `src/engine/generator.ts`, daftarkan tool-nya di `src/index.ts`, dan tambah test di `tests/`. Lihat [CONTRIBUTING.md](CONTRIBUTING.md).

## Lisensi

[MIT](LICENSE)
