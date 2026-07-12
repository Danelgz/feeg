/** Estadística pequeña en grid, compartida por Overview/Mensual/Ejercicios. */
export default function MiniStat({ label, value, isDark }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '0.65rem', color: isDark ? '#666' : '#999', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '1rem', fontWeight: 'bold', color: isDark ? '#fff' : '#333' }}>{value}</div>
    </div>
  );
}
