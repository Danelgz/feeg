import { useState, useRef, useEffect } from "react";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { exercisesList } from "../data/exercises";

export default function IA() {
  const { theme, isMobile, t } = useUser();
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState("training"); // training, chat, technique
  
  // States for Training Generator
  const [showTrainingForm, setShowTrainingForm] = useState(false);
  const [trainingData, setTrainingData] = useState({
    age: "", sex: "", height: "", weight: "", goal: "", level: "", days: "", time: "", material: "", injuries: "", preferences: ""
  });
  const [generatedRoutine, setGeneratedRoutine] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // States for Chat
  const [messages, setMessages] = useState([
    { role: "assistant", content: "¡Hola! Soy tu coach virtual FEEG. ¿En qué puedo ayudarte hoy? Puedes preguntarme sobre entrenamientos, nutrición o técnica." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef(null);

  // States for Technique
  const [techniqueSearch, setTechniqueSearch] = useState("");
  const [techniqueResult, setTechniqueResult] = useState(null);

  const accentColor = "#1dd1a1";

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleGenerateTraining = () => {
    setIsGenerating(true);
    // Simulation of AI generation
    setTimeout(() => {
      setGeneratedRoutine({
        title: `Plan Personalizado: ${trainingData.goal}`,
        summary: `Basado en tu nivel ${trainingData.level} y disponibilidad de ${trainingData.days} días, he diseñado un plan enfocado en ${trainingData.goal}.`,
        days: [
          {
            name: "Día 1: Empuje (Pecho/Hombro/Tríceps)",
            exercises: [
              { name: "Press de banca", sets: "3", reps: "8-10", rest: "90s", note: "Baja controlado hasta el pecho." },
              { name: "Press militar", sets: "3", reps: "10-12", rest: "90s", note: "Mantén el core fuerte." },
              { name: "Extensiones tríceps", sets: "3", reps: "12-15", rest: "60s", note: "Codos pegados al cuerpo." }
            ]
          },
          {
            name: "Día 2: Tracción (Espalda/Bíceps)",
            exercises: [
              { name: "Dominadas o Jalón", sets: "3", reps: "Fallo-2", rest: "120s", note: "Tracciona con los codos." },
              { name: "Remo con barra", sets: "3", reps: "10", rest: "90s", note: "Espalda recta, saca pecho." },
              { name: "Curl de bíceps", sets: "3", reps: "12", rest: "60s", note: "Sin balanceo." }
            ]
          }
        ],
        advice: "Recuerda hidratarte bien y dormir al menos 7-8 horas para recuperar."
      });
      setIsGenerating(false);
      setShowTrainingForm(false);
    }, 2000);
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const newMsg = { role: "user", content: chatInput };
    setMessages([...messages, newMsg]);
    setChatInput("");

    // Simulated AI response
    setTimeout(() => {
      let response = "Esa es una buena pregunta. Como tu coach, te recomiendo que te enfoques en la sobrecarga progresiva y una buena técnica.";
      if (chatInput.toLowerCase().includes("hambre")) response = "Si tienes mucha hambre, intenta priorizar proteínas y fibra en tus comidas.";
      if (chatInput.toLowerCase().includes("duele")) response = "Si sientes dolor (no molestia muscular), lo mejor es descansar esa zona y consultar con un profesional si persiste.";
      
      setMessages(prev => [...prev, { role: "assistant", content: response }]);
    }, 1000);
  };

  const handleSearchTechnique = () => {
    const search = techniqueSearch.toLowerCase();
    // Simulate finding technique info
    setTechniqueResult({
      name: techniqueSearch,
      position: "Mantén una postura erguida, pies a la anchura de los hombros y mirada al frente.",
      errors: "Evita curvar la espalda y hacer movimientos bruscos o rebotes.",
      muscles: "Involucra principalmente el grupo muscular trabajado y estabilizadores del core.",
      tips: trainingData.level === "principiante" ? "Usa poco peso para masterizar el movimiento." : "Enfócate en la conexión mente-músculo."
    });
  };

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
    width: "100%"
  };

  return (
    <Layout>
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: isMobile ? "10px" : "20px", color: isDark ? "#fff" : "#333" }}>
        <h1 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "2rem" }}>🤖</span> Apartado IA - Coach FEEG
        </h1>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px", overflowX: "auto", paddingBottom: "10px" }}>
          {[
            { id: "training", label: "Entrenamiento", icon: "🏋️‍♂️" },
            { id: "chat", label: "Chat Coach", icon: "🗣️" },
            { id: "technique", label: "Técnica", icon: "🎥" }
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
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s"
              }}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* Training Generator Content */}
        {activeTab === "training" && (
          <div>
            {!showTrainingForm && !generatedRoutine && (
              <div style={{ ...cardStyle, textAlign: "center" }}>
                <h3>¿Necesitas un plan a tu medida?</h3>
                <p>Nuestra IA analizará tus datos para crear la rutina perfecta para ti.</p>
                <button onClick={() => setShowTrainingForm(true)} style={buttonStyle}>
                  Crear entrenamiento personalizado
                </button>
              </div>
            )}

            {showTrainingForm && (
              <div style={cardStyle}>
                <h3>Cuéntame sobre ti</h3>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "10px" }}>
                  <input placeholder="Edad" type="number" style={inputStyle} value={trainingData.age} onChange={e => setTrainingData({...trainingData, age: e.target.value})} />
                  <select style={inputStyle} value={trainingData.sex} onChange={e => setTrainingData({...trainingData, sex: e.target.value})}>
                    <option value="">Sexo</option>
                    <option value="hombre">Hombre</option>
                    <option value="mujer">Mujer</option>
                  </select>
                  <input placeholder="Altura (cm)" type="number" style={inputStyle} value={trainingData.height} onChange={e => setTrainingData({...trainingData, height: e.target.value})} />
                  <input placeholder="Peso (kg)" type="number" style={inputStyle} value={trainingData.weight} onChange={e => setTrainingData({...trainingData, weight: e.target.value})} />
                </div>
                <select style={inputStyle} value={trainingData.goal} onChange={e => setTrainingData({...trainingData, goal: e.target.value})}>
                  <option value="">Objetivo</option>
                  <option value="perder grasa">Perder grasa</option>
                  <option value="ganar músculo">Ganar músculo</option>
                  <option value="fuerza">Fuerza</option>
                  <option value="mantenimiento">Mantenimiento</option>
                </select>
                <select style={inputStyle} value={trainingData.level} onChange={e => setTrainingData({...trainingData, level: e.target.value})}>
                  <option value="">Nivel</option>
                  <option value="principiante">Principiante</option>
                  <option value="intermedio">Intermedio</option>
                  <option value="avanzado">Avanzado</option>
                </select>
                <input placeholder="Días disponibles" type="number" style={inputStyle} value={trainingData.days} onChange={e => setTrainingData({...trainingData, days: e.target.value})} />
                <input placeholder="Material (gym, casa, mancuernas...)" style={inputStyle} value={trainingData.material} onChange={e => setTrainingData({...trainingData, material: e.target.value})} />
                <textarea placeholder="Lesiones o preferencias..." style={{ ...inputStyle, minHeight: "80px" }} value={trainingData.preferences} onChange={e => setTrainingData({...trainingData, preferences: e.target.value})} />
                
                <button onClick={handleGenerateTraining} disabled={isGenerating} style={{ ...buttonStyle, opacity: isGenerating ? 0.7 : 1 }}>
                  {isGenerating ? "Generando plan..." : "Generar mi Plan"}
                </button>
              </div>
            )}

            {generatedRoutine && (
              <div style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <h2 style={{ color: accentColor, margin: 0 }}>{generatedRoutine.title}</h2>
                  <button onClick={() => setGeneratedRoutine(null)} style={{ background: "none", border: "none", color: "#888", cursor: "pointer" }}>Volver a empezar</button>
                </div>
                <p>{generatedRoutine.summary}</p>
                
                {generatedRoutine.days.map((day, idx) => (
                  <div key={idx} style={{ marginBottom: "20px", padding: "15px", backgroundColor: isDark ? "#000" : "#f9f9f9", borderRadius: "10px" }}>
                    <h4 style={{ margin: "0 0 10px 0", color: accentColor }}>{day.name}</h4>
                    {day.exercises.map((ex, i) => (
                      <div key={i} style={{ padding: "8px 0", borderBottom: i === day.exercises.length -1 ? "none" : `1px solid ${isDark ? "#222" : "#eee"}` }}>
                        <div style={{ fontWeight: "bold" }}>{ex.name}</div>
                        <div style={{ fontSize: "0.9rem", color: "#888" }}>{ex.sets} series x {ex.reps} • Descanso: {ex.rest}</div>
                        <div style={{ fontSize: "0.85rem", fontStyle: "italic", marginTop: "4px" }}>💡 {ex.note}</div>
                      </div>
                    ))}
                  </div>
                ))}
                
                <div style={{ backgroundColor: `${accentColor}22`, padding: "15px", borderRadius: "10px", borderLeft: `4px solid ${accentColor}` }}>
                  <strong>Consejo IA:</strong> {generatedRoutine.advice}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chat Coach Content */}
        {activeTab === "chat" && (
          <div style={{ ...cardStyle, display: "flex", flexDirection: "column", height: "60vh" }}>
            <div style={{ flex: 1, overflowY: "auto", padding: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {messages.map((msg, i) => (
                <div key={i} style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  backgroundColor: msg.role === "user" ? accentColor : (isDark ? "#333" : "#eee"),
                  color: msg.role === "user" ? "#000" : (isDark ? "#fff" : "#333"),
                  padding: "10px 15px",
                  borderRadius: msg.role === "user" ? "15px 15px 0 15px" : "15px 15px 15px 0",
                  maxWidth: "80%",
                  fontSize: "0.95rem"
                }}>
                  {msg.content}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${isDark ? "#333" : "#eee"}` }}>
              <input 
                placeholder="Escribe tu duda..." 
                style={{ ...inputStyle, marginBottom: 0 }} 
                value={chatInput} 
                onChange={e => setChatInput(e.target.value)}
                onKeyPress={e => e.key === "Enter" && handleSendMessage()}
              />
              <button onClick={handleSendMessage} style={{ ...buttonStyle, width: "auto" }}>Enviar</button>
            </div>
          </div>
        )}

        {/* Technique Content */}
        {activeTab === "technique" && (
          <div>
            <div style={cardStyle}>
              <h3>Explorador de Técnica</h3>
              <p>Busca cualquier ejercicio para recibir una explicación detallada.</p>
              <div style={{ display: "flex", gap: "10px" }}>
                <input 
                  placeholder="Ej: Sentadilla, Press Banca..." 
                  style={{ ...inputStyle, marginBottom: 0 }} 
                  value={techniqueSearch}
                  onChange={e => setTechniqueSearch(e.target.value)}
                />
                <button onClick={handleSearchTechnique} style={{ ...buttonStyle, width: "auto" }}>Buscar</button>
              </div>
            </div>

            {techniqueResult && (
              <div style={cardStyle}>
                <h2 style={{ color: accentColor }}>{techniqueResult.name}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  <div>
                    <strong style={{ display: "block", color: accentColor }}>📍 Posición del cuerpo:</strong>
                    <span>{techniqueResult.position}</span>
                  </div>
                  <div>
                    <strong style={{ display: "block", color: "#ff4d4d" }}>❌ Errores comunes:</strong>
                    <span>{techniqueResult.errors}</span>
                  </div>
                  <div>
                    <strong style={{ display: "block", color: "#4d94ff" }}>💪 Músculos implicados:</strong>
                    <span>{techniqueResult.muscles}</span>
                  </div>
                  <div style={{ backgroundColor: isDark ? "#000" : "#f0fdf4", padding: "10px", borderRadius: "8px", border: `1px dashed ${accentColor}` }}>
                    <strong>💡 Tip Pro:</strong> {techniqueResult.tips}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
