import MiniStat from "./MiniStat";

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatMonth(monthStr) {
  const [year, month] = monthStr.split('-');
  return `${MONTH_NAMES[parseInt(month) - 1]} ${year}`;
}

export default function MonthlyReportSection({ isDark, workouts, t }) {
  const byMonth = {};
  workouts.forEach(w => {
    if (!w.completedAt) return;
    const d = new Date(w.completedAt);
    const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    if (!byMonth[key]) byMonth[key] = { sessions: 0, series: 0, reps: 0, volume: 0, timeMin: 0 };
    byMonth[key].sessions += 1;
    byMonth[key].series += Number(w.series || 0);
    byMonth[key].reps += Number(w.totalReps || 0);
    byMonth[key].volume += Number(w.totalVolume || 0);
    byMonth[key].timeMin += w.elapsedTime !== undefined ? Math.round((Number(w.elapsedTime || 0)) / 60) : Number(w.totalTime || 0);
  });
  const entries = Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <section style={{
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      border: isDark ? '1px solid #333' : '1px solid #e0e0e0',
      borderRadius: '16px',
      padding: '24px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: isDark ? '#fff' : '#333', fontSize: '1.3rem', fontWeight: 'bold' }}>Informe Mensual</h2>
        <span style={{ fontSize: '0.85rem', color: '#1dd1a1', fontWeight: '600' }}>{entries.length} meses</span>
      </div>
      {entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📊</div>
          <p style={{ color: isDark ? '#aaa' : '#666', fontSize: '1rem' }}>{t('stats_no_data')}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {entries.map(([month, v], index) => (
            <div key={month} style={{
              background: isDark ? '#0f0f0f' : '#f9f9f9',
              border: isDark ? '1px solid #2a2a2a' : '1px solid #eee',
              borderRadius: 12,
              padding: 16,
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#1dd1a1';
              e.currentTarget.style.transform = 'translateX(4px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = isDark ? '#2a2a2a' : '#eee';
              e.currentTarget.style.transform = 'translateX(0)';
            }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(29, 209, 161, 0.1)',
                    color: '#1dd1a1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                  }}>
                    {index + 1}
                  </div>
                  <strong style={{ color: isDark ? '#fff' : '#333', fontSize: '1.1rem' }}>{formatMonth(month)}</strong>
                </div>
                <span style={{ fontSize: '0.85rem', color: '#1dd1a1', fontWeight: '600' }}>{v.sessions} entrenamientos</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                <MiniStat label="Entrenos" value={v.sessions} isDark={isDark} />
                <MiniStat label="Series" value={v.series} isDark={isDark} />
                <MiniStat label="Reps" value={v.reps} isDark={isDark} />
                <MiniStat label="Volumen" value={v.volume.toLocaleString()} isDark={isDark} />
                <MiniStat label="Tiempo" value={v.timeMin} isDark={isDark} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
