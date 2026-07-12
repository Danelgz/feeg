export default function EnhancedStatCard({ label, value, isDark }) {
  return (
    <div style={{
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`,
      borderRadius: '16px',
      padding: '20px',
      transition: 'all 0.3s ease'
    }}>
      <div style={{ fontSize: '0.75rem', color: isDark ? '#888' : '#666', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: isDark ? '#fff' : '#333' }}>{value}</div>
    </div>
  );
}
