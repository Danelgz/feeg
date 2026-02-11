import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { useRouter } from "next/router";

const MeasurementField = ({ label, value, name, unit, onChange }) => (
  <div style={{ marginBottom: "15px" }}>
    <label style={{ display: "block", color: "#888", fontSize: "0.85rem", marginBottom: "5px" }}>{label} ({unit})</label>
    <input
      type="number"
      step="0.1"
      value={value}
      onChange={(e) => onChange(name, e.target.value)}
      style={{
        width: "100%",
        padding: "12px",
        backgroundColor: "#1a1a1a",
        border: "1px solid #333",
        borderRadius: "10px",
        color: "#fff",
        fontSize: "1rem"
      }}
      placeholder="0.0"
    />
  </div>
);

const StatCard = ({ label, value, unit, icon }) => (
  <div style={{
    backgroundColor: "#1a1a1a",
    padding: "15px",
    borderRadius: "15px",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    border: "1px solid #222"
  }}>
    <div style={{ color: "#888", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "5px" }}>
      {icon}
      {label}
    </div>
    <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#1dd1a1" }}>
      {value || "--"} <span style={{ fontSize: "0.8rem", color: "#555" }}>{unit}</span>
    </div>
  </div>
);

export default function Measures() {
  const router = useRouter();
  const { 
    user, 
    saveUser,
    measures, 
    saveMeasures, 
    isLoaded, 
    isMobile
  } = useUser();
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [units, setUnits] = useState({
    weight: 'kg',
    length: 'cm'
  });

  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: "",
    height: "",
    bodyFat: "",
    neck: "",
    shoulders: "",
    chest: "",
    waist: "",
    hips: "",
    bicepsL: "",
    bicepsR: "",
    forearmL: "",
    forearmR: "",
    thighL: "",
    thighR: "",
    calfL: "",
    calfR: ""
  });

  useEffect(() => {
    if (user) {
      setUnits({
        weight: user.weightUnit || 'kg',
        length: user.heightUnit || 'cm'
      });
    }
  }, [user]);

  if (!isLoaded) return <Layout><div style={{ padding: "20px", color: "#fff" }}>Cargando...</div></Layout>;

  const updateUnits = async (type, val) => {
    const newUnits = { ...units, [type]: val };
    setUnits(newUnits);
    if (user) {
      await saveUser({
        ...user,
        weightUnit: newUnits.weight,
        heightUnit: newUnits.length
      });
    }
  };

  const handleFieldChange = (name, value) => {
    setNewEntry(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const entry = {
      ...newEntry,
      id: Date.now(),
      timestamp: new Date(newEntry.date).getTime()
    };
    
    const updatedMeasures = [entry, ...measures].sort((a, b) => b.timestamp - a.timestamp);
    await saveMeasures(updatedMeasures);
    setShowAddForm(false);
    // Reset form
    setNewEntry({
      date: new Date().toISOString().split('T')[0],
      weight: "",
      height: "",
      bodyFat: "",
      neck: "",
      shoulders: "",
      chest: "",
      waist: "",
      hips: "",
      bicepsL: "",
      bicepsR: "",
      forearmL: "",
      forearmR: "",
      thighL: "",
      thighR: "",
      calfL: "",
      calfR: ""
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que quieres borrar esta medida?")) {
      const updatedMeasures = measures.filter(m => m.id !== id);
      await saveMeasures(updatedMeasures);
    }
  };

  const latest = measures[0] || {};

  return (
    <Layout>
      <div style={{
        backgroundColor: "#000",
        color: "#fff",
        minHeight: "100vh",
        padding: isMobile ? "20px 15px 100px 15px" : "30px",
        fontFamily: "Arial, sans-serif"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: "bold", margin: 0, color: "#1dd1a1" }}>Medidas</h1>
            <p style={{ color: "#666", margin: "5px 0 0 0" }}>Seguimiento de progreso corporal</p>
          </div>
          <button 
            onClick={() => router.back()}
            style={{
              background: "#1a1a1a",
              border: "none",
              color: "#fff",
              padding: "10px",
              borderRadius: "50%",
              cursor: "pointer"
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
        </div>

        {/* Units Toggles */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "30px" }}>
          <div style={{ flex: 1, backgroundColor: "#1a1a1a", padding: "5px", borderRadius: "10px", display: "flex" }}>
            {['kg', 'lb'].map(u => (
              <button
                key={u}
                onClick={() => updateUnits('weight', u)}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: units.weight === u ? "#1dd1a1" : "transparent",
                  color: units.weight === u ? "#000" : "#888",
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: "0.8rem"
                }}
              >{u.toUpperCase()}</button>
            ))}
          </div>
          <div style={{ flex: 1, backgroundColor: "#1a1a1a", padding: "5px", borderRadius: "10px", display: "flex" }}>
            {['cm', 'in'].map(u => (
              <button
                key={u}
                onClick={() => updateUnits('length', u)}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: units.length === u ? "#1dd1a1" : "transparent",
                  color: units.length === u ? "#000" : "#888",
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: "0.8rem"
                }}
              >{u.toUpperCase()}</button>
            ))}
          </div>
        </div>

        {/* Main Stats Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "30px" }}>
          <StatCard label="Peso" value={latest.weight} unit={units.weight} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L3.41 13.41a2 2 0 0 1 0-2.83l7.17-7.17a2 2 0 0 1 2.83 0l7.17 7.17a2 2 0 0 1 0 2.83z"/></svg>} />
          <StatCard label="Grasa Corporal" value={latest.bodyFat} unit="%" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>} />
          <StatCard label="Cintura" value={latest.waist} unit={units.length} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>} />
          <StatCard label="Bíceps (R)" value={latest.bicepsR} unit={units.length} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18h12M6 6h12M6 12h12"/></svg>} />
        </div>

        {/* History / List */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: "bold", margin: 0 }}>Historial</h2>
          <button 
            onClick={() => setShowAddForm(true)}
            style={{
              backgroundColor: "#1dd1a1",
              color: "#000",
              border: "none",
              padding: "8px 16px",
              borderRadius: "20px",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "0.9rem"
            }}
          >
            Añadir Medida
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {measures.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", backgroundColor: "#1a1a1a", borderRadius: "15px", color: "#666" }}>
              No hay medidas registradas.
            </div>
          ) : (
            measures.map(m => (
              <div key={m.id} style={{ backgroundColor: "#1a1a1a", padding: "15px", borderRadius: "15px", border: "1px solid #222" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div style={{ fontWeight: "bold", color: "#1dd1a1" }}>{new Date(m.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  <button onClick={() => handleDelete(m.id)} style={{ background: "none", border: "none", color: "#ff4757", cursor: "pointer" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", fontSize: "0.85rem", color: "#ccc" }}>
                  {m.weight && <div>Peso: <span style={{ color: "#fff" }}>{m.weight}{units.weight}</span></div>}
                  {m.bodyFat && <div>Grasa: <span style={{ color: "#fff" }}>{m.bodyFat}%</span></div>}
                  {m.waist && <div>Cintura: <span style={{ color: "#fff" }}>{m.waist}{units.length}</span></div>}
                  {m.chest && <div>Pecho: <span style={{ color: "#fff" }}>{m.chest}{units.length}</span></div>}
                  {m.bicepsR && <div>Bíceps D: <span style={{ color: "#fff" }}>{m.bicepsR}{units.length}</span></div>}
                  {m.bicepsL && <div>Bíceps I: <span style={{ color: "#fff" }}>{m.bicepsL}{units.length}</span></div>}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Modal */}
        {showAddForm && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.9)", zIndex: 2000,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px"
          }}>
            <div style={{
              backgroundColor: "#111",
              width: "100%",
              maxWidth: "500px",
              maxHeight: "90vh",
              borderRadius: "20px",
              overflowY: "auto",
              padding: "25px",
              border: "1px solid #333"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ margin: 0, color: "#1dd1a1" }}>Nueva Medida</h2>
                <button onClick={() => setShowAddForm(false)} style={{ background: "none", border: "none", color: "#fff", fontSize: "1.5rem", cursor: "pointer" }}>&times;</button>
              </div>

              <form onSubmit={handleSave}>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", color: "#888", fontSize: "0.85rem", marginBottom: "5px" }}>Fecha</label>
                  <input
                    type="date"
                    value={newEntry.date}
                    onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px",
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #333",
                      borderRadius: "10px",
                      color: "#fff"
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                  <MeasurementField label="Peso" value={newEntry.weight} name="weight" unit={units.weight} onChange={handleFieldChange} />
                  <MeasurementField label="Grasa %" value={newEntry.bodyFat} name="bodyFat" unit="%" onChange={handleFieldChange} />
                  <MeasurementField label="Altura" value={newEntry.height} name="height" unit={units.length} onChange={handleFieldChange} />
                  <MeasurementField label="Cintura" value={newEntry.waist} name="waist" unit={units.length} onChange={handleFieldChange} />
                  <MeasurementField label="Cuello" value={newEntry.neck} name="neck" unit={units.length} onChange={handleFieldChange} />
                  <MeasurementField label="Hombros" value={newEntry.shoulders} name="shoulders" unit={units.length} onChange={handleFieldChange} />
                  <MeasurementField label="Pecho" value={newEntry.chest} name="chest" unit={units.length} onChange={handleFieldChange} />
                  <MeasurementField label="Cadera" value={newEntry.hips} name="hips" unit={units.length} onChange={handleFieldChange} />
                  <MeasurementField label="Bíceps D" value={newEntry.bicepsR} name="bicepsR" unit={units.length} onChange={handleFieldChange} />
                  <MeasurementField label="Bíceps I" value={newEntry.bicepsL} name="bicepsL" unit={units.length} onChange={handleFieldChange} />
                  <MeasurementField label="Antebrazo D" value={newEntry.forearmR} name="forearmR" unit={units.length} onChange={handleFieldChange} />
                  <MeasurementField label="Antebrazo I" value={newEntry.forearmL} name="forearmL" unit={units.length} onChange={handleFieldChange} />
                  <MeasurementField label="Muslo D" value={newEntry.thighR} name="thighR" unit={units.length} onChange={handleFieldChange} />
                  <MeasurementField label="Muslo I" value={newEntry.thighL} name="thighL" unit={units.length} onChange={handleFieldChange} />
                  <MeasurementField label="Gemelo D" value={newEntry.calfR} name="calfR" unit={units.length} onChange={handleFieldChange} />
                  <MeasurementField label="Gemelo I" value={newEntry.calfL} name="calfL" unit={units.length} onChange={handleFieldChange} />
                </div>

                <button
                  type="submit"
                  style={{
                    width: "100%",
                    padding: "15px",
                    backgroundColor: "#1dd1a1",
                    color: "#000",
                    border: "none",
                    borderRadius: "12px",
                    fontWeight: "bold",
                    fontSize: "1rem",
                    marginTop: "20px",
                    cursor: "pointer"
                  }}
                >
                  Guardar Medida
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
