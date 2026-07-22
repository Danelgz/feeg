import { useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { exercisesList } from "../data/exercises";
import { getTokens } from "../lib/tokens";
import { Icon, Button, EmptyState, PageHeader } from "../components/ui";
import { resolveExerciseNames } from "../lib/exerciseMatcher";
import ExerciseMatchReview from "../components/import/ExerciseMatchReview";

export default function ExportData() {
  const router = useRouter();
  const { theme, t, bulkSaveWorkouts, bulkSaveMeasures, saveUser, user, authUser, completedWorkouts, routines, measures } = useUser();
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [importWarning, setImportWarning] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  // Cuando el matcher deja ejercicios ambiguos/sin conectar, el import se pausa aquí a la espera
  // de que ExerciseMatchReview resuelva cada uno (ver handleReviewComplete más abajo).
  const [pendingImport, setPendingImport] = useState(null);

  // Backup personal completo en JSON — descarga directa en el cliente, sin pasar por un
  // endpoint. Es la contraparte real de "Importar desde Hevy" más abajo: antes esta página se
  // llamaba "Exportar datos" pero solo importaba, nunca exportaba nada.
  const handleExportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile: user,
      completedWorkouts: completedWorkouts || [],
      routines: routines || [],
      measures: measures || [],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feeg-datos-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const findMuscleGroup = (exerciseName) => {
    if (!exerciseName) return "Otros";
    const name = exerciseName.toLowerCase();
    
    // Exact match in our exercisesList
    for (const [group, exercises] of Object.entries(exercisesList)) {
      if (exercises.some(e => e.name.toLowerCase() === name)) {
        return group;
      }
    }

    // Partial match keywords
    if (name.includes("pecho") || name.includes("banca") || name.includes("chest") || name.includes("bench")) return "Pecho";
    if (name.includes("espalda") || name.includes("jalón") || name.includes("remo") || name.includes("back") || name.includes("row") || name.includes("dominada")) return "Espalda";
    if (name.includes("hombro") || name.includes("militar") || name.includes("lateral") || name.includes("shoulder") || name.includes("press militar")) return "Hombros";
    if (name.includes("bíceps") || name.includes("biceps") || name.includes("curl")) return "Bíceps";
    if (name.includes("tríceps") || name.includes("triceps") || name.includes("extensión de tríceps") || name.includes("skull crusher")) return "Tríceps";
    if (name.includes("cuádriceps") || name.includes("quads") || name.includes("sentadilla") || name.includes("prensa") || name.includes("squat")) return "Cuádriceps";
    if (name.includes("femoral") || name.includes("hamstring") || name.includes("peso muerto rumano")) return "Femoral";
    if (name.includes("glúteo") || name.includes("glute") || name.includes("hip thrust")) return "Glúteos";
    if (name.includes("gemelo") || name.includes("calf") || name.includes("talones")) return "Gemelos";
    if (name.includes("abdomen") || name.includes("abs") || name.includes("crunch") || name.includes("plancha")) return "Abdomen";

    return "Otros";
  };

  // Reescribe exerciseDetails[].name/muscleGroup/group con lo que se resolvió en el matcher
  // (automático) y/o en ExerciseMatchReview (manual). Los nombres sin resolución en `resolutions`
  // (omitidos, o directamente ya conectados de forma automática por resolveExerciseNames) se
  // dejan tal y como los dejó parseHevyCSV.
  const applyResolutions = (workouts, resolutions) => {
    return workouts.map((w) => ({
      ...w,
      exerciseDetails: w.exerciseDetails.map((ex) => {
        const resolution = resolutions[ex.name];
        if (!resolution) return ex;
        return { ...ex, name: resolution.name, muscleGroup: resolution.group, group: resolution.group };
      }),
    }));
  };

  const finalizeImport = async (workouts, weightMeasures, latestWeight) => {
    try {
      let statusMsg = "";
      let cloudSyncFailed = false;
      if (workouts.length > 0) {
        setImportStatus(`Importando ${workouts.length} entrenamientos...`);
        // bulkSaveWorkouts devuelve false si el guardado en local funcionó pero la nube lo
        // rechazó (antes se tragaba el error en silencio: se veía "completado" aunque el
        // historial nunca llegara a Firestore, y el siguiente refresco desde la nube — otra
        // pestaña, otro dispositivo, o simplemente `refreshData()` pasados 5s — lo revertía).
        const cloudSynced = await bulkSaveWorkouts(workouts);
        if (cloudSynced === false) cloudSyncFailed = true;
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
      setImportWarning(cloudSyncFailed);
      setImportStatus(
        cloudSyncFailed
          ? `Se han guardado ${statusMsg}en este dispositivo, pero no se pudieron sincronizar con la nube (posiblemente porque tu historial es muy grande). Vuelve a intentarlo con mejor conexión — si sigue fallando, puede que tengas demasiados entrenos para guardarlos todos en un único perfil; avísanos. Tus datos siguen a salvo en este dispositivo.`
          : `¡Importación completada! Se han importado ${statusMsg}.`
      );
    } catch (error) {
      console.error("Error importing CSV:", error);
      setImportWarning(false);
      setImportStatus("Error al procesar el archivo CSV. Asegúrate de que sea un export de Hevy.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus("Leyendo archivo...");
    setImportWarning(false);

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

        // Conecta cada ejercicio importado con el catálogo de FEEG (ver lib/exerciseMatcher.js)
        // antes de guardar nada, para que el historial/PRs queden bajo el mismo nombre que el
        // resto de la app en vez de duplicarse con el nombre literal de la app de origen.
        const occurrencesByName = {};
        const uniqueNames = [];
        workouts.forEach((w) => w.exerciseDetails.forEach((ex) => {
          if (!(ex.name in occurrencesByName)) { occurrencesByName[ex.name] = 0; uniqueNames.push(ex.name); }
          occurrencesByName[ex.name] += ex.series.length;
        }));

        const { resolved, pending } = resolveExerciseNames(uniqueNames);
        const autoConnected = applyResolutions(workouts, resolved);

        if (pending.length > 0) {
          setImportStatus("");
          setIsImporting(false);
          setPendingImport({
            workouts: autoConnected,
            weightMeasures,
            latestWeight,
            pending: pending.map((p) => ({ ...p, occurrences: occurrencesByName[p.foreignName] || 0 })),
          });
          return;
        }

        await finalizeImport(autoConnected, weightMeasures, latestWeight);
      } catch (error) {
        console.error("Error importing CSV:", error);
        setImportStatus("Error al procesar el archivo CSV. Asegúrate de que sea un export de Hevy.");
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const handleReviewComplete = async (resolutions) => {
    const { workouts, weightMeasures, latestWeight } = pendingImport;
    setPendingImport(null);
    setIsImporting(true);
    setImportStatus("Importando entrenamientos...");
    await finalizeImport(applyResolutions(workouts, resolutions), weightMeasures, latestWeight);
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

        const muscleGroup = findMuscleGroup(name);

        return {
          name,
          muscleGroup,
          group: muscleGroup, // Compatibility with statistics
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
        <EmptyState isDark={isDark} icon="user" title={t("please_login_to_import")} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <PageHeader
          isDark={isDark}
          title={t("exportar_datos")}
          subtitle="Descarga una copia de tus datos, o importa tu historial desde Hevy."
        />

        <div style={{
          backgroundColor: tk.surface,
          padding: "30px",
          borderRadius: tk.radius.md,
          border: `1px solid ${tk.border}`,
          boxShadow: tk.shadow.card,
          marginBottom: "24px"
        }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "10px", color: tk.text }}>Exportar mis datos</h2>
          <p style={{ color: tk.textMuted, lineHeight: "1.6", marginBottom: "20px" }}>
            Descarga una copia de seguridad de todo tu historial — entrenamientos completados, rutinas, medidas
            corporales y tu perfil — en un único archivo JSON que puedes guardar donde quieras.
          </p>
          <Button isDark={isDark} icon="download" onClick={handleExportData}>
            Descargar mis datos (JSON)
          </Button>
        </div>

        <div style={{
          backgroundColor: tk.surface,
          padding: "30px",
          borderRadius: tk.radius.md,
          border: `1px solid ${tk.border}`,
          boxShadow: tk.shadow.card
        }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "20px", color: tk.text }}>Importar desde Hevy</h2>

          <div style={{ marginBottom: "20px" }}>
            <ol style={{ paddingLeft: "20px", lineHeight: "1.6", color: tk.textMuted }}>
              <li>Abre Hevy en tu móvil o web.</li>
              <li>Ve a Ajustes - Exportar datos.</li>
              <li>Descarga el archivo CSV.</li>
              <li>Sube el archivo aquí abajo.</li>
            </ol>
          </div>

          <div style={{
            border: `2px dashed ${tk.accent}`,
            borderRadius: tk.radius.sm,
            padding: "40px",
            textAlign: "center",
            cursor: "pointer",
            position: "relative",
            transition: tk.transition,
            backgroundColor: tk.accentSoft
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = isDark ? "rgba(29, 209, 161, 0.16)" : "rgba(29, 209, 161, 0.08)"}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = tk.accentSoft}
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
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px", color: tk.accent }}>
              <Icon name="download" size={36} />
            </div>
            <p style={{ fontWeight: "600", fontSize: "1.1rem", color: tk.text, margin: 0 }}>
              {isImporting ? "Procesando..." : "Haz clic o arrastra tu archivo CSV aquí"}
            </p>
            <p style={{ fontSize: "0.9rem", color: tk.textMuted, marginTop: "5px" }}>
              Solo archivos .csv exportados de Hevy
            </p>
          </div>

          {importStatus && (
            <div style={{
              marginTop: "20px",
              padding: "15px",
              borderRadius: tk.radius.sm,
              backgroundColor: importWarning || importStatus.includes("Error") ? tk.dangerSoft :
                             importStatus.includes("éxito") ? tk.accentSoft :
                             tk.surfaceAlt,
              color: importWarning || importStatus.includes("Error") ? tk.danger :
                     importStatus.includes("éxito") ? tk.accent :
                     tk.text,
              textAlign: "center",
              fontWeight: "500"
            }}>
              {importStatus}
            </div>
          )}

          {importedCount > 0 && (
            <div style={{ marginTop: "20px", textAlign: "center" }}>
              {/* router.push, no window.location.href: una recarga completa tira el estado en
                  memoria (ya correcto, recién importado) y fuerza una relectura desde la nube —
                  si esa sincronización todavía no había terminado o falló en segundo plano (los
                  mutators de UserContext no bloquean ni informan de errores de nube, por diseño),
                  el perfil recargado se quedaba viendo el estado antiguo: 0 entrenamientos aunque
                  la importación sí se había guardado. Navegación de cliente evita el problema
                  entero al no volver a pedirle nada a la nube. */}
              <Button isDark={isDark} onClick={() => router.push("/profile")}>
                Ir a mi Perfil para ver los cambios
              </Button>
            </div>
          )}
        </div>
      </div>

      {pendingImport && (
        <ExerciseMatchReview
          pending={pendingImport.pending}
          onComplete={handleReviewComplete}
          onCancel={() => {
            setPendingImport(null);
            setImportStatus("Importación cancelada.");
          }}
        />
      )}
    </Layout>
  );
}
