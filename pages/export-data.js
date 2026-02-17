import { useState } from "react";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { exercisesList } from "../data/exercises";

export default function ExportData() {
  const { theme, t, bulkSaveWorkouts, authUser } = useUser();
  const isDark = theme === 'dark';
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [importedCount, setImportedCount] = useState(0);

  const findMuscleGroup = (exerciseName) => {
    for (const [group, exercises] of Object.entries(exercisesList)) {
      if (exercises.some(e => e.name.toLowerCase() === exerciseName.toLowerCase())) {
        return group;
      }
    }
    return "Otros";
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus("Leyendo archivo...");
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const workouts = parseHevyCSV(text);
        
        if (workouts.length === 0) {
          setImportStatus("No se encontraron entrenamientos válidos en el archivo.");
          setIsImporting(false);
          return;
        }

        setImportStatus(`Importando ${workouts.length} entrenamientos...`);
        await bulkSaveWorkouts(workouts);
        
        setImportedCount(workouts.length);
        setImportStatus("¡Importación completada con éxito!");
      } catch (error) {
        console.error("Error importing CSV:", error);
        setImportStatus("Error al procesar el archivo CSV. Asegúrate de que sea un export de Hevy.");
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const parseHevyCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];

    // Header parsing
    const headerLine = lines[0];
    const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
    const headers = headerLine.split(regex).map(h => h.trim().replace(/^"|"$/g, ''));

    const rows = lines.slice(1).map(line => {
      const parts = line.split(regex).map(p => p.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((h, i) => {
        row[h] = parts[i];
      });
      return row;
    });

    // Group by Date and Workout Name
    const workoutGroups = {};
    rows.forEach(row => {
      const workoutKey = `${row.Date}_${row["Workout Name"]}`;
      if (!workoutGroups[workoutKey]) {
        workoutGroups[workoutKey] = [];
      }
      workoutGroups[workoutKey].push(row);
    });

    const completedWorkouts = Object.values(workoutGroups).map((groupRows, index) => {
      const firstRow = groupRows[0];
      
      // Group exercises within the workout
      const exerciseGroups = {};
      groupRows.forEach(row => {
        const exName = row["Exercise Name"];
        if (!exerciseGroups[exName]) {
          exerciseGroups[exName] = [];
        }
        exerciseGroups[exName].push(row);
      });

      const exerciseDetails = Object.entries(exerciseGroups).map(([name, exRows]) => {
        const series = exRows.map(row => ({
          reps: row.Reps || "0",
          weight: row.Weight || "0",
          type: "N" // Default to normal
        }));

        return {
          name,
          muscleGroup: findMuscleGroup(name),
          series
        };
      });

      const totalReps = exerciseDetails.reduce((sum, ex) => 
        sum + ex.series.reduce((sSum, s) => sSum + (parseInt(s.reps) || 0), 0)
      , 0);
      
      const totalVolume = exerciseDetails.reduce((sum, ex) => 
        sum + ex.series.reduce((sSum, s) => sSum + ((parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0)), 0)
      , 0);
      
      const totalSeries = exerciseDetails.reduce((sum, ex) => sum + ex.series.length, 0);

      // Parse date. Hevy format is usually "YYYY-MM-DD HH:mm:ss"
      let completedAt;
      try {
        completedAt = new Date(firstRow.Date).toISOString();
      } catch (e) {
        completedAt = new Date().toISOString();
      }

      return {
        id: Date.parse(completedAt) + index,
        name: firstRow["Workout Name"] || "Entrenamiento importado",
        comments: firstRow["Workout Notes"] || "",
        completedAt,
        totalTime: Math.floor((parseInt(firstRow.Seconds) || 0) / 60) || 0,
        elapsedTime: parseInt(firstRow.Seconds) || 0,
        exercises: exerciseDetails.length,
        series: totalSeries,
        totalReps,
        totalVolume,
        exerciseDetails
      };
    });

    return completedWorkouts;
  };

  if (!authUser) {
    return (
      <Layout>
        <div style={{ padding: "40px", textAlign: "center", color: isDark ? "#fff" : "#333" }}>
          <h2>{t("please_login_to_import")}</h2>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "40px 20px",
        color: isDark ? "#fff" : "#333"
      }}>
        <h1 style={{ marginBottom: "10px", color: "#1dd1a1" }}>{t("exportar_datos")}</h1>
        <p style={{ marginBottom: "30px", opacity: 0.8 }}>
          Importa tu historial de entrenamientos desde la aplicación Hevy mediante un archivo CSV.
        </p>

        <div style={{
          backgroundColor: isDark ? "#1a1a1a" : "#fff",
          padding: "30px",
          borderRadius: "12px",
          border: isDark ? "1px solid #333" : "1px solid #eee",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
        }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "20px" }}>Importar desde Hevy</h2>
          
          <div style={{ marginBottom: "20px" }}>
            <ol style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
              <li>Abre Hevy en tu móvil o web.</li>
              <li>Ve a Ajustes - Exportar datos.</li>
              <li>Descarga el archivo CSV.</li>
              <li>Sube el archivo aquí abajo.</li>
            </ol>
          </div>

          <div style={{
            border: "2px dashed #1dd1a1",
            borderRadius: "8px",
            padding: "40px",
            textAlign: "center",
            cursor: "pointer",
            position: "relative",
            transition: "all 0.3s ease",
            backgroundColor: isDark ? "rgba(29, 209, 161, 0.05)" : "rgba(29, 209, 161, 0.02)"
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = isDark ? "rgba(29, 209, 161, 0.1)" : "rgba(29, 209, 161, 0.05)"}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = isDark ? "rgba(29, 209, 161, 0.05)" : "rgba(29, 209, 161, 0.02)"}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isImporting}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                opacity: 0,
                cursor: "pointer"
              }}
            />
            <div style={{ fontSize: "3rem", marginBottom: "10px" }}>📄</div>
            <p style={{ fontWeight: "600", fontSize: "1.1rem" }}>
              {isImporting ? "Procesando..." : "Haz clic o arrastra tu archivo CSV aquí"}
            </p>
            <p style={{ fontSize: "0.9rem", opacity: 0.6, marginTop: "5px" }}>
              Solo archivos .csv exportados de Hevy
            </p>
          </div>

          {importStatus && (
            <div style={{
              marginTop: "20px",
              padding: "15px",
              borderRadius: "8px",
              backgroundColor: importStatus.includes("éxito") ? "rgba(46, 204, 113, 0.2)" : 
                             importStatus.includes("Error") ? "rgba(231, 76, 60, 0.2)" : 
                             isDark ? "#2a2a2a" : "#f5f5f5",
              color: importStatus.includes("éxito") ? "#2ecc71" : 
                     importStatus.includes("Error") ? "#e74c3c" : 
                     isDark ? "#fff" : "#333",
              textAlign: "center",
              fontWeight: "500"
            }}>
              {importStatus}
            </div>
          )}

          {importedCount > 0 && (
            <div style={{ marginTop: "20px", textAlign: "center" }}>
              <button
                onClick={() => window.location.href = "/profile"}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#1dd1a1",
                  color: "#000",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                Ir a mi Perfil para ver los cambios
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
