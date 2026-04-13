# PHOSPHENE — Project Context Document for Claude Code

> Dieses Dokument ist der vollständige Kontext für die Entwicklung von Phosphene.
> Wenn du dieses Dokument liest, weißt du alles, was du brauchst, um loszulegen.

---

## Wer bin ich?

Ich bin Reyk, AI Adoption Manager, React-Entwickler, AI-Enthusiast. Ich baue Phosphene als Solo-Open-Source-Projekt. Mein Hauptansatz ist Vibe-Coding — ich gebe Richtung und Kontext, du setzt um. Wir arbeiten als Team.

**Mein Tech-Profil:**
- Stark in: React, JavaScript/TypeScript, Frontend-Architektur
- Erfahren in: RAG-Pipelines, API-Integration, ECM/DMS, Tomcat, Python
- Lernend in: D3.js, Graph-Visualization, Advanced Animations
- Arbeitsweise: Sachlich, direkt, strukturiert. Keine Floskeln. Copy-paste-ready Code.

---

## Was ist Phosphene?

**Phosphene ist ein Open-Source AI Reasoning Visualizer.**

Es transformiert die unsichtbaren Denkprozesse von AI-Modellen (Chain-of-Thought, Extended Thinking, Reasoning Traces) in interaktive, visuelle Graphen, die man navigieren, explorieren und vergleichen kann.

**Metapher:** Phosphene sind die Lichterscheinungen, die du siehst, wenn du die Augen schließt und drückst — visuell erzeugt vom Gehirn selbst, nicht von außen. Genau das tun wir: wir machen das "innere Licht" der AI sichtbar.

**Tagline:** "See how AI thinks."

**Zielgruppen:** AI Developers, Researchers, C-Level/Directors, Educators, AI Enthusiasts.

**Warum es das noch nicht gibt:** LangSmith/LangFuse machen Tracing und Logging. Aber niemand macht die visuelle, interaktive Exploration von Reasoning-Chains. Phosphene füllt diese Lücke.

---

## Architektur-Entscheidungen (bereits getroffen)

### Client-Only SPA — Kein Backend

Phosphene läuft komplett im Browser. Kein Server, kein Backend, keine Datenbank.

**Warum:**
- Zero-Ops: Static Site Deployment (Vercel/Netlify/GitHub Pages)
- Privacy: Nichts verlässt den Browser
- Niedrige Contribution-Barrier: `git clone → pnpm install → pnpm dev`
- Schnelle Iteration beim Vibe-Coding

**API-Calls** gehen direkt vom Client zu den LLM-APIs. Der User gibt seinen eigenen API-Key ein. Keys werden in localStorage gespeichert (base64-encoded, kein Server-Roundtrip).

**Trade-offs (akzeptiert):**
- Kein serverseitiges Caching/Sharing (kommt ggf. in v0.3+)
- CORS bei manchen APIs (Proxy als spätere Option)
- API-Keys im Client (für ein Dev-Tool akzeptabel)

### Datenfluss

```
User Prompt
    │
    ▼
API Adapter (Claude/OpenAI/Gemini)
    │
    ▼ (Streaming Response)
Reasoning Parser
    │
    ▼ (Structured ReasoningNodes)
Graph Builder (Zustand Store)
    │
    ▼ (State Updates)
D3.js Graph Renderer
    │
    ▼
Interactive Canvas (Zoom, Pan, Click, Expand)
```

---

## Tech-Stack (bereits entschieden)

| Schicht | Technologie | Version/Details |
|---|---|---|
| Framework | React 19 + TypeScript | Strict Mode |
| Build | Vite | Latest |
| Package Manager | pnpm | Workspaces-ready |
| Styling | Tailwind CSS 4 + CSS Variables | Dark-Mode-First |
| Graph-Visualization | D3.js | Force-Layout + dagre für DAG |
| Graph-Layout | dagre | Hierarchisches DAG-Layout |
| Animation | Framer Motion | Node-Transitions, Graph-Aufbau |
| State Management | Zustand | Leichtgewichtig, kein Boilerplate |
| Icons | Lucide React | |
| Syntax Highlighting | Shiki | Für Reasoning-Text-Rendering |
| Code Quality | ESLint + Prettier | Standard Config |
| Testing | Vitest | Unit Tests |

### Externe APIs

| Provider | Reasoning-Feature | Wie wir es nutzen |
|---|---|---|
| **Anthropic Claude** | `extended_thinking` in Messages API | `thinking` Blocks aus der Response extrahieren |
| **OpenAI o-Series** | `reasoning_effort` + `reasoning_content` | Reasoning-Tokens aus der Response |
| **Google Gemini** | `thinkingConfig` | `thoughtContent` Blocks |
| **Ollama/Local** | OpenAI-compatible API | Falls Reasoning verfügbar |

---

## Datenmodell

### Core Types (bereits definiert)

```typescript
// === CORE GRAPH MODEL ===

interface ReasoningGraph {
  id: string;
  prompt: string;
  model: ModelIdentifier;
  rootNode: ReasoningNode;
  metadata: GraphMetadata;
  createdAt: number;
}

interface ReasoningNode {
  id: string;
  type: ReasoningNodeType;
  content: string;           // Voller Reasoning-Text dieses Schritts
  summary: string;           // 1-Zeiler (AI-generiert oder heuristisch)
  children: ReasoningNode[];
  depth: number;
  tokenCount: number;
  confidence?: number;       // Aus Sprach-Cues extrahiert (0-1)
  timestamp: number;         // Position im Stream (ms seit Start)
}

type ReasoningNodeType =
  | 'hypothesis'   // "I think...", "My guess is..."
  | 'analysis'     // "Let me consider...", "Looking at..."
  | 'conclusion'   // "Therefore...", "In conclusion..."
  | 'question'     // "But what about...", "I wonder..."
  | 'comparison'   // "On the other hand...", "Comparing X to Y..."
  | 'evidence'     // "The data shows...", "According to..."
  | 'revision'     // "Wait, actually...", "I need to reconsider..."
  | 'decision';    // "I'll go with...", "The best approach is..."

interface GraphMetadata {
  totalTokens: number;
  reasoningTokens: number;
  outputTokens: number;
  maxDepth: number;
  branchCount: number;
  nodeCount: number;
  timeToComplete: number;    // ms
}

// === MODEL CONFIG ===

interface ModelIdentifier {
  provider: 'anthropic' | 'openai' | 'google' | 'ollama';
  model: string;             // z.B. "claude-sonnet-4-20250514"
  displayName: string;
}

// === API ADAPTER INTERFACE ===

interface LLMAdapter {
  id: string;
  name: string;
  sendPrompt(params: PromptParams): AsyncGenerator<ReasoningChunk>;
  validateKey(key: string): Promise<boolean>;
  supportedModels: ModelIdentifier[];
}

interface PromptParams {
  prompt: string;
  model: string;
  apiKey: string;
  maxTokens?: number;
  temperature?: number;
}

interface ReasoningChunk {
  type: 'thinking' | 'text' | 'error' | 'done';
  content: string;
  timestamp: number;
}

// === UI STATE ===

interface SessionState {
  currentGraph: ReasoningGraph | null;
  isStreaming: boolean;
  error: string | null;
  selectedNodeId: string | null;
}

interface SettingsState {
  apiKeys: Record<string, string>;  // provider → encrypted key
  defaultModel: ModelIdentifier;
  theme: 'dark';                     // Dark-Only für MVP
  graphLayout: 'dagre' | 'force';
}
```

---

## Visual Design

### Ästhetik: "Bioluminescent Dark"

Dunkler Hintergrund. Leuchtende Nodes. Nervenbahn-artige Verbindungen. Neuronales Netzwerk trifft Tiefsee-Biolumineszenz.

### Color System

```css
:root {
  /* Base */
  --bg-primary: #0a0e17;
  --bg-secondary: #111827;
  --bg-surface: #1a2035;
  --bg-elevated: #1e2a45;

  /* Node Glow Colors (mapped to ReasoningNodeType) */
  --glow-hypothesis: #00f5d4;    /* Cyan-Mint */
  --glow-analysis: #7b61ff;      /* Violet */
  --glow-conclusion: #fee440;    /* Warm Yellow */
  --glow-question: #f72585;      /* Magenta */
  --glow-comparison: #4cc9f0;    /* Sky Blue */
  --glow-evidence: #80ffdb;      /* Seafoam */
  --glow-revision: #ff6b35;      /* Warm Orange */
  --glow-decision: #b5e48c;      /* Soft Green */

  /* Text */
  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
  --text-muted: #475569;
  --text-on-glow: #0a0e17;

  /* Edges */
  --edge-default: rgba(148, 163, 184, 0.2);
  --edge-active: rgba(148, 163, 184, 0.6);
  --edge-highlight: var(--glow-analysis);

  /* Borders & Surfaces */
  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-active: rgba(255, 255, 255, 0.15);

  /* Glow Effects */
  --glow-intensity: 0.6;
  --glow-radius: 20px;
  --glow-spread: 40px;
}
```

### Typography

```css
:root {
  --font-display: 'Outfit', sans-serif;       /* Headlines, UI Labels */
  --font-body: 'IBM Plex Sans', sans-serif;    /* Body Text, Descriptions */
  --font-mono: 'JetBrains Mono', monospace;    /* Reasoning Content, Code */
}
```

Google Fonts Import:
```
https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap
```

### Design-Regeln

1. **Dark-Only.** Kein Light-Mode im MVP. Die Phosphene-Metapher lebt vom Dunkel.
2. **Der Graph ist der Star.** Minimale UI-Chrome. Kein überladenes Dashboard. Prompt-Input oben, Graph in der Mitte (80%+ der Fläche), Detail-Panel als Slide-Over von rechts.
3. **Nodes leuchten.** Jeder Node hat einen subtilen Glow in seiner Typ-Farbe. Hover verstärkt den Glow. Selection erzeugt einen Puls-Effekt.
4. **Edges sind organisch.** Keine geraden Linien. Leicht gebogene Bézier-Kurven. Subtile Opacity. Wie Nervenbahnen.
5. **Animation ist funktional.** Nodes erscheinen beim Streaming mit Fade-In + Scale. Keine gratuitösen Animationen.
6. **Responsive, aber Desktop-First.** Primär für große Bildschirme optimiert. Auf Mobile mindestens viewable.

---

## Projektstruktur

```
phosphene/
├── public/
│   ├── demo-data/                # Pre-cached Reasoning Traces (JSON)
│   │   ├── demo-logic-puzzle.json
│   │   ├── demo-code-review.json
│   │   └── demo-ethical-dilemma.json
│   └── favicon.svg
├── src/
│   ├── app/
│   │   ├── App.tsx               # Root Component, Layout
│   │   └── main.tsx              # Entry Point
│   ├── components/
│   │   ├── prompt/               # Prompt-Input Area
│   │   │   ├── PromptInput.tsx
│   │   │   ├── ModelSelector.tsx
│   │   │   └── DemoPrompts.tsx
│   │   ├── graph/                # Graph Visualization
│   │   │   ├── GraphCanvas.tsx   # D3 SVG Canvas
│   │   │   ├── GraphNode.tsx     # Single Node Component
│   │   │   ├── GraphEdge.tsx     # Edge/Connection Component
│   │   │   ├── GraphControls.tsx # Zoom, Pan, Reset, Layout-Toggle
│   │   │   └── GraphLegend.tsx   # Node-Type Legend
│   │   ├── detail/               # Detail/Inspector Panel
│   │   │   ├── DetailPanel.tsx   # Slide-Over Panel
│   │   │   ├── NodeContent.tsx   # Full Reasoning Text
│   │   │   └── NodeStats.tsx     # Token Count, Depth, etc.
│   │   ├── settings/             # API-Key Management
│   │   │   ├── ApiKeyModal.tsx
│   │   │   └── SettingsPanel.tsx
│   │   └── shared/               # Reusable UI Components
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Modal.tsx
│   │       ├── Badge.tsx
│   │       └── Tooltip.tsx
│   ├── core/
│   │   ├── parser/               # Reasoning Text → Graph Structure
│   │   │   ├── types.ts          # ReasoningNode, ReasoningGraph, etc.
│   │   │   ├── heuristic.ts      # Signal-Word-basierter Parser
│   │   │   ├── segmenter.ts      # Text-Segmentierung
│   │   │   └── index.ts
│   │   ├── adapters/             # LLM API Adapters
│   │   │   ├── types.ts          # LLMAdapter Interface
│   │   │   ├── claude.ts         # Anthropic Claude Adapter
│   │   │   ├── openai.ts         # OpenAI Adapter
│   │   │   ├── gemini.ts         # Google Gemini Adapter (v0.2)
│   │   │   ├── demo.ts           # Demo-Adapter (pre-cached data)
│   │   │   └── index.ts          # Adapter Registry
│   │   ├── graph/                # Graph Operations
│   │   │   ├── builder.ts        # Stream-Chunks → Graph-State
│   │   │   ├── layout.ts         # dagre Layout Wrapper
│   │   │   ├── search.ts         # Graph Search & Filter
│   │   │   └── export.ts         # PNG/SVG Export
│   │   └── store/                # Zustand Stores
│   │       ├── sessionStore.ts   # Current Session State
│   │       ├── settingsStore.ts  # API Keys, Preferences
│   │       └── graphStore.ts     # Graph Data & Operations
│   ├── hooks/
│   │   ├── useGraphNavigation.ts # Keyboard Navigation
│   │   ├── useStreaming.ts       # Streaming Hook
│   │   └── useApiKey.ts          # Key Management Hook
│   ├── styles/
│   │   ├── globals.css           # CSS Variables, Base Styles
│   │   └── graph.css             # Graph-specific Styles, Glow Effects
│   ├── utils/
│   │   ├── crypto.ts             # API-Key Encoding
│   │   ├── tokens.ts             # Token-Counting Heuristics
│   │   └── id.ts                 # UUID Generation
│   └── constants/
│       ├── models.ts             # Available Models Registry
│       ├── demoPrompts.ts        # Curated Demo Prompts
│       └── nodeTypes.ts          # Node Type Config (colors, labels, icons)
├── tests/
│   ├── parser/
│   │   └── heuristic.test.ts
│   ├── adapters/
│   │   └── claude.test.ts
│   └── graph/
│       └── builder.test.ts
├── docs/
│   ├── ARCHITECTURE.md
│   ├── CONTRIBUTING.md
│   └── CONSTITUTION.md           # Geparktes Konzept für Folgeprojekt
├── .github/
│   ├── workflows/
│   │   └── ci.yml
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       └── feature_request.md
├── CLAUDE.md                     # ← Dieses Dokument (oder Auszug davon)
├── README.md
├── LICENSE                       # MIT
├── package.json
├── pnpm-lock.yaml
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── eslint.config.js
└── .prettierrc
```

---

## Reasoning-Parser: Implementierungsdetails

### Heuristischer Parser (MVP)

Der Parser nimmt den rohen Reasoning-Text (z.B. aus Claude's `thinking` Block) und zerlegt ihn in strukturierte `ReasoningNode`s.

**Strategie:**

1. **Segmentierung:** Split auf Doppel-Newlines (Paragraphen)
2. **Typ-Erkennung:** Pattern-Matching auf Signalwörter am Anfang jedes Segments
3. **Hierarchie-Erkennung:** Einrückung, Nummerierung, Listenstruktur
4. **Summary-Generierung:** Erster Satz oder heuristisch gekürzter Content

**Signal-Word-Map:**

```typescript
const SIGNAL_PATTERNS: Record<ReasoningNodeType, RegExp[]> = {
  hypothesis: [
    /^(I think|My guess|I believe|It seems|Perhaps|Probably|I suspect)/i,
    /^(Let me hypothesize|My initial thought)/i,
  ],
  analysis: [
    /^(Let me (think|consider|analyze|examine|look|break))/i,
    /^(Looking at|Considering|Analyzing|Examining|Breaking down)/i,
    /^(First,|Second,|Third,|Next,|Then,)/i,
  ],
  conclusion: [
    /^(Therefore|Thus|So|In conclusion|To summarize|The answer is)/i,
    /^(In summary|Overall|Ultimately|Finally,)/i,
  ],
  question: [
    /^(But what|What if|How (would|could|does)|Why (would|does))/i,
    /^(I wonder|Could it be|Is it possible)/i,
    /\?$/,
  ],
  comparison: [
    /^(On the other hand|However|Alternatively|In contrast)/i,
    /^(Compared to|Unlike|Whereas|But|Yet)/i,
    /^(Option [A-Z0-9]|Approach [A-Z0-9])/i,
  ],
  evidence: [
    /^(The (data|evidence|research|facts) (shows?|suggests?|indicates?))/i,
    /^(According to|Based on|Studies show|Evidence suggests)/i,
  ],
  revision: [
    /^(Wait|Actually|Hold on|I need to reconsider|Let me correct)/i,
    /^(No,|Hmm,|On second thought|I was wrong)/i,
  ],
  decision: [
    /^(I('ll| will) go with|The best (approach|option|answer))/i,
    /^(My (recommendation|decision|choice) is)/i,
  ],
};
```

**Fallback:** Wenn kein Pattern matcht → `analysis` (der häufigste Typ).

---

## API Adapter: Claude (Primär)

### Request

```typescript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    thinking: {
      type: 'enabled',
      budget_tokens: 10000,
    },
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  }),
});
```

### Streaming Response Parsing

Claude streamt `content_block_start`, `content_block_delta`, `content_block_stop` Events. Thinking-Content kommt als `type: "thinking"` Blocks.

```typescript
// Pseudo-Code für Stream-Processing
for await (const event of streamEvents) {
  if (event.type === 'content_block_start') {
    if (event.content_block.type === 'thinking') {
      // Neuer Thinking-Block beginnt
      currentBlockType = 'thinking';
    }
  }
  if (event.type === 'content_block_delta') {
    if (event.delta.type === 'thinking_delta') {
      // Thinking-Text akkumulieren
      thinkingBuffer += event.delta.thinking;
      // Periodisch an Parser übergeben für Live-Updates
      yield { type: 'thinking', content: event.delta.thinking, timestamp: Date.now() };
    }
    if (event.delta.type === 'text_delta') {
      // Finale Antwort
      yield { type: 'text', content: event.delta.text, timestamp: Date.now() };
    }
  }
}
```

### Wichtig: `anthropic-dangerous-direct-browser-access`

Dieser Header ist nötig für direkte Browser-to-API Calls. Anthropic erlaubt das explizit für Development-Tools. Ohne diesen Header blockt CORS.

---

## Demo-Prompts (Pre-cached)

Damit der Wow-Effekt sofort da ist, auch ohne API-Key:

1. **Logic Puzzle:** "A farmer needs to cross a river with a wolf, a goat, and a cabbage. The boat can only carry the farmer and one item. If left alone, the wolf eats the goat, and the goat eats the cabbage. How does the farmer get everything across?"

2. **Code Review:** "Review this Python function and suggest improvements: `def fib(n): return n if n <= 1 else fib(n-1) + fib(n-2)`"

3. **Ethical Dilemma:** "Should self-driving cars prioritize the safety of their passengers over pedestrians in unavoidable accident scenarios? Consider the ethical frameworks involved."

4. **System Design:** "Design a URL shortener that handles 100M URLs. What are the key components, trade-offs, and failure modes?"

5. **Creative Reasoning:** "If gravity suddenly became 10% stronger overnight, what would be the cascading effects on human civilization over the next year?"

Diese werden einmalig gegen Claude/GPT gefahren, die Reasoning-Traces als JSON gespeichert in `public/demo-data/`, und über den `demo` Adapter geladen.

---

## Aktueller Status

### Was existiert:
- ✅ Projektname: **Phosphene**
- ✅ Vision & Positioning definiert
- ✅ Architektur entschieden (Client-Only SPA)
- ✅ Tech-Stack entschieden
- ✅ Datenmodell definiert
- ✅ Visual Design Direction festgelegt
- ✅ Projektstruktur definiert
- ✅ Parser-Strategie definiert
- ✅ API-Adapter-Interface definiert
- ✅ Dieses Context-Dokument

### Was als Nächstes passieren muss:
- ⬜ Repo `phosphene` unter Reyks persönlichem GitHub-Account erstellen
- ⬜ Repo initialisieren mit Vite + React + TS + Tailwind
- ⬜ Projektstruktur anlegen
- ⬜ Design Tokens (CSS Variables) implementieren
- ⬜ Basis-UI-Shell: Prompt-Input, leerer Graph-Canvas, Detail-Panel
- ⬜ Statischer Demo-Graph mit Fake-Data rendern
- ⬜ D3 Graph-Rendering mit dagre Layout
- ⬜ Node-Component mit Typ-basiertem Glow-Styling

---

## Arbeitsanweisungen für Claude Code

### Stil
- TypeScript Strict Mode. Keine `any` Types.
- Functional Components mit Hooks. Keine Class Components.
- Zustand für State. Kein Redux, kein Context API für globalen State.
- Tailwind für Layout und Spacing. CSS Variables für Farben und Theming.
- Named Exports bevorzugen.
- Kleine, fokussierte Dateien. Max ~150 Zeilen pro Datei.
- Kommentare nur wo nötig (Warum, nicht Was).

### Commit-Stil
- Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `style:`, `chore:`
- Englische Commit-Messages
- Ein Feature pro Commit

### Priorisierung
1. **Funktioniert** > Schön > Clever
2. **Sichtbar** > Unsichtbar (immer zuerst das bauen, was man sehen kann)
3. **Einfach** > Komplex (Komplexität nur wenn nötig)

### Wenn du unsicher bist
- Frag mich. Lieber eine kurze Rückfrage als eine falsche Annahme.
- Bei Design-Entscheidungen: Schlage 2 Optionen vor mit Trade-offs.
- Bei Tech-Entscheidungen: Wähle die einfachere Option, es sei denn es gibt einen guten Grund für die komplexere.

---

## Folgeprojekt: Constitution (geparkt)

Constitution ist ein visueller AI Governance Builder — ein interaktiver Drag & Drop Editor für AI-Verhaltensregeln mit LLM-basiertem Scenario-Simulator. Es wird die Phosphene-Engine (`@phosphene/parser` und `@phosphene/graph`) als Visualization-Layer nutzen, um zu zeigen, wie ein Modell durch definierte Regeln reasoned.

**Timing:** Frühestens nach Phosphene v0.3, wenn die Engine als eigenständige npm-Packages extrahiert ist. Bis dahin ist Constitution nur ein Konzept in `docs/CONSTITUTION.md`.

**Für jetzt: Constitution ignorieren. Fokus ist Phosphene.**

---

## Lass uns loslegen.

Der nächste Befehl den ich eingebe ist: Bootstrappe das Projekt. Erstelle die Vite + React + TypeScript + Tailwind Projektstruktur, implementiere die Design Tokens, und baue die erste UI-Shell mit Prompt-Input, leerem Graph-Canvas und Detail-Panel.
