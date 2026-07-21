import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { getTokens } from "../lib/tokens";
import { Icon, Button, Spinner, EmptyState, PageHeader, ConfirmModal } from "../components/ui";

const MeasurementField = ({ label, value, name, unit, onChange, tk }) => (
  <div style={{ marginBottom: "15px" }}>
    <label style={{ display: "block", color: tk.textMuted, fontSize: "0.85rem", marginBottom: "5px" }}>{label} ({unit})</label>
    <input
      type="number"
      step="0.1"
      value={value}
      onChange={(e) => onChange(name, e.target.value)}
      style={{
        width: "100%",
        padding: "12px",
        backgroundColor: tk.surfaceAlt,
        border: `1px solid ${tk.border}`,
        borderRadius: tk.radius.md,
        color: tk.text,
        fontSize: "1rem",
        boxSizing: "border-box"
      }}
      placeholder="0.0"
    />
  </div>
);

const StatCard = ({ label, value, unit, icon, tk }) => (
  <div style={{
    backgroundColor: tk.surface,
    padding: "15px",
    borderRadius: tk.radius.lg,
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    border: `1px solid ${tk.border}`
  }}>
    <div style={{ color: tk.textMuted, fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "5px" }}>
      <Icon name={icon} size={14} />
      {label}
    </div>
    <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: tk.accent }}>
      {value || "--"} <span style={{ fontSize: "0.8rem", color: tk.textFaint }}>{unit}</span>
    </div>
  </div>
);

const DetailRow = ({ label, value, unit, tk }) => {
  if (!value) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${tk.border}` }}>
      <span style={{ color: tk.textMuted }}>{label}</span>
      <span style={{ fontWeight: "bold", color: tk.accent }}>{value}{unit}</span>
    </div>
  );
};

export default function Measures() {
  const {
    user,
    saveUser,
    measures,
    saveMeasures,
    isLoaded,
    isMobile,
    authUser,
    refreshData,
    theme
  } = useUser();
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  // Forzar refresco de datos al entrar a medidas
  useEffect(() => {
    if (authUser) {
      refreshData();
    }
  }, [authUser]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingMeasure, setViewingMeasure] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [units, setUnits] = useState({
    weight: 'kg',
    length: 'cm'
  });

  const initialEntry = {
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
    calfR: "",
    photo: ""
  };

  const [newEntry, setNewEntry] = useState(initialEntry);

  useEffect(() => {
    if (user) {
      setUnits({
        weight: user.weightUnit || 'kg',
        length: user.heightUnit || 'cm'
      });
    }
  }, [user]);

  if (!isLoaded) return <Layout><Spinner isDark={isDark} fullPage label="Cargando..." /></Layout>;

  const updateUnits = async (type, val) => {
    if (units[type] === val) return;

    const newVal = val;
    const newUnits = { ...units, [type]: val };

    // Función de conversión interna
    const convertValue = (value, unitType, toUnit) => {
      if (!value || isNaN(parseFloat(value))) return value;
      const num = parseFloat(value);
      if (unitType === 'weight') {
        return toUnit === 'lb' ? (num * 2.20462).toFixed(1) : (num / 2.20462).toFixed(1);
      } else {
        return toUnit === 'in' ? (num / 2.54).toFixed(1) : (num * 2.54).toFixed(1);
      }
    };

    // 1. Convertir el formulario actual (newEntry)
    const updatedNewEntry = { ...newEntry };
    if (type === 'weight') {
      updatedNewEntry.weight = convertValue(newEntry.weight, 'weight', newVal);
    } else {
      const lengthFields = ['height', 'neck', 'shoulders', 'chest', 'waist', 'hips', 'bicepsL', 'bicepsR', 'forearmL', 'forearmR', 'thighL', 'thighR', 'calfL', 'calfR'];
      lengthFields.forEach(field => {
        updatedNewEntry[field] = convertValue(newEntry[field], 'length', newVal);
      });
    }
    setNewEntry(updatedNewEntry);

    // 2. Convertir todos los registros históricos
    const updatedMeasures = measures.map(m => {
      const updatedM = { ...m };
      if (type === 'weight') {
        updatedM.weight = convertValue(m.weight, 'weight', newVal);
      } else {
        const lengthFields = ['height', 'neck', 'shoulders', 'chest', 'waist', 'hips', 'bicepsL', 'bicepsR', 'forearmL', 'forearmR', 'thighL', 'thighR', 'calfL', 'calfR'];
        lengthFields.forEach(field => {
          updatedM[field] = convertValue(m[field], 'length', newVal);
        });
      }
      return updatedM;
    });

    setUnits(newUnits);
    await saveMeasures(updatedMeasures);

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

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewEntry(prev => ({ ...prev, photo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    let updatedMeasures;

    if (editingId) {
      updatedMeasures = measures.map(m =>
        m.id === editingId ? { ...newEntry, id: editingId, timestamp: new Date(newEntry.date).getTime() } : m
      );
    } else {
      const entry = {
        ...newEntry,
        id: Date.now(),
        timestamp: new Date(newEntry.date).getTime()
      };
      updatedMeasures = [entry, ...measures];
    }

    updatedMeasures.sort((a, b) => b.timestamp - a.timestamp);
    await saveMeasures(updatedMeasures);
    setShowAddForm(false);
    setEditingId(null);
    setNewEntry(initialEntry);
  };

  const handleEdit = (measure) => {
    setNewEntry(measure);
    setEditingId(measure.id);
    setShowAddForm(true);
  };

  const confirmDelete = async () => {
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    const updatedMeasures = measures.filter(m => m.id !== id);
    await saveMeasures(updatedMeasures);
    if (viewingMeasure?.id === id) setViewingMeasure(null);
  };

  const latest = measures[0] || {};

  return (
    <Layout>
      <PageHeader
        isDark={isDark}
        isMobile={isMobile}
        title="Medidas"
        subtitle="Seguimiento de progreso corporal"
      />

      {/* Units Toggles */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "30px" }}>
        <div style={{ flex: 1, backgroundColor: tk.surface, border: `1px solid ${tk.border}`, padding: "5px", borderRadius: tk.radius.md, display: "flex" }}>
          {['kg', 'lb'].map(u => (
            <button
              key={u}
              onClick={() => updateUnits('weight', u)}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: tk.radius.sm,
                border: "none",
                backgroundColor: units.weight === u ? tk.accent : "transparent",
                color: units.weight === u ? tk.onAccent : tk.textMuted,
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: "0.8rem",
                transition: tk.transition
              }}
            >{u.toUpperCase()}</button>
          ))}
        </div>
        <div style={{ flex: 1, backgroundColor: tk.surface, border: `1px solid ${tk.border}`, padding: "5px", borderRadius: tk.radius.md, display: "flex" }}>
          {['cm', 'in'].map(u => (
            <button
              key={u}
              onClick={() => updateUnits('length', u)}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: tk.radius.sm,
                border: "none",
                backgroundColor: units.length === u ? tk.accent : "transparent",
                color: units.length === u ? tk.onAccent : tk.textMuted,
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: "0.8rem",
                transition: tk.transition
              }}
            >{u.toUpperCase()}</button>
          ))}
        </div>
      </div>

      {/* Main Stats Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "30px" }}>
        <StatCard tk={tk} label="Peso" value={latest.weight} unit={units.weight} icon="dumbbell" />
        <StatCard tk={tk} label="Grasa Corporal" value={latest.bodyFat} unit="%" icon="barChart" />
        <StatCard tk={tk} label="Cintura" value={latest.waist} unit={units.length} icon="clock" />
        <StatCard tk={tk} label="Bíceps (R)" value={latest.bicepsR} unit={units.length} icon="list" />
      </div>

      {/* History / List */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: "bold", margin: 0, color: tk.text }}>Historial</h2>
        <Button
          isDark={isDark}
          size="sm"
          icon="plus"
          onClick={() => {
            setEditingId(null);
            setNewEntry(initialEntry);
            setShowAddForm(true);
          }}
        >
          Añadir Medida
        </Button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {measures.length === 0 ? (
          <EmptyState isDark={isDark} icon="clock" title="No hay medidas registradas" description="Añade tu primera medida para empezar a seguir tu progreso corporal." />
        ) : (
          measures.map(m => (
            <div
              key={m.id}
              onClick={() => setViewingMeasure(m)}
              style={{ backgroundColor: tk.surface, padding: "15px", borderRadius: tk.radius.lg, border: `1px solid ${tk.border}`, cursor: "pointer" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ fontWeight: "bold", color: tk.accent }}>{new Date(m.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(m); }}
                    style={{ background: "none", border: "none", color: tk.textMuted, cursor: "pointer", display: "flex" }}
                  >
                    <Icon name="edit" size={18} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(m.id); }}
                    style={{ background: "none", border: "none", color: tk.danger, cursor: "pointer", display: "flex" }}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                {m.photo && (
                  <img src={m.photo} alt="Progreso" style={{ width: "60px", height: "60px", borderRadius: tk.radius.sm, objectFit: "cover" }} />
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.85rem", color: tk.textMuted, flex: 1 }}>
                  {m.weight && <div>Peso: <span style={{ color: tk.text }}>{m.weight}{units.weight}</span></div>}
                  {m.bodyFat && <div>Grasa: <span style={{ color: tk.text }}>{m.bodyFat}%</span></div>}
                  {m.waist && <div>Cintura: <span style={{ color: tk.text }}>{m.waist}{units.length}</span></div>}
                  {m.bicepsR && <div>Bíceps D: <span style={{ color: tk.text }}>{m.bicepsR}{units.length}</span></div>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddForm && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.7)", zIndex: 2000,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px"
        }}>
          <div style={{
            backgroundColor: tk.surface,
            width: "100%",
            maxWidth: "500px",
            maxHeight: "90vh",
            borderRadius: tk.radius.lg,
            overflowY: "auto",
            padding: "25px",
            border: `1px solid ${tk.border}`
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, color: tk.accent }}>{editingId ? "Editar Medida" : "Nueva Medida"}</h2>
              <button onClick={() => { setShowAddForm(false); setEditingId(null); }} style={{ background: "none", border: "none", color: tk.text, cursor: "pointer", display: "flex" }}>
                <Icon name="close" size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "15px", marginBottom: "25px" }}>
                <div style={{
                  width: "120px",
                  height: "120px",
                  backgroundColor: tk.surfaceAlt,
                  borderRadius: tk.radius.lg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  border: `2px dashed ${tk.border}`
                }}>
                  {newEntry.photo ? (
                    <img src={newEntry.photo} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <Icon name="edit" size={32} color={tk.textFaint} />
                  )}
                </div>
                <label style={{
                  backgroundColor: tk.accent,
                  color: tk.onAccent,
                  padding: "8px 15px",
                  borderRadius: tk.radius.sm,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: "bold"
                }}>
                  {newEntry.photo ? "Cambiar Foto" : "Subir Foto Progreso"}
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />
                </label>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", color: tk.textMuted, fontSize: "0.85rem", marginBottom: "5px" }}>Fecha</label>
                <input
                  type="date"
                  value={newEntry.date}
                  onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "12px",
                    backgroundColor: tk.surfaceAlt,
                    border: `1px solid ${tk.border}`,
                    borderRadius: tk.radius.md,
                    color: tk.text,
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                <MeasurementField tk={tk} label="Peso" value={newEntry.weight} name="weight" unit={units.weight} onChange={handleFieldChange} />
                <MeasurementField tk={tk} label="Grasa %" value={newEntry.bodyFat} name="bodyFat" unit="%" onChange={handleFieldChange} />
                <MeasurementField tk={tk} label="Altura" value={newEntry.height} name="height" unit={units.length} onChange={handleFieldChange} />
                <MeasurementField tk={tk} label="Cintura" value={newEntry.waist} name="waist" unit={units.length} onChange={handleFieldChange} />
                <MeasurementField tk={tk} label="Cuello" value={newEntry.neck} name="neck" unit={units.length} onChange={handleFieldChange} />
                <MeasurementField tk={tk} label="Hombros" value={newEntry.shoulders} name="shoulders" unit={units.length} onChange={handleFieldChange} />
                <MeasurementField tk={tk} label="Pecho" value={newEntry.chest} name="chest" unit={units.length} onChange={handleFieldChange} />
                <MeasurementField tk={tk} label="Cadera" value={newEntry.hips} name="hips" unit={units.length} onChange={handleFieldChange} />
                <MeasurementField tk={tk} label="Bíceps D" value={newEntry.bicepsR} name="bicepsR" unit={units.length} onChange={handleFieldChange} />
                <MeasurementField tk={tk} label="Bíceps I" value={newEntry.bicepsL} name="bicepsL" unit={units.length} onChange={handleFieldChange} />
                <MeasurementField tk={tk} label="Antebrazo D" value={newEntry.forearmR} name="forearmR" unit={units.length} onChange={handleFieldChange} />
                <MeasurementField tk={tk} label="Antebrazo I" value={newEntry.forearmL} name="forearmL" unit={units.length} onChange={handleFieldChange} />
                <MeasurementField tk={tk} label="Muslo D" value={newEntry.thighR} name="thighR" unit={units.length} onChange={handleFieldChange} />
                <MeasurementField tk={tk} label="Muslo I" value={newEntry.thighL} name="thighL" unit={units.length} onChange={handleFieldChange} />
                <MeasurementField tk={tk} label="Gemelo D" value={newEntry.calfR} name="calfR" unit={units.length} onChange={handleFieldChange} />
                <MeasurementField tk={tk} label="Gemelo I" value={newEntry.calfL} name="calfL" unit={units.length} onChange={handleFieldChange} />
              </div>

              <Button isDark={isDark} type="submit" fullWidth style={{ marginTop: "20px" }}>
                {editingId ? "Actualizar Medida" : "Guardar Medida"}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Detailed View Modal */}
      {viewingMeasure && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.75)", zIndex: 3000,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px"
        }}>
          <div style={{
            backgroundColor: tk.surface,
            width: "100%",
            maxWidth: "500px",
            maxHeight: "90vh",
            borderRadius: tk.radius.lg,
            overflowY: "auto",
            padding: "25px",
            border: `1px solid ${tk.border}`,
            position: "relative"
          }}>
            <button
              onClick={() => setViewingMeasure(null)}
              style={{ position: "absolute", top: "20px", right: "20px", background: "none", border: "none", color: tk.text, cursor: "pointer", zIndex: 10, display: "flex" }}
            >
              <Icon name="close" size={20} />
            </button>

            <h2 style={{ color: tk.accent, marginBottom: "5px" }}>Detalle de Medida</h2>
            <p style={{ color: tk.textMuted, marginBottom: "25px" }}>{new Date(viewingMeasure.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

            {viewingMeasure.photo && (
              <div style={{ width: "100%", borderRadius: tk.radius.lg, overflow: "hidden", marginBottom: "25px", border: `1px solid ${tk.border}` }}>
                <img src={viewingMeasure.photo} alt="Progreso" style={{ width: "100%", height: "auto", display: "block" }} />
              </div>
            )}

            <div style={{ backgroundColor: tk.surfaceAlt, borderRadius: tk.radius.lg, padding: "15px" }}>
              <DetailRow tk={tk} label="Peso" value={viewingMeasure.weight} unit={units.weight} />
              <DetailRow tk={tk} label="Grasa Corporal" value={viewingMeasure.bodyFat} unit="%" />
              <DetailRow tk={tk} label="Altura" value={viewingMeasure.height} unit={units.length} />
              <DetailRow tk={tk} label="Cintura" value={viewingMeasure.waist} unit={units.length} />
              <DetailRow tk={tk} label="Cuello" value={viewingMeasure.neck} unit={units.length} />
              <DetailRow tk={tk} label="Hombros" value={viewingMeasure.shoulders} unit={units.length} />
              <DetailRow tk={tk} label="Pecho" value={viewingMeasure.chest} unit={units.length} />
              <DetailRow tk={tk} label="Cadera" value={viewingMeasure.hips} unit={units.length} />
              <DetailRow tk={tk} label="Bíceps Derecho" value={viewingMeasure.bicepsR} unit={units.length} />
              <DetailRow tk={tk} label="Bíceps Izquierdo" value={viewingMeasure.bicepsL} unit={units.length} />
              <DetailRow tk={tk} label="Antebrazo Derecho" value={viewingMeasure.forearmR} unit={units.length} />
              <DetailRow tk={tk} label="Antebrazo Izquierdo" value={viewingMeasure.forearmL} unit={units.length} />
              <DetailRow tk={tk} label="Muslo Derecho" value={viewingMeasure.thighR} unit={units.length} />
              <DetailRow tk={tk} label="Muslo Izquierdo" value={viewingMeasure.thighL} unit={units.length} />
              <DetailRow tk={tk} label="Gemelo Derecho" value={viewingMeasure.calfR} unit={units.length} />
              <DetailRow tk={tk} label="Gemelo Izquierdo" value={viewingMeasure.calfL} unit={units.length} />
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "25px" }}>
              <Button isDark={isDark} variant="secondary" style={{ flex: 1 }} onClick={() => { setViewingMeasure(null); handleEdit(viewingMeasure); }}>
                Editar
              </Button>
              <Button isDark={isDark} variant="danger" style={{ flex: 1 }} onClick={() => setConfirmDeleteId(viewingMeasure.id)}>
                Borrar
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isDark={isDark}
        open={!!confirmDeleteId}
        title="¿Borrar esta medida?"
        description="Esta acción no se puede deshacer."
        danger
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </Layout>
  );
}
