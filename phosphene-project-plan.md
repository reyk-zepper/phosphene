# Phosphene — AI Reasoning Visualizer

> *"The light you see when your eyes are closed."*
> Making the invisible thought of AI visible, navigable, and understandable.

---

## 1. Vision & Positioning

**One-Liner:** Phosphene is an open-source platform that transforms AI reasoning into interactive, visual landscapes — making it possible to see, explore, and compare how AI models think.

**Tagline-Kandidaten:**
- "See how AI thinks."
- "The visual debugger for AI reasoning."
- "X-Ray for AI thought."

**Zielgruppen:**
| Audience | Was sie davon haben |
|---|---|
| AI Developers | Prompt-Debugging, Reasoning-Vergleich zwischen Modellen |
| AI Researchers | Interpretability-Tooling, Reasoning-Pattern-Analyse |
| C-Level / Directors | "Können wir unserer AI vertrauen?" — visuell beantwortet |
| Educators | AI-Thinking als Lehrmaterial visualisieren |
| AI Enthusiasts | Faszination, Exploration, Verständnis |

---

## 2. MVP-Scope ("Phosphene v0.1")

### Ziel des MVP
Die kleinste Version, die bereits einen Wow-Effekt erzeugt und teilbar ist.

### Core Feature: Single-Prompt Reasoning Explorer

**User Flow:**
1. User öffnet Phosphene im Browser
2. User gibt einen Prompt ein (oder wählt einen Demo-Prompt)
3. User wählt ein Modell (Claude, GPT-4o, etc.)
4. Phosphene sendet den Prompt mit Reasoning-Modus
5. Das Reasoning wird live geparst und als interaktiver Graph gerendert
6. User kann den Graph navigieren: zoomen, Nodes expandieren, Pfade verfolgen

### MVP Feature-Set

**Must Have (v0.1):**
- [x] Prompt-Input mit Model-Selektor (Anthropic/Ollama; OpenAI-Adapter spaeter)
- [x] Reasoning-Trace-Parser (Extended Thinking / CoT heuristisch extrahieren)
- [x] Graph-Visualization: Reasoning als Baum/DAG
- [x] Node-Detail-Panel: Klick auf einen Node zeigt den Reasoning-Schritt
- [x] Live-Streaming: Graph baut sich auf während das Modell denkt
- [x] 3-5 Demo-Prompts für sofortigen Wow-Effekt
- [x] Dark-Mode-First Design (passt zur "Phosphene"-Metapher)
- [x] Export: Screenshot/PNG des Graphen

**Nice to Have (v0.2):**
- [x] Multi-Model-Vergleich: Gleicher Prompt, zwei Modelle side-by-side
- [x] Reasoning-Stats: Token-Count, Tiefe, Verzweigungen, Confidence-Heatmap
- [x] Shareable Links (Graph als URL)
- [x] Prompt-History / Session-Management
- [x] Keyboard-Shortcuts für Navigation

**Future (v0.3+, → Constitution-Bridge):**
- [x] Reasoning-Pattern-Library (häufige Denkmuster taggen)
- [x] Plugin-System für custom Modelle/APIs
- [x] Collaborative Annotation (Teams können Reasoning kommentieren)
- [x] Constitution-Mode: Regeln definieren & gegen Reasoning testen

---

## 3. Architektur

### High-Level Overview

```
┌─────────────────────────────────────────────────┐
│                  BROWSER (SPA)                   │
│                                                  │
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  Prompt   │  │   Graph      │  │  Detail   │  │
│  │  Input    │──│   Canvas     │──│  Panel    │  │
│  │          │  │  (D3/Canvas)  │  │           │  │
│  └──────────┘  └──────────────┘  └───────────┘  │
│        │              ▲                          │
│        ▼              │                          │
│  ┌─────────────────────────────────────────────┐ │
│  │          Reasoning Parser Engine             │ │
│  │  (Stream → Tokenize → Build Graph Model)    │ │
│  └─────────────────────────────────────────────┘ │
│        │                                         │
│        ▼                                         │
│  ┌─────────────────────────────────────────────┐ │
│  │           API Adapter Layer                  │ │
│  │  ┌─────────┐ ┌─────────┐ ┌──────────────┐  │ │
│  │  │ Claude  │ │ OpenAI  │ │  Custom/Local │  │ │
│  │  │ Adapter │ │ Adapter │ │   Adapter     │  │ │
│  │  └─────────┘ └─────────┘ └──────────────┘  │ │
│  └─────────────────────────────────────────────┘ │
│        │                                         │
└────────│─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────┐
│   LLM APIs          │
│   (User's API Keys) │
└─────────────────────┘
```

### Kernentscheidung: Client-Only Architektur

**Kein eigenes Backend.** Phosphene läuft komplett im Browser. API-Calls gehen direkt vom Client zu den LLM-APIs. Der User gibt seinen eigenen API-Key ein (gespeichert in localStorage, verschlüsselt).

**Vorteile:**
- Zero-Ops: Kein Server zu betreiben, kein Hosting-Aufwand
- Privacy: User-Daten verlassen nie den Browser
- Deployment: Static Site auf Vercel/Netlify/GitHub Pages
- Contribution-Barrier niedrig: `git clone → npm install → npm run dev`

**Trade-off:**
- API-Keys im Client (akzeptabel für Dev-Tool, nicht für Enterprise)
- CORS-Einschränkungen bei manchen APIs (Proxy-Option für Later)
- Kein serverseitiges Caching/Sharing (kommt in v0.3)

---

## 4. Tech-Stack

### Frontend
| Schicht | Technologie | Begründung |
|---|---|---|
| Framework | **React 19 + TypeScript** | Deine Stärke, riesiges Ecosystem |
| Build | **Vite** | Schnell, einfach, Standard |
| Styling | **Tailwind CSS + CSS Variables** | Rapid Prototyping, Custom Theming |
| Graph-Viz | **D3.js** (primär) | Maximale Kontrolle über Layout & Animation |
| Graph-Layout | **dagre** (DAG layout) | Automatisches Tree/DAG-Layout |
| Animation | **Framer Motion** | Smooth Node-Transitions beim Graph-Aufbau |
| State | **Zustand** | Leichtgewichtig, kein Boilerplate |
| Icons | **Lucide React** | Clean, konsistent |
| Code Display | **Shiki** (Syntax Highlighting) | Für Reasoning-Text-Rendering |

### API Integration
| Provider | API | Reasoning-Zugang |
|---|---|---|
| Anthropic | Messages API | `extended_thinking` (thinking blocks) |
| OpenAI | Chat Completions | `reasoning_effort` + reasoning tokens |
| Google | Gemini API | `thinkingConfig` |
| Local/Ollama | OpenAI-compatible | Wenn verfügbar |

### Dev Tooling
| Tool | Zweck |
|---|---|
| pnpm | Package Manager |
| ESLint + Prettier | Code Quality |
| Vitest | Unit Tests |
| Playwright | E2E Tests (Later) |
| GitHub Actions | CI/CD |
| Changesets | Versioning |

---

## 5. Reasoning-Parser — Das Herzstück

### Das Problem
Jedes Modell gibt Reasoning anders aus:

**Claude:** Separate `thinking` Blocks im Response
```json
{
  "content": [
    { "type": "thinking", "thinking": "Let me analyze..." },
    { "type": "text", "text": "The answer is..." }
  ]
}
```

**OpenAI o-Series:** `reasoning_content` in der Response (wenn verfügbar)

**Gemini:** `thoughtContent` Blocks

### Die Lösung: Unified Reasoning Model

```typescript
// Core Data Model
interface ReasoningGraph {
  id: string;
  prompt: string;
  model: ModelIdentifier;
  rootNode: ReasoningNode;
  metadata: GraphMetadata;
}

interface ReasoningNode {
  id: string;
  type: 'hypothesis' | 'analysis' | 'conclusion' | 'question' |
        'comparison' | 'evidence' | 'revision' | 'decision';
  content: string;
  summary: string;          // AI-generated 1-liner
  children: ReasoningNode[];
  depth: number;
  tokenCount: number;
  confidence?: number;       // Extracted from language cues
  timestamp: number;         // Position in stream
}

interface GraphMetadata {
  totalTokens: number;
  reasoningTokens: number;
  depth: number;
  branchCount: number;
  timeToComplete: number;
}
```

### Parser-Strategie

**Phase 1 (MVP):** Heuristisches Parsing
- Split auf Paragraph-Boundaries
- Erkennung von Signalwörtern: "Let me think...", "On the other hand...",
  "Actually, wait...", "So in conclusion..."
- Einfaches Indentation/Depth-Tracking

**Phase 2:** LLM-assisted Parsing
- Zweiter, kleiner LLM-Call der den Raw Reasoning-Text in
  strukturierte Nodes zerlegt
- Deutlich bessere Ergebnisse, aber höhere Latenz + Kosten

**Phase 3:** Fine-tuned Parser
- Kleines Modell (oder Regex+Heuristics), trainiert auf
  manuell gelabelten Reasoning-Traces

---

## 6. Visual Design Direction

### Ästhetik: "Bioluminescent Dark"

Inspiriert von der Phosphene-Metapher: Lichter im Dunkeln. Biolumineszenz.
Tiefseewesen. Neuronale Aktivität in der Nacht.

**Color System:**
```css
:root {
  /* Base: Near-black with slight blue undertone */
  --bg-primary: #0a0e17;
  --bg-secondary: #111827;
  --bg-surface: #1a2035;

  /* Phosphene Glow Colors (Node Types) */
  --glow-hypothesis: #00f5d4;   /* Cyan-Mint */
  --glow-analysis: #7b61ff;     /* Violet */
  --glow-conclusion: #fee440;   /* Warm Yellow */
  --glow-question: #f72585;     /* Magenta */
  --glow-revision: #ff6b35;     /* Warm Orange */
  --glow-evidence: #4cc9f0;     /* Sky Blue */

  /* Text */
  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
  --text-muted: #475569;

  /* Glow Effects */
  --glow-intensity: 0.6;
  --glow-radius: 20px;
}
```

**Design-Prinzipien:**
- Nodes "leuchten" im Dunkeln — jeder Typ hat seine eigene Farbe
- Verbindungslinien sind subtil, fast wie Nervenbahnen
- Hover/Select erzeugt "Puls"-Animation (wie ein Neuron das feuert)
- Graph baut sich auf wie ein wachsendes neuronales Netz
- Minimale UI-Chrome — der Graph ist der Star
- Monospace-Font für Reasoning-Content (JetBrains Mono)
- Display-Font für Headlines (Space Grotesk oder Outfit)

---

## 7. Roadmap & Milestones

### Phase 1: Foundation (Wochen 1-3)
**Ziel:** Repo-Setup, Core Architecture, erster statischer Graph

- [ ] GitHub Org `phosphene-ai` erstellen
- [ ] Repo `phosphene` mit Vite + React + TypeScript
- [ ] Project Structure (siehe unten)
- [ ] README mit Vision, Screenshots (Mockup), Contributing Guide
- [ ] Basic UI Shell: Prompt-Input, Graph-Canvas, Detail-Panel
- [ ] Statischer Demo-Graph mit Fake-Data (zum Design iterieren)
- [ ] D3 Graph-Rendering mit dagre Layout
- [ ] Node-Component mit Typ-basiertem Styling
- [ ] Dark Theme implementieren

### Phase 2: Live Connection (Wochen 4-6)
**Ziel:** Echte API-Calls, Streaming, Live-Graph-Aufbau

- [x] API-Key-Management (localStorage, UI)
- [x] Claude Adapter (Extended Thinking)
- [x] OpenAI Adapter (o1/o3 Reasoning)
- [x] Streaming-Pipeline: API → Parser → Graph-State → Render
- [x] Live-Animation: Nodes erscheinen während Modell denkt
- [x] Reasoning-Parser v1 (heuristisch)
- [x] Node-Detail-Panel: Content, Stats, Position im Baum
- [x] Error-Handling: API-Fehler, Rate Limits, ungültige Keys

### Phase 3: Polish & Launch (Wochen 7-10)
**Ziel:** Demo-Ready, teilbar, GitHub-Launch

- [ ] 5 kuratierte Demo-Prompts (kein API-Key nötig, pre-cached)
- [x] Graph-Export (PNG, SVG)
- [x] Keyboard-Navigation
- [ ] Performance-Optimierung (große Graphen)
- [ ] Mobile-Responsive (mindestens viewable)
- [ ] Landing Page (phosphene.dev)
- [ ] README polieren: GIF-Demo, Badges, Quick Start
- [x] Open Source License (MIT)
- [ ] Launch: HackerNews, Reddit r/MachineLearning, Twitter/X

### Phase 4: Differentiator Features (Wochen 11-16)
**Ziel:** Multi-Model, Community-Features

- [x] Side-by-Side-Vergleich (gleicher Prompt, zwei Modelle)
- [x] Reasoning-Heatmap (wo verbringt das Modell die meiste "Denkzeit"?)
- [x] Shareable Graphs (URL-basiert)
- [x] Gemini Adapter
- [x] Ollama/Local Adapter
- [x] Graph-Search: "Finde alle Stellen wo das Modell seine Meinung ändert"
- [x] Graph-Comparison-Foundation: Metrik-, Confidence- und Node-Typ-Deltas fuer Same-Prompt-Runs
- [x] Reasoning-Stats Dashboard

### Phase 5: Constitution Bridge (Monat 5+)
**Ziel:** Cortex-Engine extrahieren, Constitution vorbereiten

- [x] Parser als public Package Entry Point (`@reyk-zepper/phosphene/parser`)
- [x] Graph als public Package Entry Point (`@reyk-zepper/phosphene/graph`)
- [ ] Constitution-Repo aufsetzen, Phosphene-Engine einbinden
- [x] "Rule-Testing-Mode": Reasoning gegen Regeln visualisieren

---

## 8. Projektstruktur

```
phosphene/
├── public/
│   └── demo-data/           # Pre-cached reasoning traces für Demos
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── routes/
│   │   └── layouts/
│   ├── components/
│   │   ├── prompt/           # Prompt-Input, Model-Selector
│   │   ├── graph/            # Graph-Canvas, Nodes, Edges
│   │   ├── detail/           # Detail-Panel, Node-Inspector
│   │   ├── controls/         # Zoom, Pan, Filter, Export
│   │   └── shared/           # Buttons, Inputs, Modal, etc.
│   ├── core/
│   │   ├── parser/           # Reasoning-Text → Graph-Struktur
│   │   │   ├── types.ts      # ReasoningNode, ReasoningGraph
│   │   │   ├── heuristic.ts  # Heuristischer Parser
│   │   │   └── index.ts
│   │   ├── adapters/         # LLM-API Adapter
│   │   │   ├── claude.ts
│   │   │   ├── openai.ts
│   │   │   ├── gemini.ts
│   │   │   └── types.ts      # Unified Adapter Interface
│   │   ├── graph/            # Graph-Datenmodell & Algorithmen
│   │   │   ├── builder.ts    # Stream → Graph-State
│   │   │   ├── layout.ts     # dagre Layout-Wrapper
│   │   │   ├── search.ts     # Graph-Suche & Filter
│   │   │   └── compare.ts    # Graph-Vergleich & Deltas
│   │   └── store/            # Zustand Stores
│   │       ├── session.ts
│   │       ├── settings.ts
│   │       └── graph.ts
│   ├── hooks/                # Custom React Hooks
│   ├── styles/               # Global CSS, Theme Variables
│   └── utils/                # Helper, Crypto (Key-Encryption)
├── tests/
├── docs/
│   └── CONSTITUTION.md       # Geparktes Konzeptdokument
├── .github/
│   ├── workflows/
│   └── ISSUE_TEMPLATE/
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── LICENSE                   # MIT
└── README.md
```

---

## 9. README-Struktur (Draft)

```markdown
# 🔮 Phosphene

**See how AI thinks.**

Phosphene transforms AI reasoning into interactive visual landscapes.
Watch models think, explore their decision paths, and compare how
different AIs approach the same problem.

[Screenshot/GIF here]

## ✨ Features
- 🧠 Live reasoning visualization as interactive graphs
- 🔀 Compare reasoning across models (Claude, GPT, Gemini)
- 🎯 Click any node to inspect the reasoning step
- 📸 Export graphs as PNG/SVG
- 🔑 Your API keys, your browser — nothing leaves your machine
- 🌑 Beautiful bioluminescent dark theme

## 🚀 Quick Start
\`\`\`bash
git clone https://github.com/phosphene-ai/phosphene.git
cd phosphene
pnpm install
pnpm dev
\`\`\`
Open http://localhost:5173 — try a demo prompt or add your API key.

## 🤝 Contributing
[Contributing Guide link]

## 📄 License
MIT
```

---

## 10. Constitution — Geparktes Konzept

> Separates Dokument, hier nur die Kurzfassung als Referenz.

**Name:** Constitution
**Tagline:** "Define the rules your AI lives by."
**Kernidee:** Visueller, interaktiver Builder für AI-Verhaltensregeln.
Drag & Drop Regeleditor. LLM-basierter Scenario-Simulator.
Export als System-Prompt, Guardrails-Config, Policy-PDF.
**Verbindung zu Phosphene:** Nutzt `@phosphene/parser` und
`@phosphene/graph` um zu visualisieren, wie ein Modell durch
die definierten Regeln reasoned.
**Timing:** Nach Phosphene v0.3, wenn die Engine als Library extrahiert ist.

---

## 11. Risiken & Mitigations

| Risiko | Impact | Mitigation |
|---|---|---|
| Reasoning-APIs ändern sich | Hoch | Adapter-Pattern, schnell anpassbar |
| Parsing-Qualität zu niedrig | Hoch | Demo-Prompts kuratieren, LLM-assisted Parsing als Fallback |
| Graph wird bei langen Traces unübersichtlich | Mittel | Collapse/Expand, Zoom, Filter, Summary-Mode |
| API-Keys im Client unsicher | Mittel | localStorage-Encryption, klare Kommunikation, optional Proxy |
| Name "Phosphene" schwer auszusprechen | Niedrig | Kurz genug, einprägsam, keine Verwechslung |
| Scope Creep | Hoch | Strikt am MVP-Scope bleiben, Features priorisieren |

---

## 12. Nächster konkreter Schritt

1. **GitHub Org erstellen:** `phosphene-ai`
2. **Repo initialisieren:** Vite + React + TS + Tailwind
3. **Erster Commit:** Project Structure + README + Design Tokens
4. **Erster visueller Prototype:** Statischer Graph mit Fake-Reasoning-Data

> Ab hier beginnt das Vibe-Coding.
