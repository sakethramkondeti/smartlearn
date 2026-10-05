# Cognix 🎓

> **Intelligent, Adaptive & Personalized AI Learning Platform**

Cognix is an advanced AI-powered educational platform designed to deliver personalized learning experiences through adaptive curriculum generation, interactive lectures, intelligent assessments, and real-time Socratic AI tutoring.

---

## 📁 Project Architecture

Cognix is built as a modern, unified Next.js 15 full-stack application:

```
cognix/
├── app/                      # Next.js App Router
│   ├── (app)/                # Protected / core dashboard routes
│   │   ├── dashboard/        # Main learner dashboard & metrics
│   │   ├── courses/          # Course catalog & curriculum viewer
│   │   ├── learn/            # Adaptive learning & interactive lectures
│   │   ├── assessments/      # Quizzes, tests & cognitive mastery tracking
│   │   ├── knowledge/        # Knowledge graph & concept dependencies
│   │   ├── resources/        # Learning library & materials
│   │   └── settings/         # Profile & model configuration
│   ├── api/                  # Backend REST endpoints & AI streaming
│   │   ├── ai/               # AI generation (lectures, quizzes, explain)
│   │   ├── courses/          # Course management APIs
│   │   └── student/          # Student progress & analytics APIs
│   ├── globals.css           # Design system tokens & Tailwind base
│   └── layout.tsx            # Root layout & providers
│
├── components/               # Modular UI Components
│   ├── ai/                   # AI Tutor chat, lecture streamers, assistants
│   ├── assessments/          # Quiz runners, scoring & analytics UI
│   ├── courses/              # Course cards, syllabus explorer
│   ├── layout/               # Global navigation, sidebar & header
│   ├── learning/             # Active recall, spaced repetition UI
│   └── ui/                   # Core atomic design components
│
├── lib/                      # Core Utilities & Services
│   ├── ai/                   # Multi-LLM provider orchestration (NVIDIA / Gemini)
│   │   ├── provider.ts       # Unified model router & fallback handler
│   │   └── services/         # Dedicated AI domain services
│   ├── db.ts                 # Prisma Client singleton
│   └── utils.ts              # Styling & format helper functions
│
├── prisma/                   # Database Layer
│   ├── schema.prisma         # Data models (Users, Courses, Lessons, Quizzes)
│   └── seed.ts               # Database seeder with sample curricula
│
├── data/                     # Mock & fallback datasets for offline resilience
├── types/                    # TypeScript interfaces & domain types
└── docs/                     # System architecture & engineering docs
```

---

## 🚀 Tech Stack

- **Framework**: Next.js 15 (App Router, React 19, Server Components)
- **Styling**: Tailwind CSS, Lucide Icons, Glassmorphism design system
- **Database & ORM**: PostgreSQL (Supabase) with Prisma ORM
- **AI Engines**:
  - **NVIDIA NIM Nemotron 550B** (Complex reasoning & Socratic tutoring)
  - **Google Gemini 2.5 Flash** (Curriculum generation & real-time lectures)
- **Mathematical Rendering**: KaTeX with Remark Math & Rehype KaTeX

---

## 🛠️ Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.local.example` to `.env.local` and add your API keys and database URL:
```bash
cp .env.local.example .env.local
```

### 3. Setup Database (Optional)
```bash
npx prisma db push
npx prisma db seed
```

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## 📄 License
MIT License.
