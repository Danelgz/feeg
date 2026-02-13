import { useState } from "react";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";

export default function Food() {
  const { theme, isMobile } = useUser();
  const isDark = theme === 'dark';
  
  const [activeTab, setActiveTab] = useState("daily"); // daily, photo, manual
  const [dailyFoods, setDailyFoods] = useState([]);
  const [manualInput, setManualInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);

  const accentColor = "#1dd1a1"; // Menta
  
  // Daily goals (mocked)
  const goals = { calories: 2000, protein: 150, carbs: 200, fats: 70 };

  const totals = dailyFoods.reduce((acc, food) => ({
    calories: acc.calories + food.calories,
    protein: acc.protein + food.protein,
    carbs: acc.carbs + food.carbs,
    fats: acc.fats + food.fats,
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  const handleManualAdd = () => {
    if (!manualInput.trim()) return;
    
    // Simulated AI parsing of text like "200g de pollo"
    setIsAnalyzing(true);
    setTimeout(() => {
      let newFood = {
        id: Date.now(),
        name: manualInput,
        calories: 250,
        protein: 30,
        carbs: 0,
        fats: 12
      };

      if (manualInput.toLowerCase().includes("arroz")) {
        newFood = { ...newFood, calories: 300, protein: 6, carbs: 65, fats: 1 };
      } else if (manualInput.toLowerCase().includes("manzana")) {
        newFood = { ...newFood, calories: 95, protein: 0, carbs: 25, fats: 0 };
      }

      setDailyFoods([...dailyFoods, newFood]);
      setManualInput("");
      setIsAnalyzing(false);
      setActiveTab("daily");
    }, 1000);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPhotoPreview(URL.createObjectURL(file));
    setIsAnalyzing(true);

    // Simulated AI Image Analysis
    setTimeout(() => {
      const analyzedFood = {
        id: Date.now(),
        name: "Plato analizado (Pollo con Arroz y Brócoli)",
        calories: 550,
        protein: 45,
        carbs: 60,
        fats: 15,
        isHealthy: true,
        feedback: "¡Excelente elección! Tiene un buen equilibrio de macronutrientes."
      };
      setDailyFoods([...dailyFoods, analyzedFood]);
      setIsAnalyzing(false);
      setActiveTab("daily");
    }, 2500);
  };

  const cardStyle = {
    backgroundColor: isDark ? "#1a1a1a" : "#fff",
    borderRadius: "15px",
    padding: "20px",
    marginBottom: "20px",
    border: `1px solid ${isDark ? "#333" : "#eee"}`,
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
  };

  const buttonStyle = {
    backgroundColor: accentColor,
    color: "#000",
    border: "none",
    padding: "12px 20px",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "1rem",
    width: "100%"
  };

  const inputStyle = {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: `1px solid ${isDark ? "#444" : "#ccc"}`,
    backgroundColor: isDark ? "#000" : "#fff",
    color: isDark ? "#fff" : "#333",
    marginBottom: "10px",
    fontSize: "1rem"
  };

  const ProgressBar = ({ label, current, target, color }) => {
    const percentage = Math.min((current / target) * 100, 100);
    return (
      <div style={{ marginBottom: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "4px" }}>
          <span>{label}</span>
          <span>{current} / {target} {label === "Calorías" ? "kcal" : "g"}</span>
        </div>
        <div style={{ width: "100%", height: "8px", backgroundColor: isDark ? "#333" : "#eee", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ width: `${percentage}%`, height: "100%", backgroundColor: color, transition: "width 0.5s ease" }} />
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: isMobile ? "10px" : "20px", color: isDark ? "#fff" : "#333" }}>
        <h1 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "2rem" }}>🍎</span> Registro de Comida
        </h1>

        {/* Totals Summary */}
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Resumen Diario</h3>
          <ProgressBar label="Calorías" current={totals.calories} target={goals.calories} color={totals.calories > goals.calories ? "#ff4d4d" : accentColor} />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: "15px", marginTop: "15px" }}>
            <ProgressBar label="Proteínas" current={totals.protein} target={goals.protein} color="#4d94ff" />
            <ProgressBar label="Carbos" current={totals.carbs} target={goals.carbs} color="#ffb347" />
            <ProgressBar label="Grasas" current={totals.fats} target={goals.fats} color="#ff4d4d" />
          </div>
          
          {totals.calories > goals.calories && (
            <div style={{ marginTop: "15px", padding: "10px", backgroundColor: "rgba(255, 77, 77, 0.1)", borderRadius: "8px", color: "#ff4d4d", fontSize: "0.9rem", textAlign: "center" }}>
              ⚠️ Te has pasado de tu objetivo de calorías hoy.
            </div>
          )}
          {totals.calories > 0 && totals.protein < goals.protein * 0.5 && (
            <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "rgba(77, 148, 255, 0.1)", borderRadius: "8px", color: "#4d94ff", fontSize: "0.9rem", textAlign: "center" }}>
              💡 Intenta añadir más proteína en tu próxima comida.
            </div>
          )}
        </div>

        {/* Tabs for Actions */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <button onClick={() => setActiveTab("daily")} style={{ ...buttonStyle, backgroundColor: activeTab === "daily" ? accentColor : (isDark ? "#333" : "#e0e0e0"), color: activeTab === "daily" ? "#000" : (isDark ? "#fff" : "#333") }}>Log Diario</button>
          <button onClick={() => setActiveTab("manual")} style={{ ...buttonStyle, backgroundColor: activeTab === "manual" ? accentColor : (isDark ? "#333" : "#e0e0e0"), color: activeTab === "manual" ? "#000" : (isDark ? "#fff" : "#333") }}>Añadir Manual</button>
          <button onClick={() => setActiveTab("photo")} style={{ ...buttonStyle, backgroundColor: activeTab === "photo" ? accentColor : (isDark ? "#333" : "#e0e0e0"), color: activeTab === "photo" ? "#000" : (isDark ? "#fff" : "#333") }}>Subir Foto</button>
        </div>

        {activeTab === "daily" && (
          <div>
            {dailyFoods.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: "center", color: "#888" }}>
                Todavía no has registrado ninguna comida hoy.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {dailyFoods.map(food => (
                  <div key={food.id} style={{ ...cardStyle, marginBottom: 0, padding: "15px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{food.name}</div>
                        <div style={{ color: "#888", fontSize: "0.9rem" }}>
                          {food.calories} kcal • P: {food.protein}g C: {food.carbs}g G: {food.fats}g
                        </div>
                        {food.feedback && (
                          <div style={{ fontSize: "0.85rem", color: accentColor, marginTop: "5px", fontStyle: "italic" }}>
                            ✨ {food.feedback}
                          </div>
                        )}
                      </div>
                      <button onClick={() => setDailyFoods(dailyFoods.filter(f => f.id !== food.id))} style={{ background: "none", border: "none", color: "#ff4d4d", cursor: "pointer" }}>Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "manual" && (
          <div style={cardStyle}>
            <h3>Añadir comida a mano</h3>
            <p style={{ fontSize: "0.9rem", color: "#888" }}>Escribe lo que has comido y nuestra IA estimará sus valores nutricionales.</p>
            <input 
              placeholder="Ej: 200g de arroz con pollo" 
              style={inputStyle} 
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              onKeyPress={e => e.key === "Enter" && handleManualAdd()}
            />
            <button onClick={handleManualAdd} disabled={isAnalyzing} style={{ ...buttonStyle, opacity: isAnalyzing ? 0.7 : 1 }}>
              {isAnalyzing ? "Analizando..." : "Añadir al día"}
            </button>
          </div>
        )}

        {activeTab === "photo" && (
          <div style={{ ...cardStyle, textAlign: "center" }}>
            <h3>Sube una foto de tu plato</h3>
            <p style={{ fontSize: "0.9rem", color: "#888" }}>La IA identificará los alimentos y calculará las calorías.</p>
            
            <div style={{ margin: "20px 0" }}>
              <label style={{ ...buttonStyle, display: "inline-block", cursor: "pointer", width: "auto" }}>
                📸 Seleccionar Foto
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />
              </label>
            </div>

            {isAnalyzing && (
              <div style={{ marginTop: "20px" }}>
                {photoPreview && <img src={photoPreview} alt="Preview" style={{ maxWidth: "200px", borderRadius: "10px", marginBottom: "15px" }} />}
                <div style={{ color: accentColor, fontWeight: "bold" }}>Analizando imagen con IA...</div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
