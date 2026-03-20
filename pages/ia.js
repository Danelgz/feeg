import { useState, useRef, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { exercisesList } from "../data/exercises";

export default function IA() {
  const { theme, isMobile, t, user, authUser, saveRoutine } = useUser();
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
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const chatEndRef = useRef(null);

  // Load chat history from Firestore
  useEffect(() => {
    if (!authUser || !authUser.uid) return;

    const q = query(
      collection(db, 'users', authUser.uid, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [authUser]);

  // States for Technique
  const [techniqueSearch, setTechniqueSearch] = useState("");
  const [techniqueResult, setTechniqueResult] = useState(null);

  const accentColor = "#1dd1a1";

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleGenerateTraining = async () => {
    setIsGenerating(true);

    try {
      const idToken = authUser ? await authUser.getIdToken() : "";

      const response = await fetch('/api/generate-routine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ trainingData })
      });

      if (!response.ok) {
        throw new Error('Error generando la rutina');
      }

      const data = await response.json();
      setGeneratedRoutine(data);
      setShowTrainingForm(false);
    } catch (error) {
      console.error("Error al generar rutina:", error);
      alert("Hubo un error al generar tu rutina. Inténtalo de nuevo.");
    } finally {
      setIsGenerating(false);
    }
  };
  // Replaced setTimeout with API call above

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !authUser || !authUser.uid) return;

    const userMessage = chatInput;
    setChatInput("");
    setIsLoadingChat(true);

    try {
      // 1. Guardar pregunta en Firestore
      await addDoc(collection(db, 'users', authUser.uid, 'messages'), {
        role: 'user',
        content: userMessage,
        createdAt: serverTimestamp()
      });

      // 2. Obtener el token de validación del usuario para seguridad
      const idToken = authUser ? await authUser.getIdToken() : "";

      // 3. Preparar el historial (últimos 10 mensajes)
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));

      // 4. Llamar al API seguro de Next.js
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          messages: [...history, { role: 'user', content: userMessage }],
          routine: selectedRoutine,
          userProfile: user // Pasamos el perfil del usuario para contexto dinámico
        })
      });

      const data = await response.json();

      if (response.ok) {
        // 5. Guardar respuesta del asistente en Firestore
        await addDoc(collection(db, 'users', authUser.uid, 'messages'), {
          role: 'assistant',
          content: data.reply,
          createdAt: serverTimestamp()
        });
      } else {
        console.error('Error del servidor:', data.error);
        // Fallback info message
        await addDoc(collection(db, 'users', authUser.uid, 'messages'), {
          role: 'assistant',
          content: "Ha ocurrido un error contactando con mis servidores. Por favor, asegúrate de que mi entorno está bien configurado.",
          createdAt: serverTimestamp()
        });
      }

    } catch (error) {
      console.error('Error enviando mensaje:', error);
    } finally {
      setIsLoadingChat(false);
    }
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
                  <input placeholder="Edad" type="number" style={inputStyle} value={trainingData.age} onChange={e => setTrainingData({ ...trainingData, age: e.target.value })} />
                  <select style={inputStyle} value={trainingData.sex} onChange={e => setTrainingData({ ...trainingData, sex: e.target.value })}>
                    <option value="">Sexo</option>
                    <option value="hombre">Hombre</option>
                    <option value="mujer">Mujer</option>
                  </select>
                  <input placeholder="Altura (cm)" type="number" style={inputStyle} value={trainingData.height} onChange={e => setTrainingData({ ...trainingData, height: e.target.value })} />
                  <input placeholder="Peso (kg)" type="number" style={inputStyle} value={trainingData.weight} onChange={e => setTrainingData({ ...trainingData, weight: e.target.value })} />
                </div>
                <select style={inputStyle} value={trainingData.goal} onChange={e => setTrainingData({ ...trainingData, goal: e.target.value })}>
                  <option value="">Objetivo</option>
                  <option value="perder grasa">Perder grasa</option>
                  <option value="ganar músculo">Ganar músculo</option>
                  <option value="fuerza">Fuerza</option>
                  <option value="mantenimiento">Mantenimiento</option>
                </select>
                <select style={inputStyle} value={trainingData.level} onChange={e => setTrainingData({ ...trainingData, level: e.target.value })}>
                  <option value="">Nivel</option>
                  <option value="principiante">Principiante</option>
                  <option value="intermedio">Intermedio</option>
                  <option value="avanzado">Avanzado</option>
                </select>
                <input placeholder="Días disponibles" type="number" style={inputStyle} value={trainingData.days} onChange={e => setTrainingData({ ...trainingData, days: e.target.value })} />
                <input placeholder="Material (gym, casa, mancuernas...)" style={inputStyle} value={trainingData.material} onChange={e => setTrainingData({ ...trainingData, material: e.target.value })} />
                <textarea placeholder="Lesiones o preferencias..." style={{ ...inputStyle, minHeight: "80px" }} value={trainingData.preferences} onChange={e => setTrainingData({ ...trainingData, preferences: e.target.value })} />

                <button onClick={handleGenerateTraining} disabled={isGenerating} style={{ ...buttonStyle, opacity: isGenerating ? 0.7 : 1 }}>
                  {isGenerating ? "Generando plan..." : "Generar mi Plan"}
                </button>
              </div>
            )}

            {generatedRoutine && (
              <div style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <h2 style={{ color: accentColor, margin: 0 }}>{generatedRoutine.title}</h2>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={async () => {
                        try {
                          await saveRoutine({
                            id: Date.now(),
                            name: generatedRoutine.title,
                            exercises: generatedRoutine.days.flatMap(day =>
                              day.exercises.map(ex => ({
                                name: ex.name,
                                group: "Generado por IA",
                                type: "weight_reps",
                                rest: parseInt(ex.rest) || 90,
                                series: Array.from({ length: parseInt(ex.sets) || 3 }).map(() => ({ reps: parseInt(ex.reps) || 10, weight: 0, type: "N" }))
                              }))
                            )
                          });
                          alert("¡Rutina guardada correctamente!");
                        } catch (err) {
                          console.error("Error guardando rutina", err);
                          alert("Error al guardar rutina");
                        }
                      }}
                      style={{ background: accentColor, border: "none", color: "#000", padding: "6px 12px", borderRadius: "15px", cursor: "pointer", fontWeight: "bold" }}>
                      Guardar
                    </button>
                    <button onClick={() => setGeneratedRoutine(null)} style={{ background: "none", border: "none", color: "#888", cursor: "pointer" }}>Volver</button>
                  </div>
                </div>
                <p>{generatedRoutine.summary}</p>

                {generatedRoutine.days.map((day, idx) => (
                  <div key={idx} style={{ marginBottom: "20px", padding: "15px", backgroundColor: isDark ? "#000" : "#f9f9f9", borderRadius: "10px" }}>
                    <h4 style={{ margin: "0 0 10px 0", color: accentColor }}>{day.name}</h4>
                    {day.exercises.map((ex, i) => (
                      <div key={i} style={{ padding: "8px 0", borderBottom: i === day.exercises.length - 1 ? "none" : `1px solid ${isDark ? "#222" : "#eee"}` }}>
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
            {/* Routine Selectors */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
              {["Piernas", "Pecho", "Espalda", "Full Body", "Core"].map(routine => (
                <button
                  key={routine}
                  onClick={() => setSelectedRoutine(routine === selectedRoutine ? null : routine)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    fontSize: "0.85rem",
                    border: `1px solid ${selectedRoutine === routine ? accentColor : (isDark ? "#444" : "#ccc")}`,
                    backgroundColor: selectedRoutine === routine ? accentColor : "transparent",
                    color: selectedRoutine === routine ? "#000" : (isDark ? "#fff" : "#333"),
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.2s"
                  }}
                >
                  {routine}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: '#888', marginTop: '20px' }}>
                  Aún no hay mensajes. ¡Empieza la conversación!
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={msg.id || i} style={{
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
              {isLoadingChat && (
                <div style={{ alignSelf: "flex-start", backgroundColor: isDark ? "#333" : "#eee", padding: "10px 15px", borderRadius: "15px 15px 15px 0", color: isDark ? "#fff" : "#333" }}>
                  <span style={{ animation: "pulse 1.5s infinite" }}>Escribiendo...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${isDark ? "#333" : "#eee"}` }}>
              <input
                placeholder="Escribe tu duda..."
                style={{ ...inputStyle, marginBottom: 0 }}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyPress={e => e.key === "Enter" && handleSendMessage()}
                disabled={isLoadingChat}
              />
              <button
                onClick={handleSendMessage}
                style={{ ...buttonStyle, width: "auto", opacity: (isLoadingChat || !chatInput.trim()) ? 0.5 : 1 }}
                disabled={isLoadingChat || !chatInput.trim()}
              >
                Enviar
              </button>
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
