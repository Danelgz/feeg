import React from 'react';
import Layout from '../components/Layout';
import MuscleDistributionChart from '../components/MuscleDistributionChart';

export default function Statistics() {
  const containerStyle = {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto'
  };

  const titleStyle = {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '20px',
    textAlign: 'center'
  };

  const descriptionStyle = {
    fontSize: '14px',
    color: '#666',
    marginBottom: '30px',
    textAlign: 'center',
    lineHeight: '1.6'
  };

  return (
    <Layout>
      <div style={containerStyle}>
        <h1 style={titleStyle}>Estadísticas de Entrenamiento</h1>
        <p style={descriptionStyle}>
          Visualiza la distribución de grupos musculares trabajados. 
          Selecciona el tipo de cuerpo para comparar diferentes análisis.
        </p>

        <MuscleDistributionChart />

        <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '10px' }}>
          <h3 style={{ color: '#333', marginBottom: '10px' }}>Sobre los tipos de cuerpo:</h3>
          <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.8' }}>
            <p><strong>Flaco:</strong> Bajo volumen muscular, bajo porcentaje de grasa corporal.</p>
            <p><strong>Atlético:</strong> Desarrollo muscular moderado, buena definición.</p>
            <p><strong>Musculoso:</strong> Alto volumen muscular, máximo desarrollo.</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
