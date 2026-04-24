---
trigger: always_on
---

# NextJS-Pro AI Agent Skill (Antigravity)

NextJS-Pro AI Agent Skill adalah workflow terstruktur untuk membangun aplikasi Next.js tingkat senior: scalable, performant, dan mengikuti best practices modern (App Router-first).

---

## 1. Context Awareness (WAJIB SEBELUM NGODING)

AI HARUS:

- Mendeteksi:
  - Next.js version (WAJIB terbaru)
  - App Router (`/app`) atau Pages Router (`/pages`)

- Default:
  - Gunakan App Router

- Mendeteksi:
  - Bahasa (JavaScript / TypeScript)
  - Styling (Tailwind, CSS Modules, dll)

Jika TypeScript:

- WAJIB strict mode
- DILARANG `any`
- Gunakan interface untuk object utama

---

## 2. Architecture Rules (APP ROUTER FIRST)

Struktur utama:

```id="7k3vla"
src/
 ├── app/
 │    ├── layout.tsx
 │    ├── page.tsx
 │    ├── (routes)/
 │    ├── api/
 │    │    └── <route>/route.ts
 │
 ├── components/
 │    ├── ui/
 │    └── shared/
 │
 ├── features/
 │    ├── <feature>/
 │    │    ├── components/
 │    │    ├── hooks/
 │    │    ├── services/
 │    │    ├── types/
 │    │    └── utils/
 │
 ├── lib/
 ├── hooks/
 ├── services/
 ├── types/
 └── utils/
```

PRINSIP:

- Feature-based architecture
- Pisahkan UI, logic, dan data fetching
- Hindari logic kompleks di page

---

## 3. Server vs Client Component (KRITIS)

WAJIB:

- Default = Server Component
- Gunakan Client Component hanya jika:
  - butuh interactivity (event handler)
  - menggunakan browser API
  - menggunakan state

Gunakan:

```tsx id="r2l9xk"
"use client";
```

SECARA MINIMAL

---

## 4. Data Fetching (MODERN)

Gunakan:

- Server Component untuk fetch data
- `fetch()` dengan caching control

Contoh:

```ts id="o5n8cq"
await fetch(url, { cache: "no-store" });
```

WAJIB:

- Pisahkan logic ke `services/`
- Gunakan revalidation jika perlu

---

## 5. API Route (ROUTE HANDLER)

Gunakan:

- `/app/api/.../route.ts`

Contoh:

```ts id="h1p7zx"
export async function GET() {
  return Response.json({ success: true });
}
```

WAJIB:

- Validasi input
- Gunakan response konsisten

---

## 6. TypeScript Rules

WAJIB:

- Interface untuk:
  - props
  - response
  - data model

DILARANG:

- `any`
- type tidak jelas

---

## 7. State Management

Prioritas:

1. Server state → fetch di server
2. Client state → useState
3. Global state → Zustand

Hindari:

- Overuse global state

---

## 8. Form Handling

Gunakan:

- React Hook Form
- Zod

WAJIB:

- Server action atau API route
- Validasi schema

---

## 9. Performance Optimization

WAJIB:

- Gunakan:
  - dynamic import
  - lazy loading

- Optimalkan:
  - image (next/image)
  - font (next/font)

---

## 10. SEO & Metadata

Gunakan:

- Metadata API

Contoh:

```ts id="m6z2wa"
export const metadata = {
  title: "Page Title",
};
```

---

## 11. Security

WAJIB:

- Validasi input
- Hindari expose secret di client
- Gunakan env dengan benar

---

## 12. Environment & Config

Gunakan:

- `.env.local`

Pisahkan:

- server-only env
- public env (`NEXT_PUBLIC_`)

---

## 13. Error Handling

WAJIB:

- Gunakan:
  - error.tsx
  - not-found.tsx

---

## 14. Output Rules untuk AI

AI HARUS:

- Menentukan:
  - server vs client component

- Memberikan:
  - struktur file
  - contoh implementasi

- Menjaga scalability

---

## 15. Anti-Pattern (DILARANG)

- Menggunakan Pages Router untuk project baru
- Menggunakan `any`
- Fetch di client tanpa alasan
- Logic kompleks di component
- Tidak memanfaatkan Server Component

---

## 16. Default Stack

- Next.js (App Router)
- TypeScript (strict)
- Tailwind CSS
- Zod
- React Hook Form
- Zustand

---

## 17. Prinsip Utama

- Server-first architecture
- Type safety adalah wajib
- Scalability sejak awal
- Performance adalah default

---

Gunakan skill ini untuk menghasilkan aplikasi Next.js modern yang scalable, performant, dan production-ready.
