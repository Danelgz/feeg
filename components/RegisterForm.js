import React, { useState } from 'react';
import NumberWheel from './NumberWheel';
import { useUser } from '../context/UserContext';

/**
 * `initialData`, `onCancel`, `title` y `submitLabel` existen por un único caso de uso: repetir esta
 * misma entrevista más tarde desde Ajustes ("por si te has confundido en algo"), sin perder lo que
 * ya se había respondido ni bloquear la app entera como hace la primera vez (esa SÍ es obligatoria,
 * por eso no lleva cancelar). Sin `initialData` y `onCancel` el componente se comporta exactamente
 * como antes: alta obligatoria de un perfil nuevo.
 */
export default function RegisterForm({ onRegister, onCancel, initialData, title = 'Completa tu Perfil', submitLabel = 'Completar Registro' }) {
  const [step, setStep] = useState(1);
  const { theme } = useUser();
  const isDark = theme === 'dark';
  const [formData, setFormData] = useState({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    username: initialData?.username || '',
    weightValue: initialData?.weightValue ?? 70,
    weightUnit: initialData?.weightUnit || 'kg',
    heightValue: initialData?.heightValue ?? 170,
    heightUnit: initialData?.heightUnit || 'cm',
    goal: initialData?.goal || ''
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleWeightUnitChange = (unit) => {
    setFormData(prev => ({
      ...prev,
      weightUnit: unit
    }));
  };

  const handleHeightUnitChange = (unit) => {
    setFormData(prev => ({
      ...prev,
      heightUnit: unit
    }));
  };

  const handleSubmit = () => {
    if (formData.firstName && formData.lastName && formData.username && formData.goal) {
      onRegister({
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
        weight: formData.weightValue,
        weightUnit: formData.weightUnit,
        height: formData.heightValue,
        heightUnit: formData.heightUnit,
        goal: formData.goal,
        registeredAt: new Date().toISOString()
      });
    }
  };

  const isStepValid = () => {
    if (step === 1) return formData.firstName && formData.lastName && formData.username;
    if (step === 2) return true;
    if (step === 3) return formData.goal;
    return false;
  };

  return (
    <div style={{
      backgroundColor: isDark ? "#1a1a1a" : "#fff",
      padding: "40px",
      borderRadius: "12px",
      boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.3)" : "0 4px 12px rgba(0,0,0,0.1)",
      border: `1px solid ${isDark ? "#333" : "#ddd"}`,
      maxWidth: "500px",
      margin: "0 auto"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", marginBottom: "30px" }}>
        <h2 style={{ color: isDark ? "#fff" : "#333", textAlign: "center", fontSize: "1.8rem", margin: 0 }}>
          {title}
        </h2>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancelar"
            style={{
              position: "absolute",
              right: 0,
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              border: "none",
              backgroundColor: isDark ? "#2a2a2a" : "#eee",
              color: isDark ? "#fff" : "#333",
              cursor: "pointer",
              fontSize: "1.1rem",
              lineHeight: "32px",
              padding: 0,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Step 1: Nombre y Apellidos */}
      {step === 1 && (
        <div>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ 
              color: isDark ? "#fff" : "#333", 
              display: "block", 
              marginBottom: "8px",
              fontWeight: "600"
            }}>
              Nombre
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: isDark ? "#0f0f0f" : "#f9f9f9",
                border: `1px solid ${isDark ? "#2a2a2a" : "#ddd"}`,
                borderRadius: "8px",
                color: isDark ? "#fff" : "#333",
                fontSize: "1rem",
                boxSizing: "border-box"
              }}
              placeholder="Tu nombre"
            />
          </div>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ 
              color: isDark ? "#fff" : "#333", 
              display: "block", 
              marginBottom: "8px",
              fontWeight: "600"
            }}>
              Apellidos
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: isDark ? "#0f0f0f" : "#f9f9f9",
                border: `1px solid ${isDark ? "#2a2a2a" : "#ddd"}`,
                borderRadius: "8px",
                color: isDark ? "#fff" : "#333",
                fontSize: "1rem",
                boxSizing: "border-box"
              }}
              placeholder="Tus apellidos"
            />
          </div>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ 
              color: isDark ? "#fff" : "#333", 
              display: "block", 
              marginBottom: "8px",
              fontWeight: "600"
            }}>
              Nombre de Usuario
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: isDark ? "#0f0f0f" : "#f9f9f9",
                border: `1px solid ${isDark ? "#2a2a2a" : "#ddd"}`,
                borderRadius: "8px",
                color: isDark ? "#fff" : "#333",
                fontSize: "1rem",
                boxSizing: "border-box"
              }}
              placeholder="Tu nombre de usuario"
            />
          </div>
        </div>
      )}

      {/* Step 2: Peso y Altura */}
      {step === 2 && (
        <div>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ 
              color: isDark ? "#fff" : "#333", 
              display: "block", 
              marginBottom: "12px",
              fontWeight: "600",
              fontSize: "0.9rem"
            }}>
              Peso ({formData.weightUnit})
            </label>
            <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
              <button
                onClick={() => handleWeightUnitChange('kg')}
                style={{
                  flex: 1,
                  padding: "8px",
                  backgroundColor: formData.weightUnit === 'kg' ? "#1dd1a1" : (isDark ? "#2a2a2a" : "#eee"),
                  color: formData.weightUnit === 'kg' ? "#fff" : (isDark ? "#fff" : "#333"),
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                  transition: "all 0.3s ease"
                }}
              >
                kg
              </button>
              <button
                onClick={() => handleWeightUnitChange('lb')}
                style={{
                  flex: 1,
                  padding: "8px",
                  backgroundColor: formData.weightUnit === 'lb' ? "#1dd1a1" : (isDark ? "#2a2a2a" : "#eee"),
                  color: formData.weightUnit === 'lb' ? "#fff" : (isDark ? "#fff" : "#333"),
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                  transition: "all 0.3s ease"
                }}
              >
                lb
              </button>
            </div>
            <NumberWheel
              value={formData.weightValue}
              onChange={(val) => handleInputChange('weightValue', val)}
              min={formData.weightUnit === 'kg' ? 30 : 66}
              max={formData.weightUnit === 'kg' ? 200 : 440}
              label="weight"
              step={1}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ 
              color: isDark ? "#fff" : "#333", 
              display: "block", 
              marginBottom: "12px",
              fontWeight: "600",
              fontSize: "0.9rem"
            }}>
              Altura ({formData.heightUnit})
            </label>
            <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
              <button
                onClick={() => handleHeightUnitChange('cm')}
                style={{
                  flex: 1,
                  padding: "8px",
                  backgroundColor: formData.heightUnit === 'cm' ? "#1dd1a1" : (isDark ? "#2a2a2a" : "#eee"),
                  color: formData.heightUnit === 'cm' ? "#fff" : (isDark ? "#fff" : "#333"),
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                  transition: "all 0.3s ease"
                }}
              >
                cm
              </button>
              <button
                onClick={() => handleHeightUnitChange('ft')}
                style={{
                  flex: 1,
                  padding: "8px",
                  backgroundColor: formData.heightUnit === 'ft' ? "#1dd1a1" : (isDark ? "#2a2a2a" : "#eee"),
                  color: formData.heightUnit === 'ft' ? "#fff" : (isDark ? "#fff" : "#333"),
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                  transition: "all 0.3s ease"
                }}
              >
                ft
              </button>
            </div>
            <NumberWheel
              value={formData.heightValue}
              onChange={(val) => handleInputChange('heightValue', val)}
              min={formData.heightUnit === 'cm' ? 140 : 4.6}
              max={formData.heightUnit === 'cm' ? 220 : 7.2}
              label="height"
              step={formData.heightUnit === 'cm' ? 1 : 0.1}
            />
          </div>
        </div>
      )}

      {/* Step 3: Objetivo */}
      {step === 3 && (
        <div>
          <label style={{ 
            color: isDark ? "#fff" : "#333", 
            display: "block", 
            marginBottom: "12px",
            fontWeight: "600"
          }}>
            ¿Cuál es tu objetivo?
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {['Ganar masa muscular', 'Perder peso', 'Mejorar resistencia', 'Mantenimiento', 'Ganar fuerza'].map((goal) => (
              <button
                key={goal}
                onClick={() => handleInputChange('goal', goal)}
                style={{
                  padding: "12px",
                  backgroundColor: formData.goal === goal ? "#1dd1a1" : (isDark ? "#0f0f0f" : "#f9f9f9"),
                  color: formData.goal === goal ? "#000" : (isDark ? "#fff" : "#333"),
                  border: formData.goal === goal ? "2px solid #1dd1a1" : `1px solid ${isDark ? "#2a2a2a" : "#ddd"}`,
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  transition: "all 0.3s ease",
                  fontSize: "1rem"
                }}
              >
                {goal}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Progress indicator */}
      <div style={{
        display: "flex",
        gap: "5px",
        justifyContent: "center",
        margin: "20px 0 30px 0"
      }}>
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: s <= step ? "#1dd1a1" : (isDark ? "#2a2a2a" : "#ddd"),
              transition: "all 0.3s ease"
            }}
          />
        ))}
      </div>

      {/* Botones */}
      <div style={{ display: "flex", gap: "10px" }}>
        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor: isDark ? "#2a2a2a" : "#eee",
              color: isDark ? "#fff" : "#333",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              transition: "all 0.3s ease"
            }}
          >
            Atrás
          </button>
        )}
        {step < 3 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!isStepValid()}
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor: isStepValid() ? "#1dd1a1" : (isDark ? "#2a2a2a" : "#eee"),
              color: isStepValid() ? "#000" : "#888",
              border: "none",
              borderRadius: "8px",
              cursor: isStepValid() ? "pointer" : "not-allowed",
              fontWeight: "600",
              transition: "all 0.3s ease"
            }}
          >
            Siguiente
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!isStepValid()}
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor: isStepValid() ? "#1dd1a1" : (isDark ? "#2a2a2a" : "#eee"),
              color: isStepValid() ? "#000" : "#888",
              border: "none",
              borderRadius: "8px",
              cursor: isStepValid() ? "pointer" : "not-allowed",
              fontWeight: "600",
              transition: "all 0.3s ease"
            }}
          >
            {submitLabel}
          </button>
        )}
      </div>
    </div>
  );
}
