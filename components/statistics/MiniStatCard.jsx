export default function MiniStatCard({ label, value, isDark }) {
  return (
    <div style={{
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`,
      borderRadius: '12px',
      padding: '16px'
    }}>
      <div style={{ fontSize: '0.7rem', color: isDark ? '#888' : '#666', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: isDark ? '#fff' : '#333' }}>{value}</div>
    </div>
  );
}
