import { withBasePath } from './routing';

export function LandingPage() {
  const appUrl = withBasePath('/', import.meta.env.BASE_URL);
  const heroImageUrl = withBasePath(
    '/landing/assets/phosphene-reasoning-lab-v0.1.42.png',
    import.meta.env.BASE_URL
  );
  const demoMediaUrl = withBasePath('/landing/assets/phosphene-demo-v0.1.42.gif', import.meta.env.BASE_URL);

  return (
    <main className="landing-shell">
      <style>{`
        .landing-shell {
          min-height: 100%;
          background:
            linear-gradient(180deg, rgba(2, 8, 13, 0.38), #02080d 78%),
            radial-gradient(circle at 20% 8%, rgba(0, 245, 212, 0.14), transparent 24rem),
            radial-gradient(circle at 92% 18%, rgba(76, 201, 240, 0.1), transparent 22rem),
            #02080d;
          color: #e7f8ff;
          overflow-x: hidden;
        }

        .landing-shell a {
          color: inherit;
        }

        .landing-hero {
          position: relative;
          min-height: 88vh;
          overflow: hidden;
          isolation: isolate;
          border-bottom: 1px solid rgba(124, 180, 214, 0.18);
        }

        .landing-hero::before {
          position: absolute;
          inset: 0;
          z-index: -2;
          content: "";
          background:
            linear-gradient(90deg, rgba(2, 8, 13, 0.92) 0%, rgba(2, 8, 13, 0.74) 35%, rgba(2, 8, 13, 0.18) 100%),
            linear-gradient(0deg, rgba(2, 8, 13, 0.9) 0%, rgba(2, 8, 13, 0.18) 46%, rgba(2, 8, 13, 0.6) 100%),
            url(${heroImageUrl}) center / cover no-repeat;
          filter: saturate(1.08);
        }

        .landing-hero::after {
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          content: "";
          background-image:
            linear-gradient(rgba(124, 180, 214, 0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124, 180, 214, 0.04) 1px, transparent 1px);
          background-size: 72px 72px;
          mask-image: linear-gradient(90deg, black, transparent 72%);
        }

        .landing-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          width: min(1180px, calc(100% - 2rem));
          margin: 0 auto;
          padding: 1.35rem 0;
        }

        .landing-brand {
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
          font-weight: 700;
          letter-spacing: 0;
          text-decoration: none;
        }

        .landing-brand-mark {
          width: 0.75rem;
          height: 0.75rem;
          border-radius: 999px;
          background: #00f5d4;
          box-shadow: 0 0 22px #00f5d4;
        }

        .landing-nav-links {
          display: flex;
          align-items: center;
          gap: 1rem;
          color: #8fa4b8;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .landing-nav-links a {
          text-decoration: none;
        }

        .landing-nav-links a:hover {
          color: #00f5d4;
        }

        .landing-hero-copy {
          display: grid;
          align-content: center;
          width: min(1180px, calc(100% - 2rem));
          min-height: calc(88vh - 5.2rem);
          margin: 0 auto;
          padding: 4rem 0 7rem;
        }

        .landing-eyebrow {
          margin: 0 0 1rem;
          color: #00f5d4;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .landing-shell h1 {
          max-width: 10ch;
          margin: 0;
          font-family: var(--font-display);
          font-size: clamp(4.7rem, 13vw, 10.8rem);
          font-weight: 800;
          line-height: 0.88;
          letter-spacing: 0;
          text-shadow: 0 0 44px rgba(0, 245, 212, 0.28);
        }

        .landing-tagline {
          max-width: 54rem;
          margin: 1.45rem 0 0;
          color: #e7f8ff;
          font-size: clamp(1.25rem, 2.2vw, 2.05rem);
          line-height: 1.22;
        }

        .landing-summary {
          max-width: 43rem;
          margin: 1rem 0 0;
          color: #8fa4b8;
          font-size: 1rem;
          line-height: 1.72;
        }

        .landing-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-top: 2rem;
        }

        .landing-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 2.95rem;
          padding: 0 1.1rem;
          border: 1px solid rgba(124, 180, 214, 0.18);
          border-radius: 0.45rem;
          font-family: var(--font-mono);
          font-size: 0.78rem;
          letter-spacing: 0.08em;
          text-decoration: none;
          text-transform: uppercase;
          transition:
            border-color 180ms ease,
            color 180ms ease,
            background 180ms ease,
            transform 180ms ease;
        }

        .landing-button:hover {
          transform: translateY(-1px);
        }

        .landing-button-primary {
          border-color: rgba(0, 245, 212, 0.46);
          background: rgba(0, 245, 212, 0.13);
          color: #00f5d4;
          box-shadow: 0 0 28px rgba(0, 245, 212, 0.14);
        }

        .landing-button-secondary {
          color: #e7f8ff;
          background: rgba(10, 20, 34, 0.55);
        }

        .landing-section {
          width: min(1180px, calc(100% - 2rem));
          margin: 0 auto;
          padding: 4.5rem 0;
        }

        .landing-section-header {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 2rem;
          margin-bottom: 1.5rem;
        }

        .landing-shell h2 {
          margin: 0;
          font-family: var(--font-display);
          font-size: clamp(2rem, 5vw, 4rem);
          line-height: 0.96;
          letter-spacing: 0;
        }

        .landing-section-note {
          max-width: 28rem;
          margin: 0;
          color: #8fa4b8;
          line-height: 1.65;
        }

        .landing-proof-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.75rem;
        }

        .landing-proof {
          min-height: 10rem;
          padding: 1rem;
          border: 1px solid rgba(124, 180, 214, 0.18);
          border-radius: 0.5rem;
          background: rgba(9, 18, 30, 0.78);
        }

        .landing-proof strong {
          display: block;
          margin-bottom: 0.55rem;
          color: #e7f8ff;
        }

        .landing-proof span {
          color: #8fa4b8;
          line-height: 1.6;
        }

        .landing-media-band {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(18rem, 0.9fr);
          gap: 1.25rem;
          align-items: stretch;
        }

        .landing-demo-media {
          width: 100%;
          height: 100%;
          min-height: 23rem;
          object-fit: cover;
          border: 1px solid rgba(124, 180, 214, 0.18);
          border-radius: 0.55rem;
          background: rgba(12, 24, 39, 0.92);
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.32);
        }

        .landing-boundary {
          display: grid;
          align-content: center;
          gap: 0.75rem;
          padding: 1.25rem;
          border: 1px solid rgba(181, 228, 140, 0.28);
          border-radius: 0.55rem;
          background: linear-gradient(180deg, rgba(15, 31, 39, 0.94), rgba(6, 16, 25, 0.94));
        }

        .landing-boundary-item {
          padding: 1rem;
          border: 1px solid rgba(181, 228, 140, 0.16);
          border-radius: 0.42rem;
          color: #8fa4b8;
        }

        .landing-boundary-item strong {
          display: block;
          margin-bottom: 0.3rem;
          color: #b5e48c;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .landing-quickstart {
          display: grid;
          grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
          gap: 1.25rem;
          align-items: start;
          padding-bottom: 5rem;
        }

        .landing-shell pre {
          margin: 0;
          overflow-x: auto;
          border: 1px solid rgba(124, 180, 214, 0.18);
          border-radius: 0.55rem;
          background: #07111d;
        }

        .landing-shell code {
          display: block;
          padding: 1.1rem;
          color: #b9f7eb;
          font-family: var(--font-mono);
          font-size: 0.82rem;
          line-height: 1.8;
        }

        .landing-footer {
          border-top: 1px solid rgba(124, 180, 214, 0.18);
          color: #526275;
        }

        .landing-footer-inner {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          width: min(1180px, calc(100% - 2rem));
          margin: 0 auto;
          padding: 1.5rem 0;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        @media (max-width: 880px) {
          .landing-hero {
            min-height: 86vh;
          }

          .landing-nav {
            align-items: start;
          }

          .landing-nav-links {
            flex-direction: column;
            align-items: end;
            gap: 0.55rem;
          }

          .landing-hero-copy {
            min-height: calc(86vh - 5.2rem);
            padding: 3rem 0 5rem;
          }

          .landing-section-header,
          .landing-quickstart,
          .landing-media-band {
            display: grid;
            grid-template-columns: 1fr;
          }

          .landing-proof-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 560px) {
          .landing-nav,
          .landing-hero-copy,
          .landing-section,
          .landing-footer-inner {
            width: min(100% - 1.25rem, 1180px);
          }

          .landing-hero::before {
            background:
              linear-gradient(90deg, rgba(2, 8, 13, 0.96) 0%, rgba(2, 8, 13, 0.82) 100%),
              url(${heroImageUrl}) 60% 50% / cover no-repeat;
          }

          .landing-proof-grid {
            grid-template-columns: 1fr;
          }

          .landing-shell h1 {
            font-size: clamp(3.15rem, 16.5vw, 4.05rem);
            line-height: 0.92;
          }

          .landing-actions {
            flex-direction: column;
          }

          .landing-button {
            width: 100%;
          }

          .landing-demo-media {
            min-height: 16rem;
          }

          .landing-footer-inner {
            flex-direction: column;
          }
        }
      `}</style>

      <section className="landing-hero" aria-label="Phosphene landing hero">
        <nav className="landing-nav" aria-label="Primary navigation">
          <a className="landing-brand" href={appUrl}>
            <span className="landing-brand-mark" aria-hidden="true" />
            <span>Phosphene</span>
          </a>
          <div className="landing-nav-links">
            <a href="#proof">Proof</a>
            <a href="#boundary">Boundary</a>
            <a href="https://github.com/reyk-zepper/phosphene">GitHub</a>
          </div>
        </nav>

        <div className="landing-hero-copy">
          <p className="landing-eyebrow">Client-only reasoning and redacted AI-node trace explorer</p>
          <h1>Phosphene</h1>
          <p className="landing-tagline">See how AI thinks.</p>
          <p className="landing-summary">
            Explore model reasoning as navigable graphs, compare same-prompt runs, review
            patterns and annotations, and inspect redacted AI-node boundaries without
            exposing private payloads.
          </p>
          <div className="landing-actions" aria-label="Primary actions">
            <a className="landing-button landing-button-primary" href={appUrl}>
              Open the app
            </a>
            <a className="landing-button landing-button-secondary" href="https://github.com/reyk-zepper/phosphene">
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      <section id="proof" className="landing-section" aria-labelledby="proof-title">
        <div className="landing-section-header">
          <h2 id="proof-title">Built for inspection.</h2>
          <p className="landing-section-note">
            Phosphene is not a chat skin. It is a visual reasoning surface for traces,
            decisions, uncertainty, and review workflow.
          </p>
        </div>

        <div className="landing-proof-grid">
          <div className="landing-proof">
            <strong>Reasoning graphs</strong>
            <span>Typed nodes, curved edges, search, detail inspection, export, and keyboard navigation.</span>
          </div>
          <div className="landing-proof">
            <strong>Model comparison</strong>
            <span>Same-prompt demos and live comparison runs surface metric and confidence deltas.</span>
          </div>
          <div className="landing-proof">
            <strong>Review workflow</strong>
            <span>Stats, patterns, annotations, local Constitution checks, and session bundles stay client-side.</span>
          </div>
          <div className="landing-proof">
            <strong>AI-node boundaries</strong>
            <span>Node Observer reads redacted Boundary output, canary markers, and near-live adapter status.</span>
          </div>
        </div>
      </section>

      <section id="boundary" className="landing-section landing-media-band" aria-labelledby="boundary-title">
        <img
          className="landing-demo-media"
          src={demoMediaUrl}
          alt="Phosphene demo showing answer review, side-by-side comparison, and AI-node observability demo graphs."
        />

        <div className="landing-boundary">
          <div>
            <p className="landing-eyebrow">Operational boundary</p>
            <h2 id="boundary-title">Observe without leaking.</h2>
          </div>
          <div className="landing-boundary-item">
            <strong>No raw live telemetry claim</strong>
            Phosphene labels served AI-node status as redacted operational markers, not raw live agent telemetry.
          </div>
          <div className="landing-boundary-item">
            <strong>No private payload capture</strong>
            Boundary adapters must avoid prompts, logs, credentials, provider payloads, mailbox content, and host paths.
          </div>
          <div className="landing-boundary-item">
            <strong>Static by default</strong>
            The app can ship as a static build. API keys and custom profiles stay in the browser.
          </div>
        </div>
      </section>

      <section className="landing-section landing-quickstart" aria-labelledby="quickstart-title">
        <div>
          <p className="landing-eyebrow">Quick Start</p>
          <h2 id="quickstart-title">Run it locally.</h2>
          <p className="landing-section-note">
            No backend is required for demo graphs, local traces, history, annotations,
            exports, and redacted snapshot inspection.
          </p>
        </div>
        <pre><code>{`git clone https://github.com/reyk-zepper/phosphene.git
cd phosphene
pnpm install
pnpm dev`}</code></pre>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <span>Phosphene v0.1.42</span>
          <span>MIT licensed. Client-only by default.</span>
        </div>
      </footer>
    </main>
  );
}
