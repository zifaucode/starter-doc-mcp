# Berkontribusi

Terima kasih sudah mau membantu. Pull request kecil dan terfokus paling mudah ditinjau.

## Menyiapkan

```bash
git clone https://github.com/zifaucode/starter-doc-mcp.git
cd starter-doc-mcp
npm install
npm test
```

## Sebelum membuka pull request

1. `npx tsc --noEmit` bersih.
2. `npm test` lulus.
3. Perubahan perilaku punya test di `tests/`.
4. Perubahan yang terlihat pengguna dicatat di `CHANGELOG.md`.

## Aturan isi template

Template dokumen adalah hasil yang dibaca agen coding, jadi aturannya ketat:

- **Jangan mengarang data.** Nilai yang tidak diberikan pengguna ditulis `[NOT SUPPLIED]`, bukan diisi contoh yang tampak nyata.
- **Jangan menyatakan hasil yang tidak diperiksa.** Contoh: status `APPROVED` atau `PASSED` yang ditulis generator sendiri.
- Tanpa em dash dan tanpa emoji di teks hasil. Test sudah memeriksanya untuk beberapa dokumen.
- Hindari kata kosong (misalnya unlock, seamless, cutting-edge) dan klaim tanpa bukti.
- Isi dokumen yang sama tidak boleh ditulis dua kali. Taruh sekali dan rujuk dari tempat lain.

## Melaporkan masalah

Sertakan input tool yang dipakai (tanpa data pribadi), keluaran yang kamu dapat, dan keluaran yang kamu harapkan.
