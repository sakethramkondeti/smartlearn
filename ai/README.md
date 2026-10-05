# AI & Adaptive Learning Engine — Cognix

The intelligence layer for **Cognix**, powering adaptive knowledge tracing, retrieval-augmented generation (RAG) for curriculum grounding, and real-time Socratic AI tutoring.

## Components
1. **Knowledge Tracing (`models/`)**:
   - Bayesian Knowledge Tracing (BKT) and Deep Knowledge Tracing (DKT).
   - Dynamically updates mastery probabilities $P(L_t)$ upon question attempts.
2. **Socratic AI Tutor (`tutor/`)**:
   - Pedagogical agent prompting that guides learners through inquiry rather than spoon-feeding answers.
   - Misconception diagnosis and personalized hints.
3. **Curriculum RAG (`rag/`)**:
   - Semantic retrieval over vetted textbooks, curriculum standards, and lecture notes.
4. **Adaptive Assessment Engine (`assessment/`)**:
   - Item Response Theory (IRT) calibrated question selection based on current learner ability parameter $\theta$.
