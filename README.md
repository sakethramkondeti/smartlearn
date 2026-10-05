# Cognix 🎓

> **Intelligent, Adaptive & Personalized AI Learning Platform**

Cognix is an advanced educational ecosystem that personalizes learning journeys through Bayesian Knowledge Tracing, dynamic concept dependency graphs, and a real-time Socratic AI tutor.

---

## 📁 Repository Structure

```
cognix/
│
├── PROJECT_SPEC.md       # Full architecture, data models, AI pipeline & API specs
├── README.md             # Project overview, tech stack, and developer guide
│
├── frontend/             # Next.js / React interactive UI for learners & educators
├── backend/              # Core REST & WebSocket services, Auth, and DB persistence
├── ai/                   # Knowledge tracing models, RAG engine, and Socratic AI agent
├── learning/             # Curriculums, concept dependency graphs, and question banks
└── docs/                 # System architecture, API specs, and implementation roadmap
```

---

## 🚀 Modules Overview

| Directory | Purpose | Key Tech |
| :--- | :--- | :--- |
| [`frontend/`](./frontend/) | Interactive learner dashboard, visual mastery graphs, and tutor interface | React, Next.js / Vite, Tailwind CSS, Lucide Icons |
| [`backend/`](./backend/) | Core API services, authentication, telemetry, and mastery sync | Node.js / FastAPI, PostgreSQL, Prisma / SQLAlchemy, Redis |
| [`ai/`](./ai/) | Adaptive learning engine, BKT/DKT mastery estimation, Socratic tutor | Python, LangChain, OpenAI / Gemini API, pgvector / Chroma |
| [`learning/`](./learning/) | Curated curricula, concept graphs, and Item Response Theory question banks | JSON / YAML ontologies, Markdown lesson assets |
| [`docs/`](./docs/) | Technical documentation, architecture blueprints, API schemas | Markdown, Mermaid diagrams |

---

## 🛠️ Quickstart

### Prerequisites
- Node.js >= 18.x
- Python >= 3.10
- PostgreSQL with `pgvector` extension
- Redis (optional for local caching)

### Getting Started
1. **Explore Architecture & Specs**: Read [`PROJECT_SPEC.md`](./PROJECT_SPEC.md) for full system specifications.
2. **Setup AI Service**: Check [`ai/README.md`](./ai/README.md) to initialize the knowledge tracing & tutor agent.
3. **Setup Backend**: Check [`backend/README.md`](./backend/README.md) to run migrations and start the API server.
4. **Setup Frontend**: Check [`frontend/README.md`](./frontend/README.md) to launch the web client.

---

## 📄 License
MIT License. See [LICENSE](./LICENSE) for details.
