// Overlay de carga a pantalla completa (sincronización con la nube, importaciones largas...).
// Reemplaza el spinner simple + texto plano que había antes: doble anillo con estela de
// degradado + constelación de partículas orbitando + halo pulsante + texto con shimmer. Siempre
// sobre fondo oscuro independientemente del tema — es chrome flotante, no una pantalla del tema.
export default function LoadingOverlay({ label = "Cargando", sublabel }) {
  return (
    <div className="feeg-loading-overlay">
      <div className="feeg-loading-glow" />

      <div className="feeg-loading-orbit">
        <span className="feeg-loading-particle-wrap p1"><span className="feeg-loading-particle" /></span>
        <span className="feeg-loading-particle-wrap p2"><span className="feeg-loading-particle" /></span>
        <span className="feeg-loading-particle-wrap p3"><span className="feeg-loading-particle" /></span>

        <svg className="feeg-loading-ring-outer" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="feegRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2EE6C5" stopOpacity="0" />
              <stop offset="55%" stopColor="#2EE6C5" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#9CFFEC" stopOpacity="1" />
            </linearGradient>
          </defs>
          <circle className="feeg-loading-track" cx="50" cy="50" r="42" />
          <circle className="feeg-loading-arc" cx="50" cy="50" r="42" />
        </svg>

        <svg className="feeg-loading-ring-inner" viewBox="0 0 100 100">
          <circle className="feeg-loading-arc-inner" cx="50" cy="50" r="27" />
        </svg>

        <span className="feeg-loading-core" />
      </div>

      <div className="feeg-loading-text">
        <span className="feeg-loading-label">
          {label}
          <span className="feeg-loading-dots"><i /><i /><i /></span>
        </span>
        {sublabel && <span className="feeg-loading-sublabel">{sublabel}</span>}
      </div>

      <style jsx>{`
        .feeg-loading-overlay {
          position: fixed;
          inset: 0;
          background: rgba(6, 8, 8, 0.82);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 26px;
          z-index: 15000;
          animation: feegFadeIn 0.35s ease both;
        }

        .feeg-loading-glow {
          position: absolute;
          width: 260px;
          height: 260px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(46, 230, 197, 0.32) 0%, rgba(46, 230, 197, 0) 70%);
          filter: blur(4px);
          animation: feegGlowPulse 2.6s ease-in-out infinite;
          pointer-events: none;
        }

        .feeg-loading-orbit {
          position: relative;
          width: 92px;
          height: 92px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .feeg-loading-ring-outer,
        .feeg-loading-ring-inner {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          fill: none;
        }
        .feeg-loading-ring-outer {
          animation: feegSpin 1.7s linear infinite;
        }
        .feeg-loading-ring-inner {
          inset: 20px;
          width: calc(100% - 40px);
          height: calc(100% - 40px);
          animation: feegSpinReverse 1.05s linear infinite;
        }

        .feeg-loading-track {
          stroke: rgba(255, 255, 255, 0.08);
          stroke-width: 5;
        }
        .feeg-loading-arc {
          stroke: url(#feegRingGradient);
          stroke-width: 5;
          stroke-linecap: round;
          stroke-dasharray: 78 186;
        }
        .feeg-loading-arc-inner {
          stroke: #2ee6c5;
          opacity: 0.55;
          stroke-width: 4;
          stroke-linecap: round;
          stroke-dasharray: 34 136;
        }

        .feeg-loading-core {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #2ee6c5;
          box-shadow: 0 0 14px 3px rgba(46, 230, 197, 0.65);
          animation: feegCorePulse 1.7s ease-in-out infinite;
        }

        .feeg-loading-particle-wrap {
          position: absolute;
          inset: 0;
          animation: feegSpin linear infinite;
        }
        .feeg-loading-particle {
          position: absolute;
          left: 50%;
          border-radius: 50%;
          background: #7cffe8;
          box-shadow: 0 0 6px rgba(124, 255, 232, 0.85);
          animation: feegParticlePulse ease-in-out infinite;
        }
        .p1 { animation-duration: 2.4s; }
        .p1 .feeg-loading-particle { top: 2px; width: 5px; height: 5px; margin-left: -2.5px; animation-duration: 1.2s; }
        .p2 { animation-duration: 3.1s; animation-direction: reverse; }
        .p2 .feeg-loading-particle { top: 8px; width: 4px; height: 4px; margin-left: -2px; animation-duration: 1.4s; animation-delay: 0.3s; }
        .p3 { animation-duration: 3.8s; }
        .p3 .feeg-loading-particle { top: -4px; width: 3.5px; height: 3.5px; margin-left: -1.75px; animation-duration: 1.6s; animation-delay: 0.6s; }

        .feeg-loading-text {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .feeg-loading-label {
          display: inline-flex;
          align-items: center;
          font-size: 1.05rem;
          font-weight: 700;
          letter-spacing: 0.01em;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.5) 0%, #ffffff 50%, rgba(255, 255, 255, 0.5) 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: feegShimmer 2.2s ease-in-out infinite;
        }
        .feeg-loading-dots {
          display: inline-flex;
          gap: 3px;
          margin-left: 5px;
        }
        .feeg-loading-dots i {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #2ee6c5;
          display: inline-block;
          animation: feegDotBounce 1.2s ease-in-out infinite;
        }
        .feeg-loading-dots i:nth-child(2) { animation-delay: 0.15s; }
        .feeg-loading-dots i:nth-child(3) { animation-delay: 0.3s; }

        .feeg-loading-sublabel {
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.8rem;
        }

        @keyframes feegFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes feegGlowPulse {
          0%, 100% { transform: scale(0.9); opacity: 0.7; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes feegSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes feegSpinReverse {
          to { transform: rotate(-360deg); }
        }
        @keyframes feegCorePulse {
          0%, 100% { transform: scale(0.85); opacity: 0.75; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes feegParticlePulse {
          0%, 100% { opacity: 0.25; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes feegShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes feegDotBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .feeg-loading-overlay *,
          .feeg-loading-overlay {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}
