import React from 'react';
import { useUser } from '../context/UserContext';

const ExerciseInstructionsModal = ({ exercise, onClose }) => {
  const { theme, isMobile, t } = useUser();
  const isDark = theme === 'dark';

  if (!exercise) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: isDark ? '#1a1a1a' : '#fff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        border: `1px solid ${isDark ? '#333' : '#eee'}`
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: `1px solid ${isDark ? '#333' : '#eee'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          backgroundColor: isDark ? '#1a1a1a' : '#fff',
          zIndex: 1
        }}>
          <h3 style={{ margin: 0, color: '#1dd1a1', fontSize: '1.2rem' }}>{t(exercise.name) || exercise.name}</h3>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            color: isDark ? '#fff' : '#333',
            fontSize: '1.5rem',
            cursor: 'pointer',
            padding: '5px'
          }}>×</button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#1dd1a1', marginBottom: '8px', fontSize: '1rem' }}>{t("instructions") || "Indicaciones"}</h4>
            <p style={{ 
              color: isDark ? '#ccc' : '#666', 
              fontSize: '0.95rem', 
              lineHeight: '1.6',
              margin: 0 
            }}>
              {exercise.instructions || (t("no_instructions_available") || "No hay indicaciones disponibles para este ejercicio.")}
            </p>
          </div>

          <div>
            <h4 style={{ color: '#1dd1a1', marginBottom: '8px', fontSize: '1rem' }}>{t("muscles_worked") || "Músculos trabajados"}</h4>
            <p style={{ 
              color: isDark ? '#ccc' : '#666', 
              fontSize: '0.95rem', 
              lineHeight: '1.6',
              margin: 0,
              fontStyle: 'italic'
            }}>
              {exercise.muscles || (t("not_specified") || "No especificado")}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '15px 20px',
          borderTop: `1px solid ${isDark ? '#333' : '#eee'}`,
          textAlign: 'right'
        }}>
          <button 
            onClick={onClose}
            style={{
              padding: '8px 20px',
              backgroundColor: '#1dd1a1',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            {t("close") || "Cerrar"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExerciseInstructionsModal;
