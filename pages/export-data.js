import { useState } from "react";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { exercisesList } from "../data/exercises";

export default function ExportData() {
  const { theme, t, bulkSaveWorkouts, bulkSaveMeasures, saveUser, user, authUser } = useUser();
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
        const { workouts, latestWeight, weightMeasures } = parseHevyCSV(text);
        
        if (workouts.length === 0 && weightMeasures.length === 0) {
          setImportStatus("No se encontraron datos válidos en el archivo.");
          setIsImporting(false);
          return;
        }

        let statusMsg = "";
        if (workouts.length > 0) {
          setImportStatus(`Importando ${workouts.length} entrenamientos...`);
          await bulkSaveWorkouts(workouts);
          statusMsg += `${workouts.length} entrenamientos `;
        }

        if (weightMeasures.length > 0) {
          setImportStatus(prev => prev + " y medidas de peso...");
          await bulkSaveMeasures(weightMeasures);
          statusMsg += (statusMsg ? "y " : "") + `${weightMeasures.length} medidas de peso `;
          
          if (latestWeight) {
            const updatedUser = { ...user, weight: latestWeight };
            await saveUser(updatedUser);
            statusMsg += "(perfil actualizado) ";
          }
        }
        
        setImportedCount(workouts.length || weightMeasures.length);
        setImportStatus(`¡Importación completada! Se han importado ${statusMsg}.`);
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
    // Basic cleaning of lines
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return { workouts: [], latestWeight: null, weightMeasures: [] };

    // Robust Header parsing: remove BOM, quotes, and normalize to lowercase
    const headerLine = lines[0].replace(/^\uFEFF/, '').trim();
    const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
    const headers = headerLine.split(regex).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

    const rows = lines.slice(1).map(line => {
      const parts = line.split(regex).map(p => p.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((h, i) => {
        if (h && parts[i] !== undefined) {
          row[h] = parts[i];
        }
      });
      return row;
    });

    // Helper for date parsing (handles YYYY-MM-DD HH:mm:ss and Spanish formats like "17 feb 2026, 11:44")
    const parseDateSafe = (dateStr) => {
      if (!dateStr) return new Date();
      
      // Clean string: remove commas and normalize to lowercase
      const cleanStr = dateStr.replace(/,/g, '').toLowerCase().trim();
      
      // Try standard JS parsing first
      let d = new Date(dateStr.replace(" ", "T"));
      if (!isNaN(d.getTime())) return d;
      
      // Spanish months mapping
      const monthsEs = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
      const monthsEsFull = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
      
      // Split by spaces, slashes, dashes, or colons
      const parts = cleanStr.split(/[\/\-\s:]+/).filter(p => p.trim());
      // Case "17 feb 2026 11 44" -> parts: ["17", "feb", "2026", "11", "44"]
      
      if (parts.length >= 3) {
        let day, monthIdx = -1, year, hour = 0, min = 0, sec = 0;
        
        // 1. Try to find if any part is a Spanish month (short or full)
        parts.forEach((p, i) => {
          // Check for abbreviations (ene, feb...) or full names (enero, febrero...)
          const idxShort = monthsEs.findIndex(m => p.startsWith(m));
          const idxFull = monthsEsFull.findIndex(m => p === m);
          const finalIdx = idxShort !== -1 ? idxShort : idxFull;
          
          if (finalIdx !== -1) {
            monthIdx = finalIdx;
            // Typical format: DD MONTH YYYY HH MM
            if (i > 0) day = parseInt(parts[i-1]);
            if (i < parts.length - 1) year = parseInt(parts[i+1]);
            
            // Hours and minutes follow the year
            if (i < parts.length - 2) hour = parseInt(parts[i+2]) || 0;
            if (i < parts.length - 3) min = parseInt(parts[i+3]) || 0;
            if (i < parts.length - 4) sec = parseInt(parts[i+4]) || 0;
          }
        });
        
        // 2. If month name found and day/year parsed
        if (monthIdx !== -1 && !isNaN(day) && !isNaN(year)) {
          // Normalize year (e.g., "26" to 2026)
          if (year < 100) year += 2000;
          return new Date(year, monthIdx, day, hour, min, sec);
        }

        // 3. Fallback to numeric logic
        if (parts[0].length === 4) { // YYYY MM DD ...
          return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), parseInt(parts[3]) || 0, parseInt(parts[4]) || 0, parseInt(parts[5]) || 0);
        } else if (parts[2] && parts[2].length === 4) { // DD MM YYYY ...
          return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), parseInt(parts[3]) || 0, parseInt(parts[4]) || 0, parseInt(parts[5]) || 0);
        }
      }
      
      // Final attempt if d is still invalid
      return isNaN(d.getTime()) ? new Date() : d;
    };

    // Group by Workout REAL: title + start_time
    const workoutGroups = {};
    rows.forEach(row => {
      if (!row.start_time || !row.title) return;
      const workoutKey = `${row.start_time}_${row.title}`;
      if (!workoutGroups[workoutKey]) {
        workoutGroups[workoutKey] = [];
      }
      workoutGroups[workoutKey].push(row);
    });

    const workouts = Object.values(workoutGroups).map((groupRows, index) => {
      const firstRow = groupRows[0];
      
      // Group exercises within the workout: exercise_title
      const exerciseGroups = {};
      groupRows.forEach(row => {
        const exName = row.exercise_title;
        if (!exName) return;
        if (!exerciseGroups[exName]) {
          exerciseGroups[exName] = [];
        }
        exerciseGroups[exName].push(row);
      });

      const exerciseDetails = Object.entries(exerciseGroups).map(([name, exRows]) => {
        const series = exRows.map(row => ({
          reps: parseInt(row.reps) || 0,
          weight: parseFloat(row.weight_kg) || 0,
          type: row.set_type === "warmup" ? "W" : "N"
        }));

        return {
          name,
          muscleGroup: findMuscleGroup(name),
          series
        };
      });

      const totalReps = exerciseDetails.reduce((sum, ex) => 
        sum + ex.series.reduce((sSum, s) => sSum + (s.reps || 0), 0)
      , 0);
      
      const totalVolume = exerciseDetails.reduce((sum, ex) => 
        sum + ex.series.reduce((sSum, s) => sSum + ((s.weight || 0) * (s.reps || 0)), 0)
      , 0);
      
      const totalSeries = exerciseDetails.reduce((sum, ex) => sum + ex.series.length, 0);

      // Robust date and duration parsing
      let completedAt;
      let elapsedTime = 0;
      
      if (firstRow.duration_seconds && !isNaN(parseInt(firstRow.duration_seconds))) {
        elapsedTime = parseInt(firstRow.duration_seconds);
      }

      const startDate = parseDateSafe(firstRow.start_time);
      const endDate = parseDateSafe(firstRow.end_time);
      
      completedAt = startDate.toISOString();
      
      if (elapsedTime === 0 && !isNaN(endDate.getTime())) {
        elapsedTime = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
      }

      return {
        id: (Date.parse(completedAt) + index).toString(),
        name: firstRow.title || "Entrenamiento importado",
        comments: firstRow.description || "",
        completedAt,
        totalTime: Math.floor(elapsedTime / 60) || 0,
        elapsedTime: elapsedTime,
        exercises: exerciseDetails.length,
        series: totalSeries,
        totalReps,
        totalVolume,
        exerciseDetails
      };
    });

    return { workouts, latestWeight: null, weightMeasures: [] };
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
