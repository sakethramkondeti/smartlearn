# Adaptive Learning Platform — Project Specification

## 1. Project Vision

Build an AI-powered adaptive learning platform that turns a user's learning goal, course, or study material into a structured and personalized learning journey.

The user should be able to say:

"I want to learn Digital Electronics. I am a beginner. I can study 1 hour every day for 30 days."

The system should then analyze the subject/material, create a learning roadmap, divide the course into concepts, schedule daily learning sessions, recommend useful resources, conduct quizzes and assessments, identify mistakes and weak concepts, track mastery, schedule revision, and adapt future lessons according to the learner's performance.

The goal is to move from:

"I need to search for what I should learn."

to:

"I tell the system what I want to learn, and the system tells me what to learn next."

---

# 2. Core Learning Loop

The fundamental loop of the application is:

PLAN
↓
LEARN
↓
PRACTICE
↓
TEST
↓
ANALYZE
↓
REMEMBER
↓
ADAPT
↓
REPEAT

The system should continuously update the learner's knowledge profile and use it to determine what should be learned next.

---

# 3. Main User Flow

## Step 1 — Create Course

The user selects "Add Course".

The system asks for:

- Course / skill name
- Learning goal
- Current knowledge level
- Target duration or target date
- Available minutes per day
- Preferred learning time

Optional materials:

- PDF
- PPT / PPTX
- Notes
- Syllabus
- Website links
- YouTube videos
- Books
- Question papers
- Other study material

---

## Step 2 — Analyze Course

The system analyzes the user's course and available material.

It should identify:

- Concepts
- Sub-concepts
- Prerequisites
- Concept relationships
- Difficulty
- Importance
- Learning objectives
- Formulas
- Examples
- Estimated learning time

The output should be structured data rather than uncontrolled text.

---

# 4. Knowledge / Concept Graph

The system should represent the course as a concept graph.

Example:

Digital Electronics
↓
Number Systems
↓
Boolean Algebra
↓
Logic Gates
↓
Combinational Logic
↓
MUX / DEMUX
↓
Sequential Logic
↓
Flip-Flops
↓
Counters
↓
Registers

Relationships should include concepts such as:

- prerequisite
- depends_on
- related_to
- part_of
- advanced_version_of

The graph should help the adaptive engine determine what the learner needs to know before learning another concept.

---

# 5. Personalized Learning Plan

The system should create a personalized roadmap based on:

- Course content
- User's current level
- Learning goal
- Available time
- Course duration
- Concept dependencies
- Concept importance
- Learner performance

Example:

30 days
×
60 minutes/day
=
30 hours available

The system should distribute the concepts across the available time.

The learning plan must be dynamic.

It should NOT be permanently fixed.

If the learner struggles with a concept, the system should allocate additional time.

If the learner demonstrates strong mastery, the system may compress or skip unnecessary repetition.

---

# 6. Daily Learning Experience

The interface should feel like a structured daily learning journey.

Example:

TODAY'S MISSION

6:00 PM – 7:00 PM

20 min
Learn today's concept

15 min
Watch recommended resource

10 min
Practice

10 min
Quiz

5 min
Revision

The user should be able to start the entire session from one place.

---

# 7. Learning Content

For each concept, the system can provide:

- Explanation
- Examples
- Diagrams
- Formulas
- Practice problems
- Questions
- Videos
- Articles
- Documentation
- User-uploaded material

The explanation should adapt to the user's level.

For example:

Beginner:
Simple explanation + analogy + basic example

Intermediate:
Detailed explanation + examples + applications

Advanced:
Technical explanation + edge cases + advanced problems

---

# 8. Resource Recommendation

The system should help users find reliable resources instead of forcing them to search manually.

Potential sources include:

- Wikipedia
- GeeksforGeeks
- W3Schools
- MDN
- Official documentation
- University resources
- Research papers
- Educational websites
- YouTube
- User-uploaded material

For each concept, the system should rank resources based on:

- Relevance
- User level
- Concept coverage
- Source quality
- Duration
- Difficulty
- Learning goal

Example:

CONCEPT:
Recursion

Recommended:

1. 12-minute beginner video
2. 8-minute article
3. Relevant section from uploaded PDF

The system should tell the learner why a resource is useful when appropriate.

---

# 9. Quiz and Practice Engine

Each learning session can contain:

- MCQs
- Short-answer questions
- Numerical problems
- Coding problems
- Conceptual questions
- Application problems

The assessment type should depend on the subject.

For example:

Programming:
- Coding problems
- Debugging

Mathematics:
- Numerical problems
- Derivations

Theory:
- MCQs
- Short answers

Engineering:
- Formulas
- Numerical problems
- Conceptual questions

---

# 10. Weekly Assessment

Every week the system should conduct a broader assessment.

The weekly test should measure:

- Concepts learned that week
- Important previous concepts
- Retention
- Application ability
- Previous weak areas
- Repeated mistakes

The result should update the learner profile.

---

# 11. Learner Knowledge Model

This is one of the most important components of the project.

The system should maintain concept-level information about the learner.

Example:

Concept:
K-Maps

Mastery:
43%

Evidence:

MCQ:
70%

Problem solving:
35%

Short explanation:
50%

Weekly test:
40%

Common mistakes:
- Incorrect grouping
- Incorrect use of don't-care conditions

Last reviewed:
3 days ago

Next review:
Tomorrow

The learner model should be persistent.

It should improve as the learner completes more activities.

---

# 12. Mastery Calculation

Mastery should not depend entirely on an LLM.

Use deterministic backend logic wherever possible.

For example:

MCQ performance:
20%

Problem solving:
30%

Explanation:
20%

Weekly assessment:
30%

Mastery can be calculated using a weighted formula.

The exact formula can be improved later.

The system should also track:

- Number of attempts
- Correct answers
- Incorrect answers
- Difficulty
- Recency
- Confidence
- Repeated errors

---

# 13. AI Mistake Analysis

The system should identify WHY a learner made a mistake, not simply say that the answer is wrong.

Example:

Question:
Group the K-Map correctly.

Student answer:
Incorrect grouping.

AI analysis:

Concept:
K-Maps

Error type:
Grouping rule

Severity:
High

Likely cause:
Learner does not understand adjacency rules.

Action:
Schedule revision.

The mistake should be stored in the learner profile.

---

# 14. Adaptive Learning Engine

This is the core intelligence of the application.

Example:

K-Maps mastery = 43%

The system detects:

- K-Maps is weak.
- K-Maps is important.
- MUX depends on K-Maps.

Therefore:

Instead of:

Day 8 → MUX

The system changes the plan to:

Day 8 → K-Maps revision
Day 9 → K-Maps practice
Day 10 → MUX

The learning plan should continuously adapt.

---

# 15. Revision Engine

The system should automatically schedule revision.

Basic example:

New concept
↓
1 day
↓
3 days
↓
7 days
↓
14 days
↓
30 days

If the learner performs poorly:

Reduce revision interval.

If the learner consistently performs well:

Increase revision interval.

The exact spaced-repetition algorithm can be improved later.

---

# 16. Formula Revision

For formula-heavy courses, the system should identify important formulas.

Example:

V = IR

P = VI

The system can create quick revision cards and active-recall questions.

Instead of only displaying:

"V = IR"

Ask:

"A circuit has V = 10V and R = 5Ω. Find I."

---

# 17. Course Extension / Modification

The learner should be able to modify their goal.

Example:

User:

"I also want to learn Fourier Transform."

The system should:

1. Identify prerequisites.
2. Estimate additional time.
3. Check the existing schedule.
4. Calculate the additional duration.
5. Show the proposed change.
6. Ask the user for confirmation.
7. Update the learning roadmap.

Example:

Current course:
30 days

New requirement:
+5 days

New duration:
35 days

The system should also support shortening or compressing the course when appropriate.

---

# 18. AI Architecture

The application should NOT depend on one LLM.

Use an AI orchestration layer.

Example:

USER
↓
AI ROUTER
↓
Task complexity
↓
Model selection

Simple:
Local Qwen

Medium:
Efficient cloud model

Complex:
NVIDIA Nemotron

The router should select the smallest capable model.

---

# 19. Model Strategy

## Local Qwen

Use for:

- Simple explanations
- Normal tutoring
- Quiz generation
- Summaries
- Rewriting
- Basic conversations
- Examples

Run through Ollama during development.

---

## NVIDIA Nemotron

Use for high-value complex tasks:

- Course analysis
- Complex prerequisite reasoning
- Difficult mistake analysis
- Complex learner analysis
- Major learning-plan restructuring

Avoid wasting expensive API requests on simple tasks.

---

## Embedding Models

Use embedding models for:

- Semantic search
- RAG
- Resource discovery
- Finding relevant sections of uploaded documents
- Finding related concepts

Do not use an LLM when normal semantic search is sufficient.

---

# 20. RAG Architecture

Uploaded material should NOT be sent to an LLM every time.

Use:

DOCUMENT
↓
TEXT EXTRACTION
↓
CHUNKING
↓
EMBEDDINGS
↓
VECTOR DATABASE
↓
SEMANTIC SEARCH
↓
RELEVANT CONTEXT
↓
LLM
↓
ANSWER

The system should be able to answer questions using the user's uploaded material.

---

# 21. AI Tool Calling

The AI should be able to request controlled application actions through tools.

Examples:

- get_course()
- get_progress()
- get_mastery()
- get_weak_concepts()
- get_previous_mistakes()
- search_resources()
- create_quiz()
- schedule_revision()
- modify_learning_plan()
- extend_course()
- reschedule_lesson()
- create_reminder()

IMPORTANT:

The LLM must NOT directly modify the database.

Correct architecture:

LLM
↓
Tool Call
↓
Backend
↓
Validation
↓
Database

The backend remains responsible for permissions, validation and actual state changes.

---

# 22. Automation

Automation should be handled primarily by normal software, not AI.

Example:

User prefers:
6:00 PM

Scheduler:
6:00 PM
↓
Find today's lesson
↓
Send notification

AI can optionally generate personalized reminder text.

Examples:

"Your K-Maps revision session is ready."

"Today's mission: learn MUX and complete 5 practice questions."

---

# 23. Main Application Pages

The application should contain:

## Landing Page

Explain the product.

## Dashboard

Show:

- Today's mission
- Active courses
- Progress
- Streak
- Upcoming session

## My Courses

Show all courses.

## Add Course

Create a new course.

## Course Overview

Show:

- Goal
- Progress
- Roadmap
- Concepts
- Duration
- Current day

## Today's Learning

Show the daily learning session.

## Knowledge / Mastery

Show:

- Overall mastery
- Concept mastery
- Strong areas
- Weak areas
- Mistakes

## Resources

Show recommended learning resources.

## Assessments

Show:

- Daily quizzes
- Weekly tests
- Previous results

## Settings

User preferences and learning schedule.

---

# 24. Important UI Principle

The interface should be inspired by modern learning applications.

It should be:

- Clean
- Modern
- Motivating
- Simple
- Responsive
- Visual
- Easy to navigate

It can use concepts such as:

- Streaks
- Progress bars
- Daily missions
- Learning paths
- Badges

But do NOT copy another application's exact design, branding or proprietary interface.

---

# 25. Recommended Technology

## Frontend

Next.js
React
TypeScript
Tailwind CSS

## Backend

Python
FastAPI

## Database

PostgreSQL

## Vector Search

pgvector

## Knowledge Graph

Neo4j

Neo4j can initially be optional if PostgreSQL relationships are sufficient for the MVP.

## Local AI

Ollama
Qwen

## Cloud AI

NVIDIA NIM / Nemotron

Additional model providers can be added later.

## File Processing

PyMuPDF
python-pptx

## Authentication

Supabase Auth or Auth.js

## Storage

Supabase Storage / S3-compatible storage

## Notifications

Firebase Cloud Messaging

## Scheduling

APScheduler initially

## Deployment

Vercel for frontend

Render / Railway / AWS for backend

---

# 26. Important Engineering Principles

The system should be modular.

Frontend should communicate with backend through APIs.

AI should communicate through an AI service layer.

The frontend should NOT directly call model APIs.

The frontend should NOT contain API keys.

LLM outputs should preferably be structured JSON.

The backend should validate AI-generated actions.

Database state should be controlled by backend logic.

Do not use an LLM for deterministic calculations.

Do not use an LLM for simple scheduling.

Do not use an LLM when a normal algorithm is sufficient.

---

# 27. Project Architecture

Initial target architecture:

frontend/
    Next.js application

backend/
    FastAPI application

ai/
    AI router
    model integrations
    prompts
    RAG
    embeddings

learning/
    learner model
    mastery calculation
    adaptive engine
    revision engine
    course planner
    assessment engine

docs/
    architecture
    API contracts
    AI schemas

---

# 28. Core Data Relationships

User
↓
Course
↓
Course Material
↓
Concept
↓
Concept Relationship
↓
Lesson
↓
Question
↓
Answer
↓
Mistake
↓
Learner Mastery
↓
Revision
↓
Adaptive Learning Plan

---

# 29. MVP Development Order

Build in this order:

PHASE 1
Frontend shell

↓

PHASE 2
Backend + database

↓

PHASE 3
Course creation

↓

PHASE 4
File upload and extraction

↓

PHASE 5
AI Router

↓

PHASE 6
Course Analyzer

↓

PHASE 7
Concept / Knowledge Graph

↓

PHASE 8
Learning Planner

↓

PHASE 9
Resource Recommendation

↓

PHASE 10
Daily Learning

↓

PHASE 11
Quiz Engine

↓

PHASE 12
Learner Model

↓

PHASE 13
Mistake Analysis

↓

PHASE 14
Adaptive Learning

↓

PHASE 15
Weekly Assessment

↓

PHASE 16
Revision + Formula Engine

↓

PHASE 17
Automation / Notifications

↓

PHASE 18
Testing + Polish

↓

PHASE 19
SIH Demo

---

# 30. First MVP Goal

The first working version should demonstrate this complete flow:

Create Course
↓
Enter learning preferences
↓
Upload material
↓
AI analyzes material
↓
Concepts identified
↓
Learning plan generated
↓
Today's lesson
↓
Quiz
↓
Mistake analysis
↓
Mastery updated
↓
Weak concept identified
↓
Future lesson automatically adapted

This complete loop is more important than having a large number of UI features.

---

# 31. Core Product Differentiation

This should NOT be presented as simply:

"An AI tutor."

The system is:

"An adaptive learning engine that continuously builds a learner model and determines what the learner should learn next based on demonstrated competency."

Key differentiation:

1. Persistent concept-level learner model.
2. Knowledge/prerequisite graph.
3. Multiple types of assessment.
4. Concept-level mistake tracking.
5. Adaptive learning path.
6. Automatic revision.
7. Personalized resource recommendation.
8. Dynamic course duration.
9. Multi-model AI orchestration.
10. AI-assisted but deterministic and controlled application logic.

---

# 32. Golden Rule

The LLM is NOT the application.

The architecture should be:

USER
↓
FRONTEND
↓
BACKEND
↓
LEARNING ENGINE + AI
↓
DATABASE
↓
ADAPTIVE PLAN
↓
USER

AI provides reasoning and content generation.

The backend controls state.

The learner model provides memory.

The adaptive engine decides what should happen next.

The scheduler controls when it happens.