import { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { saveToCloud, getFromCloud } from "../lib/firebase";
import { foodList } from "../data/foodList";

/**
 * Redimensiona/comprime la foto en el cliente antes de mandarla a /api/analyze-food: reduce el
 * coste de la llamada a la IA (menos tokens de imagen) y evita chocar con el límite de payload
 * de las funciones serverless de Vercel, que una foto de móvil sin comprimir supera fácilmente.
 */
function resizeImageForUpload(file, maxDim = 1024, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function Food() {
  const { theme, isMobile, authUser, showNotification } = useUser();
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
  const [selectedFood, setSelectedFood] = useState(null);
  const [foodGrams, setFoodGrams] = useState(100);
  const [recentFoods, setRecentFoods] = useState([]);
  const [barcodes, setBarcodes] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState("");

  const accentColor = "#1dd1a1";

  // Load data
  useEffect(() => {
    const loadData = async () => {
      // Local first
      const savedPlan = localStorage.getItem('nutritionalPlan');
      const savedFoods = localStorage.getItem('dailyFoods');
      const savedRecents = localStorage.getItem('recentFoods');
      const savedBarcodes = localStorage.getItem('savedBarcodes');
      
      if (savedPlan) setNutritionalPlan(JSON.parse(savedPlan));
      else setShowOnboarding(true);

      if (savedRecents) setRecentFoods(JSON.parse(savedRecents));
      if (savedBarcodes) setBarcodes(JSON.parse(savedBarcodes));

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
            if (cloudData.recentFoods) setRecentFoods(cloudData.recentFoods);
            if (cloudData.barcodes) setBarcodes(cloudData.barcodes);
          }
        } catch (e) {
          console.error("Error loading nutrition from cloud", e);
        }
      }
    };
    loadData();
  }, [authUser]);

  useEffect(() => {
    if (nutritionalPlan) {
      localStorage.setItem('nutritionalPlan', JSON.stringify(nutritionalPlan));
      localStorage.setItem('recentFoods', JSON.stringify(recentFoods));
      localStorage.setItem('savedBarcodes', JSON.stringify(barcodes));
      localStorage.setItem('dailyFoods', JSON.stringify(dailyFoods));
      
      if (authUser) {
        saveToCloud(`users/${authUser.uid}/nutrition`, { 
          plan: nutritionalPlan, 
          dailyFoods,
          recentFoods,
          barcodes
        });
      }
    }
  }, [nutritionalPlan, dailyFoods, recentFoods, barcodes, authUser]);

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

  const updateRecents = (food) => {
    // food object should have name and base macros
    const newRecents = [food, ...recentFoods.filter(f => f.name !== food.name)].slice(0, 5);
    setRecentFoods(newRecents);
  };

  const handleManualAdd = () => {
    if (!selectedFood) return;
    setIsAnalyzing(true);
    
    setTimeout(() => {
      // Logic to calculate macros based on food type and weight
      const food = selectedFood.toLowerCase();
      const grams = foodGrams;
      const ratio = grams / 100;

      // Mock database of calories per 100g
      let baseMacros = { cals: 150, p: 10, c: 20, f: 5 }; // default

      if (food.includes("pollo")) baseMacros = { cals: 165, p: 31, c: 0, f: 3.6 };
      else if (food.includes("arroz") || food.includes("pasta") || food.includes("avena")) baseMacros = { cals: 350, p: 7, c: 70, f: 2 };
      else if (food.includes("ternera") || food.includes("cerdo")) baseMacros = { cals: 250, p: 26, c: 0, f: 15 };
      else if (food.includes("manzana") || food.includes("pera") || food.includes("naranja") || food.includes("plátano")) baseMacros = { cals: 52, p: 0.3, c: 14, f: 0.2 };
      else if (food.includes("nuez") || food.includes("almendra")) baseMacros = { cals: 600, p: 20, c: 10, f: 50 };
      else if (food.includes("aceite")) baseMacros = { cals: 884, p: 0, c: 0, f: 100 };
      else if (food.includes("huevo")) baseMacros = { cals: 155, p: 13, c: 1.1, f: 11 };
      else if (food.includes("pan")) baseMacros = { cals: 265, p: 9, c: 49, f: 3.2 };
      else if (food.includes("leche") || food.includes("yogur")) baseMacros = { cals: 60, p: 3.3, c: 4.8, f: 3.2 };

      const newFood = {
        name: selectedFood,
        fullName: `${selectedFood} (${grams}g)`,
        calories: Math.round(baseMacros.cals * ratio),
        protein: Math.round(baseMacros.p * ratio),
        carbs: Math.round(baseMacros.c * ratio),
        fats: Math.round(baseMacros.f * ratio),
        id: Date.now(),
        grams
      };
      
      setDailyFoods([...dailyFoods, { ...newFood, name: newFood.fullName }]);
      updateRecents({ name: selectedFood, baseMacros });
      setManualInput("");
      setSelectedFood(null);
      setFoodGrams(100);
      setIsAnalyzing(false);
      setActiveTab("daily");
    }, 800);
  };

  const handleBarcodeScan = async () => {
    const code = barcodeInput.trim();
    if (!code) return;
    setIsAnalyzing(true);

    try {
      // Open Food Facts: base de datos pública y sin API key de productos reales por código
      // de barras — sustituye a la lista de 5 códigos hardcodeados que había antes.
      const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`);
      const data = await response.json();

      if (data.status !== 1 || !data.product) {
        showNotification("Producto no encontrado en Open Food Facts.", "error");
        return;
      }

      const p = data.product;
      const n = p.nutriments || {};
      const gradeToRating = { a: 10, b: 8, c: 6, d: 4, e: 2 };
      const rating = gradeToRating[p.nutriscore_grade] ?? 5;

      const found = {
        code,
        name: p.product_name || "Producto sin nombre",
        calories: Math.round(n["energy-kcal_100g"] || 0),
        protein: Math.round(n.proteins_100g || 0),
        carbs: Math.round(n.carbohydrates_100g || 0),
        fats: Math.round(n.fat_100g || 0),
        rating,
      };

      if (!barcodes.find(b => b.code === found.code)) {
        setBarcodes([...barcodes, found]);
      }

      setAnalysisResult({
        items: [{ ...found, quantity: "100g" }],
        feedback: `Calificación Nutricional: ${found.rating}/10. ${found.rating > 7 ? "Excelente opción!" : found.rating > 4 ? "Consumo moderado recomendado." : "Evitar si es posible."}`,
        isBarcode: true
      });
      setActiveTab("photo");
    } catch (error) {
      console.error("Error consultando Open Food Facts:", error);
      showNotification("No se pudo consultar el producto. Comprueba tu conexión.", "error");
    } finally {
      setIsAnalyzing(false);
      setBarcodeInput("");
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";

    setPhotoPreview(URL.createObjectURL(file));
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const resizedImage = await resizeImageForUpload(file);
      const auth = getAuth();
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : "";

      const response = await fetch("/api/analyze-food", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ image: resizedImage }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error analizando la foto");

      setAnalysisResult(data);
    } catch (error) {
      console.error("Error analizando la foto:", error);
      showNotification("No se pudo analizar la foto. Inténtalo de nuevo.", "error");
      setPhotoPreview(null);
    } finally {
      setIsAnalyzing(false);
    }
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
            { id: "barcode", label: "Scanner", icon: "🏷️" },
            { id: "photo", label: "IA Foto", icon: "📸" }
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
          <div>
            {recentFoods.length > 0 && (
              <div style={{ ...cardStyle, padding: "15px" }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "0.9rem", color: "#888" }}>Recientes</h4>
                <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "5px" }}>
                  {recentFoods.map((food, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedFood(food.name);
                        setManualInput(food.name);
                      }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "15px",
                        border: `1px solid ${isDark ? "#333" : "#eee"}`,
                        backgroundColor: isDark ? "#222" : "#f5f5f5",
                        color: isDark ? "#fff" : "#333",
                        whiteSpace: "nowrap",
                        fontSize: "0.85rem",
                        cursor: "pointer"
                      }}
                    >
                      {food.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={cardStyle}>
              <h3>Añadir Alimento</h3>
              <p style={{ fontSize: "0.9rem", color: "#888", marginBottom: "20px" }}>Selecciona un alimento de la lista y su peso en gramos.</p>
              
              <div style={{ position: "relative", marginBottom: "15px" }}>
                <input 
                  placeholder="Buscar alimento... (ej: Pollo, Arroz)" 
                  style={inputStyle} 
                  value={manualInput}
                  onChange={e => {
                    setManualInput(e.target.value);
                    if (selectedFood) setSelectedFood(null);
                  }}
                />
                {manualInput && !selectedFood && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    backgroundColor: isDark ? "#222" : "#fff",
                    border: `1px solid ${isDark ? "#444" : "#ccc"}`,
                    borderRadius: "8px",
                    zIndex: 10,
                    maxHeight: "200px",
                    overflowY: "auto",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
                  }}>
                    {foodList
                      .filter(f => f.toLowerCase().includes(manualInput.toLowerCase()))
                      .map((food, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => {
                            setSelectedFood(food);
                            setManualInput(food);
                          }}
                          style={{
                            padding: "12px",
                            cursor: "pointer",
                            borderBottom: idx === foodList.length - 1 ? "none" : `1px solid ${isDark ? "#333" : "#eee"}`,
                            color: isDark ? "#fff" : "#333",
                            backgroundColor: "transparent"
                          }}
                          onMouseOver={e => e.currentTarget.style.backgroundColor = isDark ? "#333" : "#f5f5f5"}
                          onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
                        >
                          {food}
                        </div>
                      ))
                    }
                    {foodList.filter(f => f.toLowerCase().includes(manualInput.toLowerCase())).length === 0 && (
                      <div style={{ padding: "12px", color: "#888", textAlign: "center" }}>No se encontraron resultados</div>
                    )}
                  </div>
                )}
              </div>

              {selectedFood && (
                <div style={{ 
                  backgroundColor: isDark ? "#000" : "#f9f9f9", 
                  padding: "15px", 
                  borderRadius: "10px", 
                  marginBottom: "15px",
                  border: `1px solid ${accentColor}44`
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ fontWeight: "bold" }}>Cantidad (gramos)</span>
                    <span style={{ color: accentColor, fontWeight: "bold" }}>{foodGrams}g</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="1000" 
                    step="5"
                    value={foodGrams}
                    onChange={e => setFoodGrams(parseInt(e.target.value))}
                    style={{ width: "100%", accentColor: accentColor, cursor: "pointer" }}
                  />
                  <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                    {[50, 100, 150, 200, 250].map(val => (
                      <button 
                        key={val}
                        onClick={() => setFoodGrams(val)}
                        style={{
                          flex: 1,
                          padding: "5px",
                          borderRadius: "5px",
                          border: `1px solid ${foodGrams === val ? accentColor : (isDark ? "#444" : "#ccc")}`,
                          backgroundColor: foodGrams === val ? `${accentColor}22` : "transparent",
                          color: foodGrams === val ? accentColor : (isDark ? "#fff" : "#333"),
                          fontSize: "0.8rem",
                          cursor: "pointer"
                        }}
                      >
                        {val}g
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button 
                onClick={handleManualAdd} 
                disabled={!selectedFood || isAnalyzing} 
                style={{ ...buttonStyle, opacity: (!selectedFood || isAnalyzing) ? 0.5 : 1 }}
              >
                {isAnalyzing ? "Analizando..." : "Añadir a mi registro"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "barcode" && (
          <div>
            <div style={cardStyle}>
              <h3>Escanear Código de Barras</h3>
              <p style={{ fontSize: "0.9rem", color: "#888", marginBottom: "20px" }}>Introduce el código de barras del producto para obtener su info nutricional.</p>
              <div style={{ display: "flex", gap: "10px" }}>
                <input 
                  placeholder="Ej: 8412345678901" 
                  style={{ ...inputStyle, marginBottom: 0 }} 
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  onKeyPress={e => e.key === "Enter" && handleBarcodeScan()}
                />
                <button onClick={handleBarcodeScan} style={{ ...buttonStyle, width: "auto" }}>🔍</button>
              </div>
            </div>

            {barcodes.length > 0 && (
              <div style={cardStyle}>
                <h4 style={{ margin: "0 0 15px 0" }}>Productos Guardados</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {barcodes.map((item, i) => (
                    <div 
                      key={i} 
                      onClick={() => {
                        setAnalysisResult({ 
                          items: [{ ...item, quantity: "1 unidad/pack" }], 
                          feedback: `Calificación Nutricional: ${item.rating}/10.`,
                          isBarcode: true
                        });
                        setActiveTab("photo");
                      }}
                      style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center",
                        padding: "10px",
                        backgroundColor: isDark ? "#000" : "#f9f9f9",
                        borderRadius: "8px",
                        cursor: "pointer"
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: "bold", fontSize: "0.9rem" }}>{item.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "#888" }}>{item.code}</div>
                      </div>
                      <div style={{ 
                        backgroundColor: item.rating > 7 ? "#1dd1a133" : item.rating > 4 ? "#ffb34733" : "#ff4d4d33",
                        color: item.rating > 7 ? "#1dd1a1" : item.rating > 4 ? "#ffb347" : "#ff4d4d",
                        padding: "4px 8px",
                        borderRadius: "10px",
                        fontSize: "0.8rem",
                        fontWeight: "bold"
                      }}>
                        {item.rating}/10
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

                {analysisResult.items.length > 0 && (
                  <div style={{ backgroundColor: isDark ? "#000" : "#f9f9f9", padding: "15px", borderRadius: "10px", marginBottom: "20px" }}>
                    <h4 style={{ margin: "0 0 10px 0", color: accentColor }}>Alimentos Detectados:</h4>
                    {analysisResult.items.map((item, idx) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: idx === analysisResult.items.length - 1 ? "none" : `1px solid ${isDark ? "#222" : "#eee"}` }}>
                        <span>{item.name} <span style={{ color: "#888", fontSize: "0.85rem" }}>({item.quantity})</span></span>
                        <span style={{ fontWeight: "bold" }}>{item.calories} kcal</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ backgroundColor: `${accentColor}11`, padding: "15px", borderRadius: "10px", borderLeft: `4px solid ${accentColor}`, marginBottom: "20px" }}>
                  <strong>Consejo Nutricional:</strong> {analysisResult.feedback}
                </div>

                {analysisResult.items.length > 0 && (
                  <button onClick={confirmAnalysis} style={buttonStyle}>
                    Confirmar y Añadir a Mi Día
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
