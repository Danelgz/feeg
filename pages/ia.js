import { useState, useRef, useEffect, useCallback } from "react";
import { getAuth } from "firebase/auth";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { useVoice } from "../hooks/useVoice";
import { getTokens } from "../lib/tokens";
import { Icon, ConfirmModal } from "../components/ui";
import {
  subscribeAiConversations,
  subscribeAiMessages,
  createAiConversation,
  addAiMessage,
  deleteAiConversation,
  titleFromMessage,
} from "../lib/aiChat";
import {
  buildCreateRoutine,
  buildQuickWorkoutRoutine,
  buildModifyRoutine,
  buildSubstituteExercise,
  buildLogSetWorkout,
  findTargetRoutine,
} from "../lib/aiActions";

const ACTION_TITLES = {
  propose_create_routine: "Nueva rutina propuesta",
  propose_quick_workout: "Sesión rápida propuesta",
  propose_modify_routine: "Cambio de rutina propuesto",
  propose_substitute_exercise: "Sustitución de ejercicio propuesta",
  propose_log_set: "Registrar serie",
};

function actionTitle(type) {
  return ACTION_TITLES[type] || "Cambio propuesto";
}

/** Resumen legible del payload de una propose_* para la tarjeta de confirmación del chat — no
 * repite lo que ya dijo el modelo en texto, solo deja clara la acción exacta que se aplicaría. */
function actionDescription(action) {
  const p = action.payload || {};
  switch (action.type) {
    case 'propose_create_routine':
    case 'propose_quick_workout':
      return `"${p.name || 'Sin nombre'}" · ${(p.exercises || []).length} ejercicios: ${(p.exercises || []).map(e => e.name).join(', ')}`;
    case 'propose_modify_routine':
      return `${p.routineName ? `"${p.routineName}"` : 'La rutina'} pasará a tener ${(p.exercises || []).length} ejercicios: ${(p.exercises || []).map(e => e.name).join(', ')}`;
    case 'propose_substitute_exercise':
      return `Sustituir "${p.oldExerciseName}" por "${p.newExerciseName}" en ${p.routineName ? `"${p.routineName}"` : 'tu rutina'}.`;
    case 'propose_log_set':
      return `${p.exerciseName}: ${p.reps} reps${p.weight ? ` × ${p.weight} kg` : ''}.`;
    default:
      return 'Revisa los detalles y confirma si quieres aplicarlo.';
  }
}

function renderInlineMarkdown(text, keyPrefix) {
  return String(text || '').split(/(\*\*[^*\n]+?\*\*)/g).map((part, index) => {
    const boldMatch = part.match(/^\*\*(.+)\*\*$/);
    return boldMatch
      ? <strong key={`${keyPrefix}-bold-${index}`}>{boldMatch[1]}</strong>
      : <span key={`${keyPrefix}-text-${index}`}>{part}</span>;
  });
}

function renderMessageMarkdown(content) {
  return String(content || '').split(/\r?\n/).map((line, index) => {
    const bulletMatch = line.match(/^\s*[-*]\s+(.+)$/);
    const lineContent = bulletMatch ? bulletMatch[1] : line;

    return bulletMatch ? (
      <div key={`line-${index}`} style={{ display: 'flex', gap: '8px' }}>
        <span aria-hidden="true">•</span>
        <span>{renderInlineMarkdown(lineContent, `line-${index}`)}</span>
      </div>
    ) : (
      <div key={`line-${index}`} style={{ minHeight: line ? undefined : '0.75em' }}>
        {renderInlineMarkdown(lineContent, `line-${index}`)}
      </div>
    );
  });
}

export default function IA() {
  const {
    theme, isMobile, t, user, authUser, routines, saveRoutine, updateRoutine, saveCompletedWorkout, showNotification,
    aiVoiceEnabled, setAiVoiceEnabled, aiVoiceURI, aiVoiceRate, aiVoicePitch,
  } = useUser();
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);
  const [activeTab, setActiveTab] = useState("chat"); // chat, training, technique

  // States for Training Generator
  const [showTrainingForm, setShowTrainingForm] = useState(false);
  const [trainingData, setTrainingData] = useState({
    age: "", sex: "", height: "", weight: "", goal: "", level: "", days: "", time: "", material: "", injuries: "", preferences: ""
  });
  const [generatedRoutine, setGeneratedRoutine] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // States for Chat — ahora sobre conversaciones independientes en vez de un único hilo.
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [showHistory, setShowHistory] = useState(!isMobile);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  // Propuesta de cambio pendiente de confirmar (crear/modificar rutina, sustituir ejercicio,
  // sesión rápida, registrar serie) — ver lib/aiActions.ts. Vive solo en memoria: nunca se aplica
  // sola, y si el usuario cambia de conversación o envía otro mensaje se descarta sin aplicar.
  const [pendingAction, setPendingAction] = useState(null);
  const [isApplyingAction, setIsApplyingAction] = useState(false);
  const chatEndRef = useRef(null);

  const voice = useVoice({ enabled: aiVoiceEnabled, voiceURI: aiVoiceURI, rate: aiVoiceRate, pitch: aiVoicePitch });

  // Lista de conversaciones del usuario, más recientes primero.
  useEffect(() => {
    if (!authUser?.uid) { setConversations([]); return; }
    const unsubscribe = subscribeAiConversations(
      authUser.uid,
      (list) => setConversations(list),
      (error) => console.error('[ia] Error listando conversaciones:', error.code || error.message)
    );
    return unsubscribe;
  }, [authUser]);

  // Mensajes de la conversación activa.
  useEffect(() => {
    if (!authUser?.uid || !activeConversationId) { setMessages([]); return; }
    const unsubscribe = subscribeAiMessages(
      authUser.uid,
      activeConversationId,
      (list) => setMessages(list),
      (error) => console.error('[ia] Error en el listener de mensajes:', error.code || error.message)
    );
    return unsubscribe;
  }, [authUser, activeConversationId]);

  const accentColor = tk.accent;

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleGenerateTraining = async () => {
    setIsGenerating(true);

    try {
      const auth = getAuth();
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : "";

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
      showNotification("Hubo un error al generar tu rutina. Inténtalo de nuevo.", 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setPendingAction(null);
    voice.stopSpeaking();
    if (isMobile) setShowHistory(false);
  };

  const handleSelectConversation = (id) => {
    setActiveConversationId(id);
    setPendingAction(null);
    voice.stopSpeaking();
    if (isMobile) setShowHistory(false);
  };

  const handleRequestDeleteConversation = (conv) => setConversationToDelete(conv);

  const handleConfirmDeleteConversation = async () => {
    if (!conversationToDelete || !authUser?.uid) return;
    try {
      await deleteAiConversation(authUser.uid, conversationToDelete.id);
      if (activeConversationId === conversationToDelete.id) {
        setActiveConversationId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error borrando conversación:', error);
      showNotification("No se pudo borrar la conversación.", 'error');
    } finally {
      setConversationToDelete(null);
    }
  };

  const handleSendMessage = async () => {
    const userMessage = chatInput.trim();
    if (!userMessage || !authUser?.uid) return;

    setChatInput("");
    setPendingAction(null);
    setIsLoadingChat(true);

    try {
      let conversationId = activeConversationId;
      if (!conversationId) {
        conversationId = await createAiConversation(authUser.uid, titleFromMessage(userMessage));
        setActiveConversationId(conversationId);
      }

      // Historial reciente para dar contexto a Gemini (últimos 10 mensajes + el nuevo).
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));

      await addAiMessage(authUser.uid, conversationId, 'user', userMessage);

      const auth = getAuth();
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : "";

      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          messages: [...history, { role: 'user', content: userMessage }],
          userProfile: user
        })
      });

      const data = await response.json();
      const reply = response.ok
        ? data.reply
        : "Ha ocurrido un error contactando con mis servidores. Por favor, inténtalo de nuevo en unos segundos.";

      if (!response.ok) console.error('Error del servidor:', data.error);

      await addAiMessage(authUser.uid, conversationId, 'assistant', reply);
      if (response.ok && data.pendingAction) setPendingAction(data.pendingAction);
      if (aiVoiceEnabled) voice.speak(reply);

    } catch (error) {
      console.error('Error enviando mensaje:', error);
      showNotification("Hubo un problema al enviar tu mensaje. Asegúrate de tener conexión y de estar logueado.", 'error');
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Aplica el cambio propuesto por el Coach IA usando los mismos mutators de UserContext que
  // cualquier acción manual en la app (saveRoutine/updateRoutine/saveCompletedWorkout) — nunca se
  // escribe directamente a Firestore desde aquí. Solo se ejecuta si el usuario pulsa "Confirmar".
  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    setIsApplyingAction(true);

    try {
      const { type, payload } = pendingAction;

      switch (type) {
        case 'propose_create_routine':
          await saveRoutine(buildCreateRoutine(payload));
          showNotification("¡Rutina creada! La tienes en Rutinas.", 'success');
          break;

        case 'propose_quick_workout':
          await saveRoutine(buildQuickWorkoutRoutine(payload));
          showNotification("¡Sesión creada! Puedes iniciarla desde Rutinas.", 'success');
          break;

        case 'propose_modify_routine': {
          const target = findTargetRoutine(routines, payload);
          if (!target) { showNotification("No he encontrado esa rutina — puede que ya no exista.", 'error'); break; }
          await updateRoutine(buildModifyRoutine(target, payload));
          showNotification("Rutina actualizada.", 'success');
          break;
        }

        case 'propose_substitute_exercise': {
          const target = findTargetRoutine(routines, payload);
          if (!target) { showNotification("No he encontrado esa rutina — puede que ya no exista.", 'error'); break; }
          await updateRoutine(buildSubstituteExercise(target, payload));
          showNotification("Ejercicio sustituido.", 'success');
          break;
        }

        case 'propose_log_set':
          await saveCompletedWorkout(buildLogSetWorkout(payload));
          showNotification("Serie registrada en tu historial.", 'success');
          break;

        default:
          showNotification("No he reconocido esa acción.", 'error');
      }
    } catch (error) {
      console.error('Error aplicando acción del Coach IA:', error);
      showNotification("No se pudo aplicar el cambio. Inténtalo de nuevo.", 'error');
    } finally {
      setIsApplyingAction(false);
      setPendingAction(null);
    }
  };

  const handleDismissAction = () => setPendingAction(null);

  const handleMicClick = useCallback(() => {
    if (voice.isListening) {
      voice.stopListening();
      return;
    }
    if (!voice.sttSupported) {
      showNotification(t("ai_mic_not_supported"), 'info');
      return;
    }
    voice.startListening((text) => setChatInput((prev) => (prev ? `${prev} ${text}` : text)));
  }, [voice, showNotification, t]);

  // States for Technique
  const [techniqueSearch, setTechniqueSearch] = useState("");
  const [techniqueResult, setTechniqueResult] = useState(null);

  const handleSearchTechnique = () => {
    setTechniqueResult({
      name: techniqueSearch,
      position: "Mantén una postura erguida, pies a la anchura de los hombros y mirada al frente.",
      errors: "Evita curvar la espalda y hacer movimientos bruscos o rebotes.",
      muscles: "Involucra principalmente el grupo muscular trabajado y estabilizadores del core.",
      tips: trainingData.level === "principiante" ? "Usa poco peso para masterizar el movimiento." : "Enfócate en la conexión mente-músculo."
    });
  };

  const cardStyle = {
    background: isDark ? "linear-gradient(145deg, #1a1a1a 0%, #111111 100%)" : "linear-gradient(145deg, #ffffff 0%, #f9f9f9 100%)",
    borderRadius: "20px",
    padding: "25px",
    marginBottom: "25px",
    border: `1px solid ${isDark ? "#333" : "#eee"}`,
    boxShadow: isDark ? "0 8px 30px rgba(0,0,0,0.5)" : "0 8px 30px rgba(0,0,0,0.05)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease"
  };

  const inputStyle = {
    width: "100%",
    padding: "15px",
    borderRadius: "12px",
    border: `1px solid ${isDark ? "#444" : "#ccc"}`,
    backgroundColor: isDark ? "#000" : "#fff",
    color: isDark ? "#fff" : "#333",
    marginBottom: "15px",
    fontSize: "1rem",
    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)",
    transition: "border-color 0.2s, box-shadow 0.2s"
  };

  const buttonStyle = {
    background: `linear-gradient(135deg, ${accentColor} 0%, #10ac84 100%)`,
    color: "#000",
    border: "none",
    padding: "15px 25px",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "1.05rem",
    width: "100%",
    boxShadow: "0 4px 15px rgba(29, 209, 161, 0.4)",
    transition: "transform 0.1s, box-shadow 0.1s",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  };

  return (
    <Layout>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: isMobile ? "10px" : "20px", color: isDark ? "#fff" : "#333" }}>
        <h1 style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "30px", fontSize: "2.2rem" }}>
          <span style={{ fontSize: "2.5rem", filter: "drop-shadow(0 2px 4px rgba(29,209,161,0.5))" }}>🤖</span>
          <span style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #10ac84 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {t("ai_chat_title")}
          </span>
        </h1>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px", overflowX: "auto", paddingBottom: "10px" }}>
          {[
            { id: "chat", label: "Chat Coach", icon: "🗣️" },
            { id: "training", label: "Entrenamiento", icon: "🏋️‍♂️" },
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

        {/* Chat Coach Content */}
        {activeTab === "chat" && (
          <div style={{
            display: "flex",
            gap: "16px",
            height: isMobile ? "75vh" : "68vh",
          }}>
            {/* Sidebar de conversaciones */}
            {(showHistory || !isMobile) && (
              <div style={{
                width: isMobile ? "100%" : "260px",
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                backgroundColor: tk.surface,
                border: `1px solid ${tk.border}`,
                borderRadius: tk.radius.lg,
                overflow: "hidden",
              }}>
                <div style={{ padding: "12px", borderBottom: `1px solid ${tk.border}` }}>
                  <button
                    onClick={handleNewConversation}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      padding: "10px",
                      borderRadius: tk.radius.md,
                      border: `1.5px solid ${tk.accent}`,
                      backgroundColor: tk.accentSoft,
                      color: tk.accent,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: tk.transition,
                    }}
                  >
                    <Icon name="plus" size={16} />
                    {t("ai_new_conversation")}
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                  {conversations.length === 0 && (
                    <div style={{ color: tk.textMuted, fontSize: "0.85rem", padding: "12px", textAlign: "center" }}>
                      {t("ai_no_conversations")}
                    </div>
                  )}
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "6px",
                        padding: "10px 12px",
                        borderRadius: tk.radius.sm,
                        cursor: "pointer",
                        marginBottom: "4px",
                        backgroundColor: conv.id === activeConversationId ? tk.accentSoft : "transparent",
                        color: conv.id === activeConversationId ? tk.accent : tk.text,
                        transition: tk.transition,
                      }}
                    >
                      <span style={{ fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {conv.title || t("ai_new_conversation")}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRequestDeleteConversation(conv); }}
                        aria-label={t("ai_delete_conversation")}
                        style={{ background: "none", border: "none", color: tk.textFaint, cursor: "pointer", padding: "4px", display: "flex" }}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Panel de chat */}
            {(!showHistory || !isMobile) && (
              <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                backgroundColor: tk.surface,
                border: `1px solid ${tk.border}`,
                borderRadius: tk.radius.lg,
                overflow: "hidden",
                minWidth: 0,
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderBottom: `1px solid ${tk.border}`,
                }}>
                  {isMobile && (
                    <button
                      onClick={() => setShowHistory(true)}
                      style={{ background: "none", border: "none", color: tk.text, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}
                    >
                      <Icon name="chevronLeft" size={16} />
                      {t("ai_conversation_history")}
                    </button>
                  )}
                  {!isMobile && <span style={{ color: tk.textMuted, fontSize: "0.85rem" }}>{t("ai_conversation_history")}</span>}
                  <button
                    onClick={() => setAiVoiceEnabled(!aiVoiceEnabled)}
                    title={t("ai_voice_enable_label")}
                    style={{
                      background: "none",
                      border: "none",
                      color: aiVoiceEnabled ? tk.accent : tk.textFaint,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Icon name={aiVoiceEnabled ? "volume2" : "volumeX"} size={18} />
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: tk.textMuted, marginTop: '20px' }}>
                      {t("ai_chat_empty")}
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={msg.id || i} style={{
                      alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                      background: msg.role === "user"
                        ? `linear-gradient(135deg, ${accentColor} 0%, #10ac84 100%)`
                        : (isDark ? "linear-gradient(135deg, #333 0%, #222 100%)" : "linear-gradient(135deg, #fff 0%, #f0f0f0 100%)"),
                      color: msg.role === "user" ? "#000" : (isDark ? "#fff" : "#333"),
                      padding: "14px 18px",
                      borderRadius: msg.role === "user" ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                      maxWidth: "85%",
                      fontSize: "1rem",
                      boxShadow: msg.role === "user" ? "0 4px 15px rgba(29, 209, 161, 0.3)" : "0 4px 15px rgba(0,0,0,0.1)",
                      border: msg.role === "user" ? "none" : `1px solid ${tk.border}`,
                      lineHeight: "1.5",
                      whiteSpace: "pre-wrap",
                    }}>
                      {renderMessageMarkdown(msg.content)}
                    </div>
                  ))}
                  {isLoadingChat && (
                    <div style={{ alignSelf: "flex-start", backgroundColor: isDark ? "#333" : "#eee", padding: "10px 15px", borderRadius: "15px 15px 15px 0", color: isDark ? "#fff" : "#333" }}>
                      <span style={{ animation: "pulse 1.5s infinite" }}>{t("ai_thinking")}</span>
                    </div>
                  )}
                  {voice.isSpeaking && (
                    <button
                      onClick={voice.stopSpeaking}
                      style={{
                        alignSelf: "flex-start",
                        display: "flex", alignItems: "center", gap: "6px",
                        background: "none", border: `1px solid ${tk.border}`, borderRadius: tk.radius.pill,
                        padding: "6px 12px", color: tk.textMuted, fontSize: "0.8rem", cursor: "pointer",
                      }}
                    >
                      <Icon name="volume2" size={14} /> {t("ai_stop_speaking")}
                    </button>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {pendingAction && (
                  <div style={{
                    margin: "0 16px 12px",
                    padding: "14px 16px",
                    borderRadius: tk.radius.md,
                    border: `1.5px solid ${tk.accent}`,
                    backgroundColor: tk.accentSoft,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: tk.accent, fontWeight: 700, fontSize: "0.9rem" }}>
                      <Icon name="zap" size={16} />
                      {actionTitle(pendingAction.type)}
                    </div>
                    <div style={{ color: tk.text, fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "12px" }}>
                      {actionDescription(pendingAction)}
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        onClick={handleConfirmAction}
                        disabled={isApplyingAction}
                        style={{
                          flex: 1, padding: "10px", borderRadius: tk.radius.sm, border: "none",
                          backgroundColor: tk.accent, color: tk.onAccent, fontWeight: 700, cursor: "pointer",
                          opacity: isApplyingAction ? 0.7 : 1,
                        }}
                      >
                        {isApplyingAction ? "Aplicando..." : "Confirmar"}
                      </button>
                      <button
                        onClick={handleDismissAction}
                        disabled={isApplyingAction}
                        style={{
                          flex: 1, padding: "10px", borderRadius: tk.radius.sm, border: `1px solid ${tk.border}`,
                          backgroundColor: "transparent", color: tk.textMuted, fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        Descartar
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px", padding: "12px 16px", borderTop: `1px solid ${tk.border}` }}>
                  <button
                    onClick={handleMicClick}
                    title={voice.sttSupported ? t("ai_listening") : t("ai_mic_not_supported")}
                    style={{
                      background: voice.isListening ? tk.danger : tk.surfaceAlt,
                      border: `1px solid ${voice.isListening ? tk.danger : tk.border}`,
                      color: voice.isListening ? "#fff" : tk.text,
                      borderRadius: tk.radius.md,
                      width: "48px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: tk.transition,
                    }}
                  >
                    <Icon name="mic" size={18} />
                  </button>
                  <input
                    placeholder={voice.isListening ? t("ai_listening") : t("ai_chat_placeholder")}
                    style={{ ...inputStyle, marginBottom: 0 }}
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                    disabled={isLoadingChat}
                  />
                  <button
                    onClick={handleSendMessage}
                    style={{
                      ...buttonStyle, width: "auto", padding: "10px 22px", borderRadius: "12px",
                      opacity: (isLoadingChat || !chatInput.trim()) ? 0.5 : 1,
                    }}
                    disabled={isLoadingChat || !chatInput.trim()}
                  >
                    <Icon name="send" size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

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
                          showNotification("¡Rutina guardada correctamente!", 'success');
                        } catch (err) {
                          console.error("Error guardando rutina", err);
                          showNotification("Error al guardar rutina", 'error');
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

      <ConfirmModal
        isDark={isDark}
        open={!!conversationToDelete}
        title={t("ai_confirm_delete_conversation_title")}
        description={t("ai_confirm_delete_conversation_msg")}
        confirmLabel={t("ai_delete_conversation")}
        danger
        onConfirm={handleConfirmDeleteConversation}
        onCancel={() => setConversationToDelete(null)}
      />
    </Layout>
  );
}
