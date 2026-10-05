# Backend — Cognix Core API

The backend service for **Cognix**, handling user authentication, course management, telemetry streaming, mastery synchronization, and database persistence.

## Architecture
- **Authentication & RBAC**: JWT tokens with role-based permissions (Student, Educator, Admin).
- **Course & Module Management**: CRUD operations for structured curriculum paths.
- **Telemetry Ingestion**: High-throughput event logging for learner interactions.
- **Mastery State Sync**: Coordinates state updates between learner interactions and the AI Knowledge Tracing service.

## Database & Cache
- **PostgreSQL**: Relational schemas for users, enrollments, attempts, and curriculum trees.
- **pgvector / Chroma**: Vector embeddings for curriculum semantic search and RAG retrieval.
- **Redis**: Session caching and rate limiting.
