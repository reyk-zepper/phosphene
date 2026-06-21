<div align="center">

# Phosphene

### See how AI thinks.

**An open-source AI reasoning and node-run visualizer.**
Explore two modes: **Reasoning Lab** for model reasoning graphs, and **Node Observer** for redacted AI-node demo traces. v0.1 does not claim live AI-node telemetry; live integration is a later adapter step.

[English](#english) · [Deutsch](#deutsch)

</div>

---

## English

### What is Phosphene?

Phosphene has two modes:

- **Reasoning Lab** turns model reasoning traces into an **interactive visual graph**. Instead of scrolling through walls of raw "thinking" text, you see each step of the model's thought process as a glowing node — categorized by type (hypothesis, analysis, revision, decision…), connected by organic edges, explorable with click, zoom, and pan.
- **Node Observer** renders redacted AI-node demo traces so runs, events, systems, statuses, risks, decisions, and recovery steps are understandable without exposing private payloads.

Node Observer v0.1 uses **synthetic/redacted demo traces only**, including grouped Hermes synthetic handoff fixtures generated on the AI Node and a published redacted snapshot boundary. It is not a live Hermes/AAG/OpenClaw/Sentinel telemetry integration yet.

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

> **🚧 Early development — v0.1 foundation.** Reasoning Lab and Node Observer both run in the client. Node Observer currently renders redacted built-in demos, Hermes synthetic handoff fixtures, and published redacted snapshots, not live AI-node telemetry.

Currently working:

- Bioluminescent dark UI shell (mode switch, graph canvas, detail panel, legend)
- Reasoning Lab demo graph for model reasoning exploration
- Node Observer mode with four redacted AI-node demo traces, grouped Hermes synthetic handoff fixtures, and a published redacted snapshot group
- Versioned Boundary JSON import / adapter boundary for trace events before they become internal graph data
- Local multi-file Boundary JSON upload with visible schema, graph, enum, and redaction validation checks
- Hermes handoff intake support for `manifest.json` and `validation-report.json` as local support context
- Node Observer readiness state for Boundary Contract, Handoff Intake, and AI Node Live Adapter status
- Published snapshot status panel for source, classification, manifest size, validation state, and no-live-telemetry boundary
- AI Node Canary status panel loaded from `/snapshots/canary/latest.json` as redacted operational status, with a 30-minute freshness check and no live agent telemetry
- Graph export buttons for SVG and PNG downloads from the current canvas
- CLI Boundary validator via `pnpm validate:traces -- <files-or-directories>`
- CLI snapshot publisher via `pnpm publish:snapshot -- --source <boundary-pack-dir> --target dist/snapshots/current`
- CLI AI Node canary generator via `pnpm generate:canary -- --target <boundary-pack-dir>`
- AI Node deploy helper preserves the latest published `dist/snapshots/current` and syncs the redacted canary status across app deploys
- Run summary panel for outcome, risk, systems, approvals, failures, recovery, and duration
- Hierarchical graph layout via `dagre` with D3-rendered nodes and bézier edges
- Eight reasoning node types, each with its own glow color
- Click to inspect, zoom & pan the canvas
- Strict TypeScript, Tailwind 4, React 19

Not yet built:

- Live AI-node adapters for Hermes, AAG, OpenClaw, Sentinel, Gmail, or Workspace
- Streaming reasoning parser
- API key management
- Graph search, comparison, shareable links

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

For Node Observer, Hermes and future live adapters run on the **AI Node**, not on the local development machine. Phosphene consumes redacted Boundary bundles, manifests, validation reports, or AI-node-published snapshots. See [AI Node Integration Boundary](./docs/product/phosphene-ai-node-integration-boundary.md) and [Node Observer Demo](./docs/demo/phosphene-node-observer-demo.md).

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
| `pnpm validate:traces -- <paths>` | Validate Boundary trace fixtures plus local manifest/report support files |
| `pnpm publish:snapshot -- --source <dir> --target <dir>` | Validate and atomically publish a redacted Boundary pack into a served snapshot directory |
| `pnpm generate:canary -- --target <dir>` | Generate a redacted AI Node operational canary Boundary pack; supports `--latest-file` and `--retention-count` for AI-Node status tracking |
| `/Users/raik./ai-stack/services/phosphene/ops/ai-node/install-phosphene-canary-launchagent.sh` | Install the non-publishing AI Node canary LaunchAgent |
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
- **v0.4** — Graph search, side-by-side model comparison, shareable links
- **v0.5+** — Extracted `@phosphene/parser` and `@phosphene/graph` as standalone npm packages

### Contributing

Phosphene is a solo open-source project by [@reyk-zepper](https://github.com/reyk-zepper), but contributions are welcome. The contribution barrier is intentionally low: clone, install, run. Start with an issue for anything non-trivial so we can align on direction first.

### License

MIT — see [LICENSE](./LICENSE).

---

## Deutsch

### Was ist Phosphene?

Phosphene hat zwei Modi:

- **Reasoning Lab** macht den verborgenen Denkprozess großer Sprachmodelle zu einem **interaktiven visuellen Graphen**. Statt endlose "Thinking"-Textblöcke zu scrollen, siehst du jeden Schritt des Reasonings als leuchtenden Node — kategorisiert nach Typ (Hypothese, Analyse, Korrektur, Entscheidung…), verbunden durch organische Kanten, explorierbar mit Klick, Zoom und Pan.
- **Node Observer** rendert redigierte AI-Node-Demo-Traces, damit Runs, Events, beteiligte Systeme, Status, Risiko, Entscheidungen und Recovery-Schritte verständlich werden, ohne private Payloads offenzulegen.

Node Observer v0.1 nutzt **synthetische/redigierte Demo-Traces**, inklusive gruppierter Hermes Synthetic Handoff Fixtures vom AI Node und einer veröffentlichten redigierten Snapshot-Boundary. Es ist noch keine Live-Telemetrie-Integration für Hermes/AAG/OpenClaw/Sentinel.

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

> **🚧 Frühe Entwicklung — v0.1 Foundation.** Reasoning Lab und Node Observer laufen im Client. Node Observer rendert aktuell redigierte Built-in-Demos, Hermes Synthetic Handoff Fixtures und veröffentlichte redigierte Snapshots, keine Live-AI-Node-Telemetrie.

Funktioniert bereits:

- Bioluminescent-Dark UI-Shell (Mode-Switch, Graph-Canvas, Detail-Panel, Legende)
- Reasoning-Lab-Demo-Graph für Reasoning-Exploration
- Node Observer mit vier redigierten AI-Node-Demo-Traces, gruppierten Hermes Synthetic Handoff Fixtures und veröffentlichter redigierter Snapshot-Gruppe
- Versionierte Boundary-JSON Import / Adapter Boundary für Trace-Events vor der internen Graph-Normalisierung
- Lokaler Multi-file Boundary-JSON-Upload mit sichtbaren Schema-, Graph-, Enum- und Redaction-Checks
- Hermes-Handoff-Intake für `manifest.json` und `validation-report.json` als lokalen Support-Kontext
- Node-Observer-Readiness-Status für Boundary Contract, Handoff Intake und AI Node Live Adapter
- Published-Snapshot-Statuspanel für Source, Classification, Manifest-Größe, Validation-Status und No-Live-Telemetry-Grenze
- AI-Node-Canary-Statuspanel aus `/snapshots/canary/latest.json` als redigierter Operational-Status mit 30-Minuten-Freshness-Check, nicht als Live-Agenten-Telemetrie
- Graph-Export-Buttons fuer SVG- und PNG-Downloads aus dem aktuellen Canvas
- CLI-Boundary-Validator via `pnpm validate:traces -- <files-or-directories>`
- CLI-Snapshot-Publisher via `pnpm publish:snapshot -- --source <boundary-pack-dir> --target dist/snapshots/current`
- CLI-AI-Node-Canary-Generator via `pnpm generate:canary -- --target <boundary-pack-dir>`
- AI-Node-Deploy-Helper erhält den zuletzt veröffentlichten `dist/snapshots/current` und synchronisiert den redigierten Canary-Status über App-Deploys hinweg
- Run-Summary-Panel für Ergebnis, Risiko, Systeme, Approvals, Fehler, Recovery und Dauer
- Hierarchisches Graph-Layout via `dagre`, gerendert mit D3-Nodes und Bézier-Kanten
- Acht Reasoning-Node-Typen, jeder mit eigener Glow-Farbe
- Klick zum Inspizieren, Zoom und Pan auf dem Canvas
- TypeScript Strict, Tailwind 4, React 19

Noch nicht gebaut:

- Live-AI-Node-Adapter für Hermes, AAG, OpenClaw, Sentinel, Gmail oder Workspace
- Streaming Reasoning-Parser
- API-Key-Management
- Graph-Suche, Vergleich, teilbare Links

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

Für den Node Observer laufen Hermes und spätere Live-Adapter auf dem **AI Node**, nicht auf der lokalen Entwicklungsmaschine. Phosphene konsumiert redigierte Boundary Bundles, Manifeste, Validation Reports oder AI-Node-publizierte Snapshots. Siehe [AI Node Integration Boundary](./docs/product/phosphene-ai-node-integration-boundary.md) und [Node Observer Demo](./docs/demo/phosphene-node-observer-demo.md).

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
| `pnpm validate:traces -- <paths>` | Boundary-Trace-Fixtures plus lokale Manifest-/Report-Support-Dateien validieren |
| `pnpm publish:snapshot -- --source <dir> --target <dir>` | Redigierten Boundary Pack validieren und atomar in einen served Snapshot-Pfad publizieren |
| `pnpm generate:canary -- --target <dir>` | Redigierten AI-Node-Operational-Canary-Boundary-Pack erzeugen; unterstützt `--latest-file` und `--retention-count` für AI-Node-Status-Tracking |
| `/Users/raik./ai-stack/services/phosphene/ops/ai-node/install-phosphene-canary-launchagent.sh` | Nicht-publizierenden AI-Node-Canary-LaunchAgent installieren |
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
- **v0.3** — OpenAI o-Series und Gemini-Adapter, Multi-Provider-Vergleich
- **v0.4** — Graph-Suche, Modell-Vergleich nebeneinander, teilbare Links
- **v0.5+** — `@phosphene/parser` und `@phosphene/graph` als eigenständige npm-Packages extrahieren

### Mitwirken

Phosphene ist ein Solo Open-Source Projekt von [@reyk-zepper](https://github.com/reyk-zepper), aber Beiträge sind willkommen. Die Contribution-Hürde ist bewusst niedrig: clone, install, run. Bei allem Größeren bitte erst ein Issue öffnen, damit wir die Richtung abstimmen können.

### Lizenz

MIT — siehe [LICENSE](./LICENSE).
