<div align="center">

# Phosphene

### See how AI thinks.

**An open-source AI reasoning visualizer.**
Transform invisible thought processes of language models — chain-of-thought, extended thinking, reasoning traces — into interactive, navigable graphs.

[English](#english) · [Deutsch](#deutsch)

</div>

---

## English

### What is Phosphene?

Phosphene turns the hidden reasoning of large language models into an **interactive visual graph**. Instead of scrolling through walls of raw "thinking" text, you see each step of the model's thought process as a glowing node — categorized by type (hypothesis, analysis, revision, decision…), connected by organic edges, explorable with click, zoom, and pan.

**The metaphor:** Phosphenes are the light patterns you see when you close your eyes and press on them — light generated *by the brain itself*, not by anything external. That's exactly what this tool does: it makes the inner light of AI reasoning visible.

**Tagline:** *See how AI thinks.*

### Why it exists

Tools like LangSmith and LangFuse handle tracing and logging for production AI systems. But nobody makes the **visual, interactive exploration** of reasoning chains itself. Phosphene fills that gap.

Built for:

- **AI developers** debugging prompt behavior
- **Researchers** studying reasoning patterns
- **Educators** teaching how LLMs arrive at answers
- **Decision makers** who need to understand model behavior without reading token streams
- **Anyone curious** about what's actually happening inside the box

### Status

> **🚧 Early development — v0.0.1.** The first interactive prototype runs. A full roadmap is below.

Currently working:

- Bioluminescent dark UI shell (prompt bar, graph canvas, detail panel, legend)
- Hierarchical graph layout via `dagre` with D3-rendered nodes and bézier edges
- Eight reasoning node types, each with its own glow color
- Hardcoded demo reasoning trace for a classic logic puzzle, rendered end-to-end
- Click to inspect, zoom & pan the canvas
- Strict TypeScript, Tailwind 4, React 19

Not yet built:

- Live API adapters (Claude, OpenAI, Gemini)
- Streaming reasoning parser
- API key management
- Graph export, search, comparison

### Tech stack

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript (strict) |
| Build | Vite 6 |
| Package manager | pnpm |
| Styling | Tailwind CSS 4 + CSS variables (dark-mode-first) |
| Graph layout | dagre |
| Graph rendering | D3.js (SVG) |
| State | Zustand |
| Animation | Framer Motion |
| Icons | Lucide React |
| Testing | Vitest |

### Architecture

Phosphene is a **client-only SPA**. No backend, no database, no server. Everything runs in the browser:

- API calls go **directly** from the client to LLM providers (using CORS-enabled headers where supported)
- API keys are stored in `localStorage` (base64-encoded, never leave the machine)
- Deployment is a static build — Vercel, Netlify, GitHub Pages, anything
- Contribution barrier is minimal: `git clone && pnpm install && pnpm dev`

### Getting started

**Prerequisites:** Node.js ≥ 20, pnpm ≥ 9.

```bash
git clone https://github.com/reyk-zepper/phosphene.git
cd phosphene
pnpm install
pnpm dev
```

Then open [http://localhost:5173](http://localhost:5173). The demo reasoning graph will render automatically.

### Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Start the Vite dev server |
| `pnpm build` | Type-check and build a production bundle |
| `pnpm preview` | Preview the production build locally |
| `pnpm test` | Run the Vitest unit tests |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format with Prettier |

### Design language — "Bioluminescent Dark"

Dark background. Nodes *glow* in category-specific colors. Edges curve like nerve fibers. Every animation has a purpose — nothing is decoration.

| Node type | Meaning | Glow |
|---|---|---|
| Hypothesis | Initial guess, proposed idea | Cyan-mint `#00f5d4` |
| Analysis | Breaking things down, examining | Violet `#7b61ff` |
| Evidence | Citing facts, data, prior knowledge | Seafoam `#80ffdb` |
| Comparison | Weighing alternatives | Sky blue `#4cc9f0` |
| Question | Probing further, what-if | Magenta `#f72585` |
| Revision | Correcting, reconsidering | Warm orange `#ff6b35` |
| Conclusion | Summary, final answer | Warm yellow `#fee440` |
| Decision | Committing to a path | Soft green `#b5e48c` |

Typography uses three free Google Fonts — **Outfit** (display), **IBM Plex Sans** (body), **JetBrains Mono** (reasoning text and code).

### Project layout

```
phosphene/
├── public/demo-data/        # Pre-cached reasoning traces (JSON)
├── src/
│   ├── app/                 # Entry point and root layout
│   ├── components/          # UI — prompt, graph, detail, settings, shared
│   ├── core/
│   │   ├── parser/          # Text → structured reasoning nodes
│   │   ├── adapters/        # LLM API adapters
│   │   ├── graph/           # Graph operations (layout, search, export)
│   │   └── store/           # Zustand stores
│   ├── hooks/
│   ├── styles/              # Design tokens + graph CSS
│   ├── utils/
│   └── constants/           # Model registry, demo prompts, node types
├── tests/
└── docs/
```

### Roadmap

- **v0.1** — UI shell, demo graph, node types, detail panel ✅
- **v0.2** — Claude adapter with extended thinking + streaming parser + API key management
- **v0.3** — OpenAI o-series and Gemini adapters, multi-provider comparison, graph export
- **v0.4** — Graph search, side-by-side model comparison, shareable links, PNG/SVG export
- **v0.5+** — Extracted `@phosphene/parser` and `@phosphene/graph` as standalone npm packages

### Contributing

Phosphene is a solo open-source project by [@reyk-zepper](https://github.com/reyk-zepper), but contributions are welcome. The contribution barrier is intentionally low: clone, install, run. Start with an issue for anything non-trivial so we can align on direction first.

### License

MIT — see [LICENSE](./LICENSE).

---

## Deutsch

### Was ist Phosphene?

Phosphene macht den verborgenen Denkprozess großer Sprachmodelle zu einem **interaktiven visuellen Graphen**. Statt endlose "Thinking"-Textblöcke zu scrollen, siehst du jeden Schritt des Reasonings als leuchtenden Node — kategorisiert nach Typ (Hypothese, Analyse, Korrektur, Entscheidung…), verbunden durch organische Kanten, explorierbar mit Klick, Zoom und Pan.

**Die Metapher:** Phosphene sind die Lichterscheinungen, die du siehst, wenn du die Augen schließt und darauf drückst — Licht, das vom *Gehirn selbst* erzeugt wird, nicht von außen. Genau das tut dieses Tool: es macht das innere Licht der KI sichtbar.

**Tagline:** *See how AI thinks.*

### Warum es das gibt

Tools wie LangSmith und LangFuse machen Tracing und Logging für produktive AI-Systeme. Aber niemand macht die **visuelle, interaktive Exploration** der Reasoning-Ketten selbst. Phosphene schließt diese Lücke.

Gebaut für:

- **AI Developer**, die Prompt-Verhalten debuggen
- **Forschende**, die Reasoning-Muster untersuchen
- **Lehrende**, die erklären, wie LLMs zu Antworten kommen
- **Entscheider**, die Modell-Verhalten verstehen wollen, ohne Token-Streams zu lesen
- **Alle Neugierigen**, die wissen wollen, was in der Black Box passiert

### Status

> **🚧 Frühe Entwicklung — v0.0.1.** Der erste interaktive Prototyp läuft. Die vollständige Roadmap findest du weiter unten.

Funktioniert bereits:

- Bioluminescent-Dark UI-Shell (Prompt-Leiste, Graph-Canvas, Detail-Panel, Legende)
- Hierarchisches Graph-Layout via `dagre`, gerendert mit D3-Nodes und Bézier-Kanten
- Acht Reasoning-Node-Typen, jeder mit eigener Glow-Farbe
- Hardcodierter Demo-Reasoning-Trace zum klassischen Flussüberquerungs-Rätsel
- Klick zum Inspizieren, Zoom und Pan auf dem Canvas
- TypeScript Strict, Tailwind 4, React 19

Noch nicht gebaut:

- Live-API-Adapter (Claude, OpenAI, Gemini)
- Streaming Reasoning-Parser
- API-Key-Management
- Graph Export, Suche, Vergleich

### Tech-Stack

| Schicht | Entscheidung |
|---|---|
| Framework | React 19 + TypeScript (strict) |
| Build | Vite 6 |
| Package Manager | pnpm |
| Styling | Tailwind CSS 4 + CSS Variablen (Dark-Mode-First) |
| Graph-Layout | dagre |
| Graph-Rendering | D3.js (SVG) |
| State | Zustand |
| Animation | Framer Motion |
| Icons | Lucide React |
| Testing | Vitest |

### Architektur

Phosphene ist eine **Client-Only SPA**. Kein Backend, keine Datenbank, kein Server. Alles läuft im Browser:

- API-Calls gehen **direkt** vom Client zu den LLM-Anbietern (mit CORS-Headern, wo unterstützt)
- API-Keys liegen in `localStorage` (base64-kodiert, verlassen nie die Maschine)
- Deployment ist ein statischer Build — Vercel, Netlify, GitHub Pages, egal was
- Die Einstiegshürde für Contributions ist minimal: `git clone && pnpm install && pnpm dev`

### Setup

**Voraussetzungen:** Node.js ≥ 20, pnpm ≥ 9.

```bash
git clone https://github.com/reyk-zepper/phosphene.git
cd phosphene
pnpm install
pnpm dev
```

Dann [http://localhost:5173](http://localhost:5173) öffnen. Der Demo-Reasoning-Graph wird automatisch geladen.

### Scripts

| Befehl | Funktion |
|---|---|
| `pnpm dev` | Vite Dev-Server starten |
| `pnpm build` | Typecheck und Production-Build erzeugen |
| `pnpm preview` | Production-Build lokal ansehen |
| `pnpm test` | Vitest Unit-Tests ausführen |
| `pnpm lint` | ESLint ausführen |
| `pnpm format` | Mit Prettier formatieren |

### Design-Sprache — "Bioluminescent Dark"

Dunkler Hintergrund. Nodes *leuchten* in typ-spezifischen Farben. Kanten sind geschwungen wie Nervenbahnen. Jede Animation hat einen Zweck — nichts ist Dekoration.

| Node-Typ | Bedeutung | Glow |
|---|---|---|
| Hypothese | Erste Vermutung, vorgeschlagene Idee | Cyan-Mint `#00f5d4` |
| Analyse | Zerlegen, untersuchen | Violett `#7b61ff` |
| Evidenz | Fakten, Daten, Vorwissen zitieren | Seafoam `#80ffdb` |
| Vergleich | Alternativen abwägen | Himmelblau `#4cc9f0` |
| Frage | Weiter bohren, Was-wäre-wenn | Magenta `#f72585` |
| Korrektur | Berichtigen, neu bewerten | Warmes Orange `#ff6b35` |
| Schlussfolgerung | Zusammenfassung, finale Antwort | Warmes Gelb `#fee440` |
| Entscheidung | Festlegen auf einen Weg | Sanftes Grün `#b5e48c` |

Typografie nutzt drei kostenlose Google Fonts — **Outfit** (Display), **IBM Plex Sans** (Body), **JetBrains Mono** (Reasoning-Text und Code).

### Projektstruktur

```
phosphene/
├── public/demo-data/        # Vorgefertigte Reasoning-Traces (JSON)
├── src/
│   ├── app/                 # Einstieg und Root-Layout
│   ├── components/          # UI — prompt, graph, detail, settings, shared
│   ├── core/
│   │   ├── parser/          # Text → strukturierte Reasoning-Nodes
│   │   ├── adapters/        # LLM API-Adapter
│   │   ├── graph/           # Graph-Operationen (Layout, Suche, Export)
│   │   └── store/           # Zustand Stores
│   ├── hooks/
│   ├── styles/              # Design Tokens + Graph CSS
│   ├── utils/
│   └── constants/           # Modell-Registry, Demo-Prompts, Node-Typen
├── tests/
└── docs/
```

### Roadmap

- **v0.1** — UI-Shell, Demo-Graph, Node-Typen, Detail-Panel ✅
- **v0.2** — Claude-Adapter mit Extended Thinking + Streaming-Parser + API-Key-Management
- **v0.3** — OpenAI o-Series und Gemini-Adapter, Multi-Provider-Vergleich, Graph-Export
- **v0.4** — Graph-Suche, Modell-Vergleich nebeneinander, teilbare Links, PNG/SVG-Export
- **v0.5+** — `@phosphene/parser` und `@phosphene/graph` als eigenständige npm-Packages extrahieren

### Mitwirken

Phosphene ist ein Solo Open-Source Projekt von [@reyk-zepper](https://github.com/reyk-zepper), aber Beiträge sind willkommen. Die Contribution-Hürde ist bewusst niedrig: clone, install, run. Bei allem Größeren bitte erst ein Issue öffnen, damit wir die Richtung abstimmen können.

### Lizenz

MIT — siehe [LICENSE](./LICENSE).
