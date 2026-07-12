import { useState } from "react";

export default function SeriesByGroupSection({ isDark, seriesByGroup, t }) {
  const entries = Object.entries(seriesByGroup).sort((a, b) => b[1] - a[1]);
  const maxVal = entries[0]?.[1] || 1;
  const [tooltip, setTooltip] = useState(null);

  return (
    <section style={{
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      border: isDark ? '1px solid #333' : '1px solid #e0e0e0',
      borderRadius: '16px',
      padding: '24px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: isDark ? '#fff' : '#333', fontSize: '1.3rem', fontWeight: 'bold' }}>Series por Grupo Muscular</h2>
        <span style={{ fontSize: '0.85rem', color: '#1dd1a1', fontWeight: '600' }}>{entries.filter(([_, n]) => n > 0).length} grupos activos</span>
      </div>
      {entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📊</div>
          <p style={{ color: isDark ? '#aaa' : '#666', fontSize: '1rem' }}>{t('stats_no_data')}</p>
        </div>
      ) : (
        <div>
          {entries.map(([g, n]) => (
            <div key={g} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: '120px', color: isDark ? '#ddd' : '#444', fontSize: '0.9rem', fontWeight: '500' }}>{t(g) || g}</div>
              <div
                style={{ flex: 1, height: '20px', background: isDark ? '#0f0f0f' : '#eee', borderRadius: '999px', overflow: 'visible', position: 'relative', cursor: 'pointer' }}
                onMouseEnter={(e) => setTooltip({ g, n, x: e.clientX, y: e.clientY })}
                onMouseMove={(e) => setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : prev)}
                onMouseLeave={() => setTooltip(null)}
                onTouchStart={(e) => { const t2 = e.touches[0]; setTooltip({ g, n, x: t2.clientX, y: t2.clientY }); }}
                onTouchEnd={() => setTimeout(() => setTooltip(null), 900)}
              >
                <div style={{
                  width: `${n === 0 ? 2 : Math.min(100, (n / maxVal) * 100)}%`,
                  height: '100%',
                  background: n > 0 ? 'linear-gradient(90deg, #1dd1a1, #19b088)' : (isDark ? '#333' : '#ddd'),
                  borderRadius: '999px',
                  transition: 'width 0.4s ease'
                }} />
              </div>
              <div style={{ width: '50px', textAlign: 'right', color: isDark ? '#fff' : '#333', fontWeight: 'bold', fontSize: '0.95rem' }}>{n}</div>
            </div>
          ))}

          {tooltip && (
            <div style={{
              position: 'fixed',
              left: tooltip.x + 12,
              top: tooltip.y - 36,
              backgroundColor: isDark ? '#1a1a1a' : '#333',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontWeight: '600',
              pointerEvents: 'none',
              zIndex: 9999,
              border: '1px solid #1dd1a1',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
              {t(tooltip.g) || tooltip.g}: <span style={{ color: '#1dd1a1' }}>{tooltip.n} series</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
