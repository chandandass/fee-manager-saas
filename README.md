# FeeManager

Lightweight fee + student management PWA for Indian tuition teachers and small coaching institutes.

**Value proposition:** Know who has paid, who hasn't, and remind them on WhatsApp in seconds.

## Tech Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS 4**
- **Clean Architecture** with Dependency Inversion
  - `domain/` – entities, repository interfaces, use-cases
  - `infrastructure/` – concrete implementations (InMemory now, ready for Supabase)
  - `presentation/` – UI components & pages
- PWA ready
- WhatsApp deep-link reminders (zero API cost for V1)

## Features (V1)

- Dashboard (pending fees, collected amount)
- Student management
- Batch management
- Monthly fee tracking (paid / pending / partial)
- One-tap WhatsApp fee reminders
- Basic attendance
- Mobile-first, clean UI

## Architecture (Dependency Inversion)

```
src/
├── domain/
│   ├── entities/          # Student, Batch, FeeRecord, ...
│   ├── repositories/      # Interfaces only (IStudentRepository, ...)
│   └── use-cases/         # GetDashboardStats, ManageStudents, ManageFees
├── infrastructure/
│   ├── supabase/          # InMemoryStore (swap with real Supabase later)
│   └── whatsapp/          # WhatsApp deep-link service
├── presentation/
│   └── components/        # Reusable UI (Card, Button, Badge, ...)
└── app/                   # Next.js routes
```

Use-cases depend on **interfaces**, not concrete classes.  
You can replace `InMemoryStudentRepository` with a real Supabase one without touching any UI or business logic.

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Roadmap

- [ ] Real Supabase + Auth
- [ ] PayU subscription billing
- [ ] WhatsApp Business API / Wati
- [ ] Multi-teacher roles
- [ ] Export / reports

Built for speed to first paying customers.
