import Layout from '../components/Layout';
import MuscleChart from '../components/MuscleChart';

export default function Statistics() {
  return (
    <Layout>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Estadísticas de Entrenamiento</h1>
          <p style={styles.subtitle}>Distribución de músculos y seguimiento de ejercicios</p>
        </div>

        <div style={styles.content}>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Distribución de Músculos</h2>
            <p style={styles.description}>
              Selecciona un tipo de cuerpo y visualiza los diferentes grupos musculares. 
              Haz click en cada músculo para obtener más información.
            </p>
            <MuscleChart />
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Información de Uso</h2>
            <div style={styles.infoBox}>
              <h3 style={styles.infoTitle}>Tipos de Cuerpo Disponibles</h3>
              <ul style={styles.list}>
                <li><strong>Flaco:</strong> Tipo de cuerpo delgado con bajo porcentaje de grasa</li>
                <li><strong>Normal:</strong> Tipo de cuerpo atlético con musculatura moderada</li>
                <li><strong>Musculoso:</strong> Tipo de cuerpo con mayor masa muscular</li>
              </ul>
            </div>

            <div style={styles.infoBox}>
              <h3 style={styles.infoTitle}>Vistas Disponibles</h3>
              <ul style={styles.list}>
                <li><strong>Frontal:</strong> Vista anterior del cuerpo</li>
                <li><strong>Trasera:</strong> Vista posterior del cuerpo (espalda)</li>
              </ul>
            </div>

            <div style={styles.infoBox}>
              <h3 style={styles.infoTitle}>Grupos Musculares Principales</h3>
              <div style={styles.muscleGroups}>
                <div style={styles.muscleGroup}>
                  <span style={styles.muscleBadge}>Cabeza</span>
                  <span style={styles.muscleBadge}>Cuello</span>
                </div>
                <div style={styles.muscleGroup}>
                  <span style={styles.muscleBadge}>Pecho</span>
                  <span style={styles.muscleBadge}>Espalda</span>
                  <span style={styles.muscleBadge}>Core</span>
                </div>
                <div style={styles.muscleGroup}>
                  <span style={styles.muscleBadge}>Hombros</span>
                  <span style={styles.muscleBadge}>Brazos</span>
                  <span style={styles.muscleBadge}>Antebrazos</span>
                </div>
                <div style={styles.muscleGroup}>
                  <span style={styles.muscleBadge}>Glúteos</span>
                  <span style={styles.muscleBadge}>Piernas</span>
                  <span style={styles.muscleBadge}>Pantorrillas</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f0f2f5',
    minHeight: '100vh',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  title: {
    color: '#333',
    fontSize: '28px',
    margin: '0 0 10px 0',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#666',
    fontSize: '16px',
    margin: '0',
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '30px',
  },
  section: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  sectionTitle: {
    color: '#008CFF',
    fontSize: '20px',
    marginTop: '0',
    marginBottom: '15px',
    borderBottom: '2px solid #008CFF',
    paddingBottom: '10px',
  },
  description: {
    color: '#666',
    fontSize: '14px',
    marginBottom: '20px',
    lineHeight: '1.6',
  },
  infoBox: {
    backgroundColor: '#f9f9f9',
    padding: '15px',
    borderRadius: '5px',
    marginBottom: '15px',
    borderLeft: '4px solid #008CFF',
  },
  infoTitle: {
    color: '#333',
    fontSize: '16px',
    margin: '0 0 10px 0',
  },
  list: {
    color: '#666',
    fontSize: '14px',
    lineHeight: '1.8',
    margin: '0',
    paddingLeft: '20px',
  },
  muscleGroups: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  muscleGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  muscleBadge: {
    display: 'inline-block',
    backgroundColor: '#008CFF',
    color: '#fff',
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
};
