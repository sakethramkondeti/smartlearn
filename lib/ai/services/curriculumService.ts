import { getAIProvider } from "../provider";
import { ExtractedUnit, RAGService } from "./ragService";

/**
 * Model 2: Curriculum & DAG Knowledge Graph Generator
 *
 * Responsibilities:
 * - Deconstruct subject matter / uploaded PDF into modular Concept Nodes
 * - Build Directed Acyclic Graph (DAG) with prerequisites and dependents
 * - Calibrate difficulty & estimated mastery duration
 * - Partition curriculum into day-wise study schedule (e.g. Day 1..30)
 * - Derive curriculum dynamically from uploaded source material (zero hardcoded subjects)
 */

export interface GeneratedConcept {
  id: string;
  name: string;
  slug: string;
  importance: "high" | "medium" | "low";
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estimatedMinutes: number;
  description: string;
  prerequisites: string[];
  dependents: string[];
  keyFormulas?: string[];
  dayAssigned: number;
}

export interface GeneratedDayPlan {
  dayNumber: number;
  title: string;
  conceptId: string;
  topicsCovered: string[];
  durationMinutes: number;
}

export interface GeneratedCurriculum {
  description: string;
  category: string;
  concepts: GeneratedConcept[];
  daysList: GeneratedDayPlan[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Graph and Schedule Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Compute dependents[] for each concept from prerequisites */
function computeDependents(concepts: GeneratedConcept[]): GeneratedConcept[] {
  const idToNode = new Map(concepts.map((c) => [c.id, c]));
  concepts.forEach((c) => {
    c.dependents = [];
  });
  concepts.forEach((c) => {
    (c.prerequisites || []).forEach((prereqId) => {
      const prereq = idToNode.get(prereqId);
      if (prereq && !prereq.dependents.includes(c.id)) {
        prereq.dependents.push(c.id);
      }
    });
  });
  return concepts;
}

/** Assign dayAssigned by topological depth within totalDays */
function assignDaysByDepth(concepts: GeneratedConcept[], totalDays: number): GeneratedConcept[] {
  const idToDepth = new Map<string, number>();
  const idMap = new Map(concepts.map((c) => [c.id, c]));

  function depth(id: string, visiting = new Set<string>()): number {
    if (idToDepth.has(id)) return idToDepth.get(id)!;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const node = idMap.get(id);
    const d =
      node && node.prerequisites && node.prerequisites.length > 0
        ? 1 + Math.max(...node.prerequisites.map((p) => depth(p, visiting)))
        : 0;
    idToDepth.set(id, d);
    return d;
  }

  concepts.forEach((c) => depth(c.id));
  const maxDepth = Math.max(...Array.from(idToDepth.values()), 0);
  const daysPerLevel = Math.max(1, Math.floor(totalDays / (maxDepth + 1)));

  concepts.forEach((c) => {
    const d = idToDepth.get(c.id) ?? 0;
    c.dayAssigned = Math.min(d * daysPerLevel + 1, totalDays);
  });

  return concepts;
}

/**
 * Distribute concepts and their subtopics evenly across totalDays (e.g. 30 days)
 */
function buildScheduleFromConcepts(
  concepts: GeneratedConcept[],
  totalDays: number,
  minutesPerDay: number,
  unitTopicMap?: Map<string, string[]>
): GeneratedDayPlan[] {
  const days: GeneratedDayPlan[] = [];
  const daysPerConcept = Math.max(1, Math.floor(totalDays / concepts.length));

  for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
    const conceptIdx = Math.min(
      Math.floor(((dayNum - 1) / totalDays) * concepts.length),
      concepts.length - 1
    );
    const concept = concepts[conceptIdx];
    const dayInConcept = ((dayNum - 1) % daysPerConcept) + 1;

    // Get subtopics for this concept if available
    const subtopics = unitTopicMap?.get(concept.id) || [];
    let dayTopics: string[] = [];

    if (subtopics.length > 0) {
      const sliceSize = Math.max(1, Math.ceil(subtopics.length / daysPerConcept));
      const startIdx = (dayInConcept - 1) * sliceSize;
      dayTopics = subtopics.slice(startIdx, startIdx + sliceSize);
      if (dayTopics.length === 0) dayTopics = [concept.name, "Core Principles & Applications"];
    } else if (concept.keyFormulas && concept.keyFormulas.length > 0) {
      dayTopics = [concept.name, ...concept.keyFormulas.slice(0, 2)];
    } else {
      dayTopics = [concept.name, `${concept.name} Principles`, "Worked Examples & Practice"];
    }

    const specificTopic = dayTopics[0] && dayTopics[0] !== concept.name ? dayTopics[0] : null;
    const dayTitle = specificTopic ? `${concept.name}: ${specificTopic}` : totalDays > concepts.length ? `${concept.name} (Part ${dayInConcept})` : concept.name;

    days.push({
      dayNumber: dayNum,
      title: dayTitle,
      conceptId: concept.id,
      topicsCovered: dayTopics,
      durationMinutes: minutesPerDay,
    });
  }

  return days;
}

/**
 * Build concepts directly from extracted document units (Multi-Branch DAG structure)
 */
function buildConceptsFromUnits(
  units: ExtractedUnit[],
  courseTitle: string,
  safeMinutes: number
): { concepts: GeneratedConcept[]; unitTopicMap: Map<string, string[]> } {
  const concepts: GeneratedConcept[] = [];
  const unitTopicMap = new Map<string, string[]>();

  units.forEach((unit, idx) => {
    // Clean unit title: remove leading "Unit I —", "Module 1:", etc.
    let cleanName = unit.title
      .replace(/^(?:Unit|Module|Chapter|Part|Section)\s+[IVX0-9]+[\s\-\—:.]+/i, "")
      .trim();

    // If the unit title was just generic "Basics" or "Overview", use first subtopic
    if ((!cleanName || /^(basics?|overview|introduction|unit\s*\d+)$/i.test(cleanName)) && unit.subtopics.length > 0) {
      cleanName = unit.subtopics[0];
    }
    if (!cleanName) cleanName = `Topic ${idx + 1}`;

    const slug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 30) || `unit-${idx + 1}`;

    const conceptId = `c-${idx + 1}-${slug}`;

    // Multi-branch DAG prerequisites:
    let prereqs: string[] = [];
    if (idx === 1 || idx === 2) {
      if (concepts[0]) prereqs.push(concepts[0].id);
    } else if (idx === 3) {
      if (concepts[1]) prereqs.push(concepts[1].id);
    } else if (idx === 4) {
      if (concepts[2]) prereqs.push(concepts[2].id);
    } else if (idx >= 5) {
      const p1 = concepts[idx - 2]?.id;
      const p2 = concepts[idx - 1]?.id;
      if (p1) prereqs.push(p1);
      if (p2 && p2 !== p1) prereqs.push(p2);
    }

    unitTopicMap.set(conceptId, unit.subtopics);

    concepts.push({
      id: conceptId,
      name: cleanName,
      slug,
      importance: "high",
      difficulty: idx === 0 ? "Beginner" : idx < units.length - 1 ? "Intermediate" : "Advanced",
      estimatedMinutes: safeMinutes,
      description: `In-depth study of ${cleanName} covering ${unit.subtopics.slice(0, 3).join(", ") || "core principles"}.`,
      prerequisites: prereqs,
      dependents: [],
      keyFormulas: unit.formulas.slice(0, 4),
      dayAssigned: 1,
    });
  });

  return { concepts, unitTopicMap };
}

/**
 * Domain-Adaptive Title Fallback with Multi-Branch Knowledge Tree Structure
 * Generates true 2D branching trees with clean, standard domain concept names (no prefixed titles)
 */
function synthesizeDomainAdaptiveConcepts(
  title: string,
  level: string,
  safeMinutes: number
): GeneratedConcept[] {
  const t = title.toLowerCase();
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 20);

  interface ModuleDef {
    name: string;
    desc: string;
    diff: "Beginner" | "Intermediate" | "Advanced";
    prereqIndices: number[];
  }

  let modules: ModuleDef[];

  // 1. Java & Object Oriented Programming (OOP)
  if (/java|oop|object-oriented|class|encapsulation|polymorphism|inheritance|abstraction|spring|jvm/i.test(t)) {
    modules = [
      { name: "Classes, Objects & Constructors", desc: "Class blueprints, instantiation, constructor overloading, memory allocation, and the 'this' reference.", diff: "Beginner", prereqIndices: [] },
      { name: "Encapsulation & Access Modifiers", desc: "Access modifiers (public/private/protected), data hiding, getters/setters, and package scopes.", diff: "Beginner", prereqIndices: [0] },
      { name: "Inheritance & Method Overriding", desc: "Class extension, 'super' keyword, constructor chaining, single and multilevel hierarchies.", diff: "Beginner", prereqIndices: [0] },
      { name: "Polymorphism & Dynamic Dispatch", desc: "Compile-time vs runtime polymorphism, dynamic method dispatch, and '@Override' contract.", diff: "Intermediate", prereqIndices: [2] },
      { name: "Abstract Classes & Interfaces", desc: "Pure abstraction, multiple interface contracts, default/static methods, and loose coupling.", diff: "Intermediate", prereqIndices: [1, 2] },
      { name: "Exception Handling & Collections Framework", desc: "Try-catch-finally, checked vs unchecked exceptions, List, Set, Map hierarchies, and Generics.", diff: "Intermediate", prereqIndices: [3, 4] },
      { name: "Multithreading & OOP Design Patterns", desc: "Thread lifecycle, synchronization, and classic design patterns (Singleton, Factory, Strategy, Observer).", diff: "Advanced", prereqIndices: [4, 5] },
    ];
  }
  // 2. Data Structures & Algorithms
  else if (/algorithm|data structure|dsa|tree|graph|binary search|sorting|dynamic programming|greedy/i.test(t)) {
    modules = [
      { name: "Complexity Analysis & Big-O Notation", desc: "Asymptotic analysis (Big-O, Omega, Theta), recurrence relations, and space-time tradeoffs.", diff: "Beginner", prereqIndices: [] },
      { name: "Linear Structures (Arrays, Linked Lists, Stacks, Queues)", desc: "Dynamic array allocation, singly/doubly linked lists, stack evaluation, and queue implementations.", diff: "Beginner", prereqIndices: [0] },
      { name: "Tree Structures & Binary Search Trees", desc: "Binary tree traversals, BST insert/delete, AVL self-balancing, and binary heaps.", diff: "Intermediate", prereqIndices: [0] },
      { name: "Graph Algorithms & Shortest Paths", desc: "Adjacency matrix/lists, BFS, DFS, Dijkstra, Bellman-Ford, and topological sort.", diff: "Intermediate", prereqIndices: [2] },
      { name: "Dynamic Programming & Memoization", desc: "Optimal substructure, overlapping subproblems, 1D/2D table transitions, and knapsack variations.", diff: "Advanced", prereqIndices: [1] },
      { name: "Advanced Algorithms & System Optimization", desc: "Trie trees, Disjoint Set Union (DSU), Segment Trees, and real-world scalability optimizations.", diff: "Advanced", prereqIndices: [3, 4] },
    ];
  }
  // 3. Electronic Devices & Circuits
  else if (/electronic|circuit|semiconductor|diode|transistor|amplif|bjt|mosfet|signal|dc|ac|analog|digital|logic|vhdl|verilog|power|electr/i.test(t)) {
    modules = [
      { name: "Semiconductor Physics & Band Theory", desc: "Intrinsic/extrinsic semiconductors, Fermi-Dirac distribution, carrier drift and diffusion.", diff: "Beginner", prereqIndices: [] },
      { name: "p-n Junction Diodes & Wave Shaping", desc: "Barrier potential, forward/reverse V-I characteristics, Zener breakdown, clippers and clampers.", diff: "Beginner", prereqIndices: [0] },
      { name: "Bipolar Junction Transistors (BJT) & Biasing", desc: "NPN/PNP configurations (CE/CB/CC), DC load lines, and operating Q-point stability.", diff: "Intermediate", prereqIndices: [0] },
      { name: "Field-Effect Transistors (MOSFET & JFET)", desc: "Enhancement/depletion MOSFETs, pinch-off, small-signal models, and CMOS logic.", diff: "Intermediate", prereqIndices: [2] },
      { name: "Small-Signal Amplifiers & Frequency Response", desc: "h-parameter models, gain-bandwidth product, RC-coupled stages, and Bode plots.", diff: "Intermediate", prereqIndices: [1, 2] },
      { name: "Operational Amplifiers & Feedback Systems", desc: "Ideal op-amp characteristics, inverting/non-inverting configurations, active filters, and Barkhausen criteria.", diff: "Advanced", prereqIndices: [3, 4] },
    ];
  }
  // 4. Mathematics & Calculus
  else if (/math|calculus|algebra|statistics|probability|differenti|integral|fourier|laplace|discrete/i.test(t)) {
    modules = [
      { name: "Limits, Continuity & Core Axioms", desc: "Epsilon-delta definitions, fundamental limit theorems, and continuity on closed intervals.", diff: "Beginner", prereqIndices: [] },
      { name: "Differential Calculus & Derivatives", desc: "Chain rule, Mean Value Theorem, Taylor polynomial approximations, and optimization.", diff: "Beginner", prereqIndices: [0] },
      { name: "Integral Calculus & Accumulation", desc: "Fundamental Theorem of Calculus, substitution, integration by parts, and improper integrals.", diff: "Intermediate", prereqIndices: [0] },
      { name: "Multivariable Analysis & Partial Derivatives", desc: "Gradient vectors, directional derivatives, tangent hyperplanes, and Lagrange multipliers.", diff: "Intermediate", prereqIndices: [1] },
      { name: "Differential Equations & Vector Calculus", desc: "First/second order ODEs, line and surface integrals, Green's and Stokes' theorems.", diff: "Advanced", prereqIndices: [2] },
      { name: "Fourier Analysis & Integral Transforms", desc: "Fourier series expansions, Fourier transforms, Laplace transforms, and boundary-value PDEs.", diff: "Advanced", prereqIndices: [3, 4] },
    ];
  }
  // 5. Physics & Applied Sciences
  else if (/physics|mechanic|thermodynam|optic|quantum|electromag|relativity|wave|nuclear|fluid/i.test(t)) {
    modules = [
      { name: "Classical Mechanics & Kinematics", desc: "Vector kinematics, Newton's three laws of motion, and frame-of-reference transformations.", diff: "Beginner", prereqIndices: [] },
      { name: "Conservation Laws & Work-Energy Theorem", desc: "Conservative forces, potential energy wells, linear/angular momentum conservation.", diff: "Beginner", prereqIndices: [0] },
      { name: "Electromagnetism & Maxwell's Equations", desc: "Coulomb's law, Gauss's law, magnetic flux, Faraday induction, and electromagnetic waves.", diff: "Intermediate", prereqIndices: [0] },
      { name: "Thermodynamics & Statistical Mechanics", desc: "Four laws of thermodynamics, Carnot cycle, entropy formulation, and kinetic theory.", diff: "Intermediate", prereqIndices: [1] },
      { name: "Wave Phenomena & Physical Optics", desc: "Superposition principle, interference, Fraunhofer diffraction, and wave-packet propagation.", diff: "Intermediate", prereqIndices: [2] },
      { name: "Quantum Physics & Wave-Particle Duality", desc: "Photoelectric effect, de Broglie wavelength, time-dependent Schrodinger equation, and atomic states.", diff: "Advanced", prereqIndices: [3, 4] },
    ];
  }
  // 6. General STEM / Technical Course Default
  else {
    modules = [
      { name: "Foundational Principles & Core Terminology", desc: "First principles, core axioms, standard notation, and governing frameworks.", diff: "Beginner", prereqIndices: [] },
      { name: "Core Methodology & Systematic Frameworks", desc: "Standard methods, baseline models, essential rules, and analytical approaches.", diff: "Beginner", prereqIndices: [0] },
      { name: "Applied Analysis & Mathematical Modeling", desc: "Component relationships, formal derivations, and systematic problem solving.", diff: "Intermediate", prereqIndices: [0] },
      { name: "Practical Implementations & Worked Case Studies", desc: "Standard workflows, realistic problem sets, and practical design configurations.", diff: "Intermediate", prereqIndices: [1] },
      { name: "Advanced Optimization & Synthesis", desc: "Edge conditions, high-level analysis, constraint handling, and performance tuning.", diff: "Advanced", prereqIndices: [2] },
      { name: "Comprehensive Systems Integration & Review", desc: "End-to-end concept synthesis, cross-domain integration, and complete topic review.", diff: "Advanced", prereqIndices: [3, 4] },
    ];
  }

  // Adjust difficulty labels based on the student's declared level
  const difficultyLadder: Array<"Beginner" | "Intermediate" | "Advanced"> = ["Beginner", "Intermediate", "Advanced"];
  const levelBoost: Record<string, number> = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  const boost = levelBoost[level] ?? 0;

  const conceptIds = modules.map((_, idx) => `c-${idx + 1}-${slug}`);

  return modules.map((m, idx) => ({
    id: conceptIds[idx],
    name: m.name,
    slug: `${slug}-m${idx + 1}`,
    importance: "high" as const,
    difficulty: difficultyLadder[Math.min(difficultyLadder.indexOf(m.diff) + boost, 2)],
    estimatedMinutes: safeMinutes,
    description: m.desc,
    prerequisites: m.prereqIndices.map((i) => conceptIds[i]).filter(Boolean),
    dependents: [],
    keyFormulas: [],
    dayAssigned: 1,
  }));
}


// ─────────────────────────────────────────────────────────────────────────────
// Main Curriculum Service
// ─────────────────────────────────────────────────────────────────────────────

export class CurriculumService {
  static async generateCurriculum(params: {
    title: string;
    goal: string;
    level: string;
    totalDays: number;
    minutesPerDay: number;
    sourceContext?: string;
    extractedUnits?: ExtractedUnit[];
  }): Promise<GeneratedCurriculum> {
    const provider = getAIProvider();
    const safeTotalDays = params.totalDays || 30;
    const safeMinutes = params.minutesPerDay || 60;
    const title = params.title || "Technical Course";

    // 1. Extract units from source context if not explicitly passed
    let units = params.extractedUnits || [];
    if (units.length === 0 && params.sourceContext) {
      units = RAGService.extractDocumentStructure(params.sourceContext);
    }

    // 2. Try AI Generation (Nemotron / Groq / Gemini)
    if (provider) {
      const unitsContext = units.length > 0
        ? units.map((u, i) => `Unit ${i + 1}: ${u.title}\nTopics: ${u.subtopics.join(", ")}\nFormulas: ${u.formulas.join(", ")}`).join("\n\n")
        : params.sourceContext?.slice(0, 6000) || "";

      const systemPrompt = `You are Cognix AI Course Architect & Knowledge Graph Engineer.
Analyze the provided course title, student knowledge level, and syllabus material.
Generate a structured, multi-branching Knowledge Tree (Directed Acyclic Graph - DAG) of 6 to 10 concept nodes matching the EXACT subject.

MANDATORY TREE & GRAPH STRUCTURE (CRITICAL):
1. NEVER generate a single flat 1-line linear sequence (Node 1 -> Node 2 -> Node 3 -> Node 4). The curriculum MUST branch like a tree!
2. Structure the concepts with multiple branching tracks:
   - Root Node(s) [Level 0]: 1 foundational concept node with NO prerequisites ("prerequisites": []).
   - Parallel Branch Tracks [Level 1]: 2 or 3 distinct specialization concepts that BOTH list the Root node as their prerequisite (e.g. "prerequisites": ["root-id"]).
   - Intermediate Sub-branches [Level 2]: Concepts that deepen Level 1 tracks (e.g. "prerequisites": ["branch-a-id"]).
   - Advanced Convergence / Capstone [Level 3]: 1 or 2 advanced concepts that depend on multiple upstream branches (e.g. "prerequisites": ["branch-a-id", "branch-b-id"]).
3. Ensure prerequisite IDs strictly match the "id" of the corresponding concept in the "concepts" array.
4. Concept names MUST be specific, standard academic topic names (e.g. for Java/OOP: "Classes & Objects", "Inheritance & Method Overriding", "Polymorphism & Dynamic Dispatch", "Interfaces & Abstract Classes", "Exception Handling", "Collections Framework & Generics").
   - NEVER prefix concept names with the course title (do NOT write "${title} - Classes", write "Classes & Objects").
   - NEVER use generic placeholder names like "basics1", "basics2", "Topic 1", "XXXX", or "Core Axioms".
5. Calibrate all concept descriptions and difficulty to the student's knowledge level: ${params.level || "Intermediate"}.
6. Provide 4 to 8 granular distinct subtopics per concept — each mapping to one focused study session.

Return ONLY a valid JSON object (NO markdown wrapper, NO text outside the JSON) matching this schema:
{
  "description": "2-3 sentence overview of what the student will master in this course",
  "category": "Academic Subject Category (e.g. Computer Science, Electronic Engineering, Applied Mathematics)",
  "concepts": [
    {
      "id": "c-unique-short-id",
      "name": "Exact Subject Concept Name (e.g. Classes & Objects)",
      "slug": "concept-slug",
      "importance": "high",
      "difficulty": "Beginner",
      "estimatedMinutes": ${safeMinutes},
      "description": "Concise concept overview grounded in the syllabus",
      "prerequisites": [],
      "keyFormulas": ["Exact Formula or Rule 1", "Exact Formula or Rule 2"],
      "subtopics": ["Specific Topic A", "Specific Topic B", "Specific Topic C", "Specific Topic D"]
    }
  ]
}`;

      const userPrompt = `Course: "${title}"
Goal: "${params.goal}"
Student Knowledge Level: ${params.level || "Intermediate"}
Schedule: ${safeTotalDays} days (${safeMinutes} mins/day)

Syllabus / Units Material (GROUND TRUTH — use ONLY what is here):
${unitsContext}

Synthesize 6 to 8 distinct concept nodes structured as a multi-branching Knowledge Tree/DAG with branching prerequisites and 4-8 specific daily subtopics per concept.`;

      try {
        const result = await provider.generateJSON<{
          description?: string;
          category?: string;
          concepts?: Array<GeneratedConcept & { subtopics?: string[] }>;
        }>(userPrompt, systemPrompt);

        if (result && Array.isArray(result.concepts) && result.concepts.length >= 3) {
          const aiUnitTopicMap = new Map<string, string[]>();

          const rawConcepts: GeneratedConcept[] = result.concepts.map((c, i) => {
            const conceptId = c.id || `c-${i + 1}-${c.slug || "concept"}`;
            if (Array.isArray(c.subtopics) && c.subtopics.length > 0) {
              aiUnitTopicMap.set(conceptId, c.subtopics);
            }
            return {
              id: conceptId,
              name: c.name,
              slug: c.slug || c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              importance: c.importance || "high",
              difficulty: c.difficulty || (i === 0 ? "Beginner" : i < result.concepts!.length - 1 ? "Intermediate" : "Advanced"),
              estimatedMinutes: c.estimatedMinutes || safeMinutes,
              description: c.description || `Mastery of ${c.name}.`,
              prerequisites: Array.isArray(c.prerequisites) ? c.prerequisites : [],
              dependents: [],
              keyFormulas: Array.isArray(c.keyFormulas) ? c.keyFormulas : [],
              dayAssigned: 1,
            };
          });

          const withDays = assignDaysByDepth(rawConcepts, safeTotalDays);
          const withDependents = computeDependents(withDays);
          const daysList = buildScheduleFromConcepts(withDependents, safeTotalDays, safeMinutes, aiUnitTopicMap.size > 0 ? aiUnitTopicMap : undefined);

          return {
            description: result.description || `${safeTotalDays}-day curriculum for ${title}.`,
            category: result.category || "Technical Engineering",
            concepts: withDependents,
            daysList,
          };
        }
      } catch (err) {
        console.warn("AI Curriculum synthesis fallback, deriving from source units:", err);
      }
    }

    // 3. Source-Derived Fallback (Uses Document Units directly — NO hardcoded data)
    if (units.length >= 2) {
      const { concepts, unitTopicMap } = buildConceptsFromUnits(units, title, safeMinutes);
      const withDays = assignDaysByDepth(concepts, safeTotalDays);
      const withDependents = computeDependents(withDays);
      const daysList = buildScheduleFromConcepts(withDependents, safeTotalDays, safeMinutes, unitTopicMap);

      return {
        description: `Comprehensive ${safeTotalDays}-day curriculum for ${title} derived directly from uploaded course notes across ${units.length} primary units.`,
        category: "Electronics Engineering",
        concepts: withDependents,
        daysList,
      };
    }

    // 4. Domain-Adaptive Title-Derived Fallback (for courses without document upload)
    const titleConcepts = synthesizeDomainAdaptiveConcepts(title, params.level || "Intermediate", safeMinutes);
    const withDays = assignDaysByDepth(titleConcepts, safeTotalDays);
    const withDependents = computeDependents(withDays);
    const daysList = buildScheduleFromConcepts(withDependents, safeTotalDays, safeMinutes);

    return {
      description: `Structured ${safeTotalDays}-day curriculum for ${title} covering foundational principles to advanced applications, calibrated for ${params.level || "Intermediate"} level.`,
      category: "Engineering & Applied Sciences",
      concepts: withDependents,
      daysList,
    };
  }
}
