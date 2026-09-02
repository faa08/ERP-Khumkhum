<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

## Aturan UI (wajib)
- DILARANG memakai emoji sebagai icon, di mana pun.
- Semua icon memakai `lucide-react`. Import per-icon, jangan wildcard.
- Icon dekoratif: tambahkan `aria-hidden="true"`.
- Icon yang berdiri sendiri sebagai tombol: wajib punya `aria-label`.
- Ukuran icon pakai class Tailwind (w-4/w-5/w-6), warna pakai `currentColor`.

<!-- END:nextjs-agent-rules -->
