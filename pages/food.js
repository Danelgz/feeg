import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { saveToCloud, getFromCloud } from "../lib/firebase";

export default function Food() {
  const { theme, isMobile, authUser } = useUser();
  const isDark = theme === 'dark';
  
  const [activeTab, setActiveTab] = useState("daily"); // daily, photo, manual, plan
  const [dailyFoods, setDailyFoods] = useState([]);
  const [nutritionalPlan, setNutritionalPlan] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Onboarding/Plan Form State
  const [planForm, setPlanForm] = useState({
    age: "", sex: "", height: "", weight: "", goal: "mantenimiento", activity: "moderada"
  });

  const [manualInput, setManualInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);

  const accentColor = "#1dd1a1";

  // Load data
  useEffect(() => {
    const loadData = async () => {
      // Local first
      const savedPlan = localStorage.getItem('nutritionalPlan');
      const savedFoods = localStorage.getItem('dailyFoods');
      
      if (savedPlan) setNutritionalPlan(JSON.parse(savedPlan));
      else setShowOnboarding(true);

      if (savedFoods) {
        const foods = JSON.parse(savedFoods);
        // Reset daily foods if it's a new day
        const today = new Date().toDateString();
        const filtered = foods.filter(f => new Date(f.id).toDateString() === today);
        setDailyFoods(filtered);
      }

      // Sync from Firebase if auth
      if (authUser) {
        try {
          const cloudData = await getFromCloud(`users/${authUser.uid}/nutrition`);
          if (cloudData) {
            if (cloudData.plan) {
              setNutritionalPlan(cloudData.plan);
              localStorage.setItem('nutritionalPlan', JSON.stringify(cloudData.plan));
              setShowOnboarding(false);
            }
            if (cloudData.dailyFoods) {
              const today = new Date().toDateString();
              const filtered = cloudData.dailyFoods.filter(f => new Date(f.id).toDateString() === today);
              setDailyFoods(filtered);
            }
          }
        } catch (e) {
          console.error("Error loading nutrition from cloud", e);
        }
      }
    };
    loadData();
  }, [authUser]);

  // Persist data
  useEffect(() => {
    if (nutritionalPlan) {
      localStorage.setItem('nutritionalPlan', JSON.stringify(nutritionalPlan));
      if (authUser) saveToCloud(`users/${authUser.uid}/nutrition`, { plan: nutritionalPlan, dailyFoods });
    }
  }, [nutritionalPlan, dailyFoods, authUser]);

  const calculatePlan = () => {
    // Basic Harris-Benedict Equation simulation
    const { weight, height, age, goal, activity } = planForm;
    let bmr = 10 * weight + 6.25 * height - 5 * age + (planForm.sex === "hombre" ? 5 : -161);
    
    const multipliers = { sedentarismo: 1.2, ligera: 1.375, moderada: 1.55, intensa: 1.725 };
    let maintenance = bmr * multipliers[activity];
    
    let targetCals = maintenance;
    if (goal === "perder grasa") targetCals -= 500;
    if (goal === "ganar músculo") targetCals += 300;

    const plan = {
      calories: Math.round(targetCals),
      protein: Math.round(weight * 2), // 2g per kg
      fats: Math.round((targetCals * 0.25) / 9), // 25% cals
      carbs: Math.round((targetCals - (weight * 2 * 4) - ((targetCals * 0.25))) / 4),
      details: planForm
    };

    setNutritionalPlan(plan);
    setShowOnboarding(false);
  };

  const handleManualAdd = () => {
    if (!manualInput.trim()) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    
    setTimeout(() => {
      // Improved mock analysis of text
      const input = manualInput.toLowerCase();
      let items = [];
      let feedback = "Análisis completado a partir de tu descripción.";

      if (input.includes("pollo")) items.push({ name: "Pechuga de Pollo", quantity: "150g", calories: 250, protein: 45, carbs: 0, fats: 5 });
      if (input.includes("arroz")) items.push({ name: "Arroz integral", quantity: "100g", calories: 110, protein: 3, carbs: 23, fats: 1 });
      if (input.includes("huevo")) items.push({ name: "Huevo cocido", quantity: "2 unidades", calories: 140, protein: 12, carbs: 1, fats: 10 });
      if (input.includes("ensalada")) items.push({ name: "Ensalada verde", quantity: "1 bol", calories: 45, protein: 2, carbs: 8, fats: 0.5 });
      
      if (items.length === 0) {
        items.push({ name: manualInput, quantity: "1 ración", calories: 200, protein: 10, carbs: 20, fats: 5 });
        feedback = "He estimado los valores para esta comida. Intenta ser más específico para mayor precisión.";
      }

      setAnalysisResult({ items, feedback });
      setIsAnalyzing(false);
      setActiveTab("photo"); // Redirect to the analysis view
    }, 1500);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPhotoPreview(URL.createObjectURL(file));
    setIsAnalyzing(true);
    setAnalysisResult(null);

    setTimeout(() => {
      // Simulation: recognizing multiple items in a photo
      const scenarios = [
        {
          items: [
            { name: "Pechuga de Pollo", quantity: "200g", calories: 330, protein: 62, carbs: 0, fats: 7 },
            { name: "Arroz Blanco", quantity: "150g", calories: 195, protein: 4, carbs: 42, fats: 0.5 },
            { name: "Brócoli", quantity: "100g", calories: 34, protein: 3, carbs: 7, fats: 0.4 }
          ],
          feedback: "Plato equilibrado. Buena cantidad de proteína y carbohidratos complejos."
        },
        {
          items: [
            { name: "Salmón a la plancha", quantity: "180g", calories: 370, protein: 36, carbs: 0, fats: 24 },
            { name: "Patata cocida", quantity: "200g", calories: 170, protein: 4, carbs: 38, fats: 0.2 },
            { name: "Ensalada mixta", quantity: "1 ración", calories: 50, protein: 2, carbs: 8, fats: 1 }
          ],
          feedback: "Excelente aporte de grasas saludables (Omega-3)."
        },
        {
          items: [
            { name: "Pasta Boloñesa", quantity: "300g", calories: 550, protein: 25, carbs: 75, fats: 18 },
            { name: "Queso Parmesano", quantity: "20g", calories: 80, protein: 7, carbs: 0, fats: 6 }
          ],
          feedback: "Comida densa en energía. Ideal si tienes un entrenamiento intenso hoy."
        }
      ];
      
      const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
      setAnalysisResult(scenario);
      setIsAnalyzing(false);
    }, 2500);
  };

  const confirmAnalysis = () => {
    if (!analysisResult) return;
    
    const combinedFood = analysisResult.items.reduce((acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fats: acc.fats + item.fats,
      name: acc.name ? acc.name + " + " + item.name : item.name
    }), { calories: 0, protein: 0, carbs: 0, fats: 0, name: "" });

    setDailyFoods([...dailyFoods, { ...combinedFood, feedback: analysisResult.feedback, id: Date.now() }]);
    setAnalysisResult(null);
    setPhotoPreview(null);
    setActiveTab("daily");
  };

  const totals = dailyFoods.reduce((acc, food) => ({
    calories: acc.calories + (food.calories || 0),
    protein: acc.protein + (food.protein || 0),
    carbs: acc.carbs + (food.carbs || 0),
    fats: acc.fats + (food.fats || 0),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  const cardStyle = {
    backgroundColor: isDark ? "#1a1a1a" : "#fff",
    borderRadius: "15px",
    padding: "20px",
    marginBottom: "20px",
    border: `1px solid ${isDark ? "#333" : "#eee"}`,
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
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

  const buttonStyle = {
    backgroundColor: accentColor,
    color: "#000",
    border: "none",
    padding: "12px 20px",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "1rem",
    width: "100%",
    transition: "transform 0.1s"
  };

  const ProgressBar = ({ label, current, target, color }) => {
    const percentage = Math.min((current / target) * 100, 100);
    return (
      <div style={{ marginBottom: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "4px" }}>
          <span>{label}</span>
          <span>{current} / {target}{label === "Calorías" ? " kcal" : "g"}</span>
        </div>
        <div style={{ width: "100%", height: "8px", backgroundColor: isDark ? "#333" : "#eee", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ width: `${percentage}%`, height: "100%", backgroundColor: color, transition: "width 0.5s ease" }} />
        </div>
      </div>
    );
  };

  if (showOnboarding) {
    return (
      <Layout>
        <div style={{ maxWidth: "500px", margin: "40px auto", padding: "20px" }}>
          <div style={cardStyle}>
            <h2 style={{ textAlign: "center", color: accentColor }}>Tu Plan Nutricional</h2>
            <p style={{ textAlign: "center", marginBottom: "20px" }}>Completa tus datos para que la IA diseñe tu dieta personalizada.</p>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <input type="number" placeholder="Edad" style={inputStyle} value={planForm.age} onChange={e => setPlanForm({...planForm, age: e.target.value})} />
              <select style={inputStyle} value={planForm.sex} onChange={e => setPlanForm({...planForm, sex: e.target.value})}>
                <option value="">Sexo</option>
                <option value="hombre">Hombre</option>
                <option value="mujer">Mujer</option>
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <input type="number" placeholder="Altura (cm)" style={inputStyle} value={planForm.height} onChange={e => setPlanForm({...planForm, height: e.target.value})} />
              <input type="number" placeholder="Peso (kg)" style={inputStyle} value={planForm.weight} onChange={e => setPlanForm({...planForm, weight: e.target.value})} />
            </div>
            
            <label style={{ fontSize: "0.85rem", color: "#888" }}>Objetivo</label>
            <select style={inputStyle} value={planForm.goal} onChange={e => setPlanForm({...planForm, goal: e.target.value})}>
              <option value="perder grasa">Perder Grasa</option>
              <option value="mantenimiento">Mantenimiento</option>
              <option value="ganar músculo">Ganar Músculo</option>
            </select>

            <label style={{ fontSize: "0.85rem", color: "#888" }}>Actividad Física</label>
            <select style={inputStyle} value={planForm.activity} onChange={e => setPlanForm({...planForm, activity: e.target.value})}>
              <option value="sedentarismo">Sedentario</option>
              <option value="ligera">Actividad Ligera (1-2 días)</option>
              <option value="moderada">Moderada (3-5 días)</option>
              <option value="intensa">Intensa (6-7 días)</option>
            </select>

            <button style={buttonStyle} onClick={calculatePlan}>Generar Plan Nutricional</button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: isMobile ? "10px" : "20px", color: isDark ? "#fff" : "#333" }}>
        <h1 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "2rem" }}>🍎</span> Alimentación Inteligente
        </h1>

        {/* Nutritional Plan Summary */}
        {nutritionalPlan && (
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "15px" }}>
              <h3 style={{ margin: 0 }}>Objetivo Diario</h3>
              <button 
                onClick={() => {
                  setPlanForm(nutritionalPlan.details || planForm);
                  setShowOnboarding(true);
                }}
                style={{ background: "none", border: "none", color: accentColor, cursor: "pointer", fontWeight: "bold" }}
              >
                Editar Plan
              </button>
            </div>
            
            <ProgressBar label="Calorías" current={totals.calories} target={nutritionalPlan.calories} color={totals.calories > nutritionalPlan.calories ? "#ff4d4d" : accentColor} />
            
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: "15px", marginTop: "20px" }}>
              <ProgressBar label="Proteínas" current={totals.protein} target={nutritionalPlan.protein} color="#4d94ff" />
              <ProgressBar label="Carbos" current={totals.carbs} target={nutritionalPlan.carbs} color="#ffb347" />
              <ProgressBar label="Grasas" current={totals.fats} target={nutritionalPlan.fats} color="#ff4d4d" />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px", overflowX: "auto", paddingBottom: "5px" }}>
          {[
            { id: "daily", label: "Mi Día", icon: "📋" },
            { id: "manual", label: "Añadir", icon: "✍️" },
            { id: "photo", label: "Analizar Foto", icon: "📸" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "10px 20px",
                borderRadius: "20px",
                border: "none",
                backgroundColor: activeTab === tab.id ? accentColor : (isDark ? "#333" : "#e0e0e0"),
                color: activeTab === tab.id ? "#000" : (isDark ? "#fff" : "#333"),
                cursor: "pointer",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flex: 1,
                minWidth: "max-content"
              }}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "daily" && (
          <div>
            {dailyFoods.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: "center", color: "#888", padding: "40px" }}>
                <div style={{ fontSize: "3rem", marginBottom: "10px" }}>🍽️</div>
                No has registrado nada todavía. ¡Empieza añadiendo tu primera comida!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {dailyFoods.map(food => (
                  <div key={food.id} style={{ ...cardStyle, marginBottom: 0, padding: "15px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{food.name}</div>
                        <div style={{ color: "#888", fontSize: "0.9rem", marginTop: "4px" }}>
                          {food.calories} kcal • P: {food.protein}g C: {food.carbs}g G: {food.fats}g
                        </div>
                        {food.feedback && (
                          <div style={{ fontSize: "0.85rem", color: accentColor, marginTop: "8px", borderTop: `1px solid ${isDark ? "#222" : "#eee"}`, paddingTop: "8px" }}>
                            {food.feedback}
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => setDailyFoods(dailyFoods.filter(f => f.id !== food.id))}
                        style={{ background: "#ff4d4d22", border: "none", color: "#ff4d4d", padding: "8px", borderRadius: "8px", cursor: "pointer" }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "manual" && (
          <div style={cardStyle}>
            <h3>Registro Manual</h3>
            <p style={{ fontSize: "0.9rem", color: "#888", marginBottom: "20px" }}>Escribe lo que has comido. La IA reconocerá los alimentos.</p>
            <input 
              placeholder="Ej: 150g de pechuga de pollo y 200g de arroz" 
              style={inputStyle} 
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              onKeyPress={e => e.key === "Enter" && handleManualAdd()}
            />
            <button onClick={handleManualAdd} disabled={isAnalyzing} style={{ ...buttonStyle, opacity: isAnalyzing ? 0.7 : 1 }}>
              {isAnalyzing ? "Identificando alimentos..." : "Añadir al registro"}
            </button>
          </div>
        )}

        {activeTab === "photo" && (
          <div style={{ ...cardStyle, textAlign: "center" }}>
            {!analysisResult && !isAnalyzing ? (
              <>
                <h3>Escáner de Comida</h3>
                <p style={{ fontSize: "0.9rem", color: "#888", marginBottom: "20px" }}>Nuestra IA analizará los ingredientes de tu plato.</p>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "15px", alignItems: "center" }}>
                  <label style={{ ...buttonStyle, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", cursor: "pointer", width: "100%", padding: "15px" }}>
                    <span style={{ fontSize: "1.2rem" }}>📸</span> 
                    {isMobile ? "Hacer Foto al Plato" : "Subir Foto del Plato"}
                    <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handlePhotoUpload} />
                  </label>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
                    <div style={{ flex: 1, height: "1px", backgroundColor: isDark ? "#333" : "#eee" }} />
                    <span style={{ fontSize: "0.8rem", color: "#888" }}>o selecciona de la galería</span>
                    <div style={{ flex: 1, height: "1px", backgroundColor: isDark ? "#333" : "#eee" }} />
                  </div>

                  <label style={{ ...buttonStyle, backgroundColor: "transparent", border: `2px solid ${accentColor}`, color: accentColor, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", cursor: "pointer", width: "100%", padding: "12px" }}>
                    <span style={{ fontSize: "1.2rem" }}>🖼️</span> 
                    Abrir Galería
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />
                  </label>
                </div>
              </>
            ) : isAnalyzing ? (
              <div style={{ marginTop: "10px" }}>
                {photoPreview && <img src={photoPreview} alt="Preview" style={{ maxWidth: "100%", borderRadius: "10px", marginBottom: "15px", maxHeight: "300px", objectFit: "cover" }} />}
                <div style={{ color: accentColor, fontWeight: "bold", fontSize: "1.1rem" }}>
                  La IA está analizando tu plato...
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                  <h3 style={{ margin: 0 }}>Análisis de la IA</h3>
                  <button onClick={() => {setAnalysisResult(null); setPhotoPreview(null);}} style={{ background: "none", border: "none", color: "#ff4d4d", cursor: "pointer", fontWeight: "bold" }}>Cancelar</button>
                </div>

                {photoPreview && <img src={photoPreview} alt="Preview" style={{ width: "100%", borderRadius: "10px", marginBottom: "20px", maxHeight: "200px", objectFit: "cover" }} />}

                <div style={{ backgroundColor: isDark ? "#000" : "#f9f9f9", padding: "15px", borderRadius: "10px", marginBottom: "20px" }}>
                  <h4 style={{ margin: "0 0 10px 0", color: accentColor }}>Alimentos Detectados:</h4>
                  {analysisResult.items.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: idx === analysisResult.items.length - 1 ? "none" : `1px solid ${isDark ? "#222" : "#eee"}` }}>
                      <span>{item.name} <span style={{ color: "#888", fontSize: "0.85rem" }}>({item.quantity})</span></span>
                      <span style={{ fontWeight: "bold" }}>{item.calories} kcal</span>
                    </div>
                  ))}
                </div>

                <div style={{ backgroundColor: `${accentColor}11`, padding: "15px", borderRadius: "10px", borderLeft: `4px solid ${accentColor}`, marginBottom: "20px" }}>
                  <strong>Consejo Nutricional:</strong> {analysisResult.feedback}
                </div>

                <button onClick={confirmAnalysis} style={buttonStyle}>
                  Confirmar y Añadir a Mi Día
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
