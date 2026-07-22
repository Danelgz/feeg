// Overlay de carga a pantalla completa para la sincronización con la nube (ver isSyncing en
// context/UserContext.js). Un único anillo con estela de degradado + constelación de partículas
// orbitando alrededor del logo + halo pulsante — sin anillo interior: con el logo real (lockup
// icono+wordmark, no un icono compacto) un segundo anillo pegado quedaba parcialmente tapado
// detrás en vez de leerse como un halo.
export default function LoadingOverlay({ label, sublabel }) {
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

        <img src="/logo.png" alt="FEEG" className="feeg-loading-logo" />
      </div>

      {label && (
        <div className="feeg-loading-text">
          <span className="feeg-loading-label">
            {label}
            <span className="feeg-loading-dots"><i /><i /><i /></span>
          </span>
          {sublabel && <span className="feeg-loading-sublabel">{sublabel}</span>}
        </div>
      )}

      <style jsx>{`
        .feeg-loading-overlay {
          position: fixed;
          inset: 0;
          background: rgba(6, 8, 8, 0.88);
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
          width: 380px;
          height: 380px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(46, 230, 197, 0.32) 0%, rgba(46, 230, 197, 0) 70%);
          filter: blur(4px);
          animation: feegGlowPulse 2.6s ease-in-out infinite;
          pointer-events: none;
        }

        .feeg-loading-orbit {
          position: relative;
          width: 260px;
          height: 260px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .feeg-loading-ring-outer {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          fill: none;
          animation: feegSpin 5.5s linear infinite;
        }

        .feeg-loading-track {
          stroke: rgba(255, 255, 255, 0.08);
          stroke-width: 2.5;
        }
        .feeg-loading-arc {
          stroke: url(#feegRingGradient);
          stroke-width: 2.5;
          stroke-linecap: round;
          stroke-dasharray: 78 186;
        }

        .feeg-loading-logo {
          position: relative;
          width: 148px;
          height: auto;
          animation:
            feegLogoPop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both,
            feegLogoBreathe 3.4s ease-in-out infinite 0.7s;
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
        .p1 { animation-duration: 4.5s; }
        .p1 .feeg-loading-particle { top: 10px; width: 7px; height: 7px; margin-left: -3.5px; animation-duration: 1.6s; }
        .p2 { animation-duration: 6.2s; animation-direction: reverse; }
        .p2 .feeg-loading-particle { top: 18px; width: 6px; height: 6px; margin-left: -3px; animation-duration: 1.9s; animation-delay: 0.3s; }
        .p3 { animation-duration: 7.6s; }
        .p3 .feeg-loading-particle { top: 2px; width: 5px; height: 5px; margin-left: -2.5px; animation-duration: 2.1s; animation-delay: 0.6s; }

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
        @keyframes feegLogoPop {
          0% { transform: scale(0.4) rotate(-8deg); opacity: 0; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes feegLogoBreathe {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 12px rgba(46, 230, 197, 0.4)); }
          50% { transform: scale(1.035); filter: drop-shadow(0 0 22px rgba(46, 230, 197, 0.6)); }
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
