export default function AchievementCard({ title, value, description, isDark }) {
  return (
    <div style={{
      backgroundColor: isDark ? '#0f0f0f' : '#f9f9f9',
      border: isDark ? '1px solid #2a2a2a' : '1px solid #eee',
      borderRadius: '12px',
      padding: '16px'
    }}>
      <div style={{ fontSize: '0.75rem', color: isDark ? '#888' : '#666', textTransform: 'uppercase', marginBottom: '2px' }}>{title}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: isDark ? '#fff' : '#333', marginBottom: '2px' }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: '#1dd1a1' }}>{description}</div>
    </div>
  );
}
