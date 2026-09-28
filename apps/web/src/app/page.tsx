/**
 * Bolsilludo — Landing / Dashboard Entry Page
 * This is the I5 scaffold — a visual skeleton page to verify the stack is wired.
 * Full dashboard is implemented in I6.
 */
export default function HomePage() {
  return (
    <main
      id="main-content"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        gap: '2rem',
        background:
          'radial-gradient(ellipse at 30% 20%, rgba(22,183,140,0.12) 0%, transparent 60%), ' +
          'radial-gradient(ellipse at 80% 80%, rgba(11,32,70,0.8) 0%, transparent 60%), ' +
          'var(--bg)',
      }}
    >
      {/* Logo mark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <svg
          viewBox="0 0 260 322"
          width="64"
          height="79"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <linearGradient id="hb" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5AEFBD" />
              <stop offset="45%" stopColor="#16B78C" />
              <stop offset="100%" stopColor="#0B7A5A" />
            </linearGradient>
            <radialGradient id="hc" cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#FFE083" />
              <stop offset="70%" stopColor="#F4C13A" />
              <stop offset="100%" stopColor="#C08800" />
            </radialGradient>
            <clipPath id="hcc">
              <rect x="95" y="185" width="70" height="30" />
            </clipPath>
          </defs>
          <path
            d="M 30 20 L 30 302 L 155 302 C 210 302 240 272 240 232 C 240 206 226 185 205 175 C 226 163 238 142 238 116 C 238 72 210 20 155 20 Z M 85 75 L 150 75 C 185 75 185 158 150 158 L 85 158 Z M 85 210 L 155 210 C 195 210 195 300 155 300 L 85 300 Z"
            fill="url(#hb)"
          />
          <rect x="100" y="200" width="80" height="70" rx="8" fill="#0B3A2A" />
          <rect x="100" y="197" width="80" height="10" rx="4" fill="#0F5040" />
          <ellipse
            cx="140"
            cy="197"
            rx="28"
            ry="16"
            fill="url(#hc)"
            clipPath="url(#hcc)"
          />
        </svg>
        <h1
          className="font-display"
          style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            color: 'var(--text)',
            margin: 0,
          }}
        >
          Bolsilludo
        </h1>
      </div>

      {/* Tagline */}
      <p
        style={{
          fontSize: '1.125rem',
          color: 'var(--text-muted)',
          textAlign: 'center',
          maxWidth: '480px',
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        Tu sistema operativo de finanzas personales.
        <br />
        Presupuesto base-cero, multi-divisa, copiloto IA.
      </p>

      {/* Glass card — status */}
      <div
        className="glass"
        style={{
          padding: '1.5rem 2rem',
          borderRadius: 'var(--radius-xl)',
          maxWidth: '440px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <p
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            margin: 0,
          }}
        >
          Estado del Proyecto
        </p>
        <Stack label="Constitution" done />
        <Stack label="Domain + Invariants" done />
        <Stack label="Architecture + ADRs" done />
        <Stack label="Design System (Tokens + WCAG)" done />
        <Stack label="packages/money (CalcInput Parser)" done />
        <Stack label="packages/db (Drizzle Schema)" done />
        <Stack label="apps/web (Next.js PWA)" done />
        <Stack label="Budget Engine — I6" />
        <Stack label="Transaction Core — I7" />
      </div>

      {/* Iter badge */}
      <p
        style={{
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          opacity: 0.6,
        }}
      >
        Iteración I5 — Scaffold completado ✓
      </p>
    </main>
  );
}

/* Mini status row */
function Stack({ label, done = false }: { label: string; done?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        fontSize: '0.875rem',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: done ? 'var(--primary)' : 'var(--text-muted)',
          opacity: done ? 1 : 0.35,
          flexShrink: 0,
        }}
      />
      <span style={{ color: done ? 'var(--text)' : 'var(--text-muted)', opacity: done ? 1 : 0.55 }}>
        {label}
      </span>
    </div>
  );
}
