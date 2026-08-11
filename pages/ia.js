import { useState, useRef, useEffect, useCallback } from "react";
import { getAuth } from "firebase/auth";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { useVoice } from "../hooks/useVoice";
import { getTokens } from "../lib/tokens";
import { Icon, Button, Card, PageHeader, ConfirmModal, EmptyState, ChipNav } from "../components/ui";
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

const TABS = [
  { key: "chat", label: "Chat" },
  { key: "training", label: "Entrenamiento" },
  { key: "technique", label: "Técnica" },
];

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

  // States for Chat — conversaciones independientes en vez de un único hilo.
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  // En móvil el historial vive en un overlay a pantalla completa (mismo patrón que
  // ExerciseSelector) en vez de sustituir el panel de chat — así nunca hay que "volver" para
  // seguir escribiendo, solo cerrar la capa de encima.
  const [showHistoryOverlay, setShowHistoryOverlay] = useState(false);
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
    setShowHistoryOverlay(false);
  };

  const handleSelectConversation = (id) => {
    setActiveConversationId(id);
    setPendingAction(null);
    voice.stopSpeaking();
    setShowHistoryOverlay(false);
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
  const [isSearchingTechnique, setIsSearchingTechnique] = useState(false);

  const handleSearchTechnique = async () => {
    const exerciseName = techniqueSearch.trim();
    if (!exerciseName || !authUser?.uid || isSearchingTechnique) return;

    setIsSearchingTechnique(true);
    setTechniqueResult(null);

    try {
      const auth = getAuth();
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : "";

      const response = await fetch('/api/ai-technique', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ exerciseName })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error consultando la técnica');

      setTechniqueResult(data.result);
    } catch (error) {
      console.error('Error buscando técnica:', error);
      showNotification("No se pudo consultar la técnica de ese ejercicio. Inténtalo de nuevo.", 'error');
    } finally {
      setIsSearchingTechnique(false);
    }
  };

  // Estilo compartido de campos de formulario (Entrenamiento/Técnica), derivado de los tokens en
  // vez de hex sueltos con ternarias de tema repetidas en cada input.
  const fieldStyle = {
    width: "100%",
    padding: "13px 14px",
    borderRadius: tk.radius.md,
    border: `1.5px solid ${tk.border}`,
    backgroundColor: tk.surfaceAlt,
    color: tk.text,
    fontSize: tk.fontSize.sm,
    outline: "none",
    boxSizing: "border-box",
    transition: tk.transition,
    fontFamily: "inherit",
  };

  // Altura del panel de chat: en móvil se resta el hueco aproximado de la cabecera (campana) y la
  // navegación inferior fija de Layout.jsx; en escritorio se deja un margen generoso con un techo
  // para que no se estire sin límite en pantallas muy altas. No hay forma de medirlo con exactitud
  // sin JS de layout — son valores ajustados a ojo contra el chrome real de la app.
  const chatPanelHeight = isMobile ? "calc(100dvh - 250px)" : "min(700px, calc(100vh - 220px))";
  const chatPanelMinHeight = isMobile ? "360px" : "460px";

  return (
    <Layout>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: isMobile ? "12px 12px 0" : "20px" }}>
        <PageHeader
          isDark={isDark}
          isMobile={isMobile}
          title={t("ai_chat_title")}
          subtitle={isMobile ? undefined : "Tu entrenador virtual, con acceso a tus datos reales."}
        />

        <div style={{ marginBottom: isMobile ? "12px" : "18px" }}>
          <ChipNav items={TABS} activeKey={activeTab} onChange={setActiveTab} isDark={isDark} ariaLabel="Secciones del Coach IA" />
        </div>

        {/* Chat Coach */}
        {activeTab === "chat" && (
          <div style={{ display: "flex", gap: "16px", height: chatPanelHeight, minHeight: chatPanelMinHeight }}>
            {/* Sidebar de conversaciones — solo en escritorio, en móvil vive en el overlay de abajo */}
            {!isMobile && (
              <div style={{
                width: "260px",
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                backgroundColor: tk.surface,
                border: `1px solid ${tk.border}`,
                borderRadius: tk.radius.lg,
                boxShadow: tk.shadow.card,
                overflow: "hidden",
              }}>
                <div style={{ padding: "12px", borderBottom: `1px solid ${tk.border}` }}>
                  <Button isDark={isDark} variant="secondary" icon="plus" fullWidth onClick={handleNewConversation}
                    style={{ "--feeg-bg": tk.accentSoft, "--feeg-fg": tk.accent, "--feeg-border": tk.accent, "--feeg-border-width": "1.5px" }}>
                    {t("ai_new_conversation")}
                  </Button>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                  {conversations.length === 0 && (
                    <div style={{ color: tk.textMuted, fontSize: tk.fontSize.xs, padding: "12px", textAlign: "center" }}>
                      {t("ai_no_conversations")}
                    </div>
                  )}
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className="feeg-press feeg-hover"
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
                        "--feeg-press-scale": 0.98,
                      }}
                    >
                      <span style={{ fontSize: tk.fontSize.xs, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {conv.title || t("ai_new_conversation")}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRequestDeleteConversation(conv); }}
                        aria-label={t("ai_delete_conversation")}
                        style={{ background: "none", border: "none", color: tk.textFaint, cursor: "pointer", padding: "4px", display: "flex", flexShrink: 0 }}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Panel de chat */}
            <div style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              backgroundColor: tk.surface,
              border: `1px solid ${tk.border}`,
              borderRadius: tk.radius.lg,
              boxShadow: tk.shadow.card,
              overflow: "hidden",
              minWidth: 0,
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: isMobile ? "10px 12px" : "12px 16px",
                borderBottom: `1px solid ${tk.border}`,
                flexShrink: 0,
              }}>
                {isMobile ? (
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => setShowHistoryOverlay(true)}
                      aria-label={t("ai_conversation_history")}
                      style={{ ...iconButtonStyle(tk), color: tk.text }}
                    >
                      <Icon name="clock" size={18} />
                    </button>
                    <button
                      onClick={handleNewConversation}
                      aria-label={t("ai_new_conversation")}
                      style={{ ...iconButtonStyle(tk), color: tk.text }}
                    >
                      <Icon name="plus" size={18} />
                    </button>
                  </div>
                ) : (
                  <span style={{ color: tk.textMuted, fontSize: tk.fontSize.xs, fontWeight: tk.weight.medium }}>
                    {conversations.find((c) => c.id === activeConversationId)?.title || t("ai_new_conversation")}
                  </span>
                )}
                <button
                  onClick={() => setAiVoiceEnabled(!aiVoiceEnabled)}
                  title={t("ai_voice_enable_label")}
                  style={{ ...iconButtonStyle(tk), color: aiVoiceEnabled ? tk.accent : tk.textFaint }}
                >
                  <Icon name={aiVoiceEnabled ? "volume2" : "volumeX"} size={18} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "12px" : "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                {messages.length === 0 && (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <EmptyState isDark={isDark} icon="message" title={t("ai_chat_empty")} />
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={msg.id || i} style={{
                    display: "flex",
                    alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                    alignItems: "flex-end",
                    gap: "8px",
                    maxWidth: "88%",
                  }}>
                    {msg.role === "assistant" && (
                      <div style={{
                        width: "26px", height: "26px", borderRadius: tk.radius.full, flexShrink: 0,
                        backgroundColor: tk.accentSoft, color: tk.accent,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Icon name="zap" size={13} />
                      </div>
                    )}
                    <div style={{
                      background: msg.role === "user"
                        ? `linear-gradient(135deg, ${tk.accent} 0%, ${tk.accentHover} 100%)`
                        : tk.surfaceAlt,
                      color: msg.role === "user" ? tk.onAccent : tk.text,
                      padding: "12px 16px",
                      borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      fontSize: tk.fontSize.sm,
                      boxShadow: msg.role === "user" ? tk.shadow.accent : "none",
                      border: msg.role === "user" ? "none" : `1px solid ${tk.border}`,
                      lineHeight: "1.5",
                      whiteSpace: "pre-wrap",
                    }}>
                      {renderMessageMarkdown(msg.content)}
                    </div>
                  </div>
                ))}
                {isLoadingChat && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", alignSelf: "flex-start" }}>
                    <div style={{
                      width: "26px", height: "26px", borderRadius: tk.radius.full, flexShrink: 0,
                      backgroundColor: tk.accentSoft, color: tk.accent,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon name="zap" size={13} />
                    </div>
                    <div style={{ backgroundColor: tk.surfaceAlt, border: `1px solid ${tk.border}`, padding: "12px 16px", borderRadius: "18px 18px 18px 4px", display: "flex", gap: "4px" }}>
                      <span className="ia-typing-dot" style={{ backgroundColor: tk.textFaint }} />
                      <span className="ia-typing-dot" style={{ backgroundColor: tk.textFaint, animationDelay: "0.15s" }} />
                      <span className="ia-typing-dot" style={{ backgroundColor: tk.textFaint, animationDelay: "0.3s" }} />
                    </div>
                  </div>
                )}
                {voice.isSpeaking && (
                  <button
                    onClick={voice.stopSpeaking}
                    style={{
                      alignSelf: "flex-start",
                      display: "flex", alignItems: "center", gap: "6px",
                      background: "none", border: `1px solid ${tk.border}`, borderRadius: tk.radius.pill,
                      padding: "6px 12px", color: tk.textMuted, fontSize: tk.fontSize.xs, cursor: "pointer",
                    }}
                  >
                    <Icon name="volume2" size={14} /> {t("ai_stop_speaking")}
                  </button>
                )}
                <div ref={chatEndRef} />
              </div>

              {pendingAction && (
                <div style={{
                  margin: isMobile ? "0 12px 10px" : "0 16px 12px",
                  padding: "14px 16px",
                  borderRadius: tk.radius.md,
                  border: `1.5px solid ${tk.accent}`,
                  backgroundColor: tk.accentSoft,
                  flexShrink: 0,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: tk.accent, fontWeight: tk.weight.bold, fontSize: tk.fontSize.sm }}>
                    <Icon name="zap" size={16} />
                    {actionTitle(pendingAction.type)}
                  </div>
                  <div style={{ color: tk.text, fontSize: tk.fontSize.sm, lineHeight: 1.5, marginBottom: "12px" }}>
                    {actionDescription(pendingAction)}
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <Button isDark={isDark} onClick={handleConfirmAction} disabled={isApplyingAction} style={{ flex: 1 }}>
                      {isApplyingAction ? "Aplicando..." : "Confirmar"}
                    </Button>
                    <Button isDark={isDark} variant="secondary" onClick={handleDismissAction} disabled={isApplyingAction} style={{ flex: 1 }}>
                      Descartar
                    </Button>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "8px", padding: isMobile ? "10px 12px" : "12px 16px", borderTop: `1px solid ${tk.border}`, flexShrink: 0 }}>
                <button
                  onClick={handleMicClick}
                  title={voice.sttSupported ? t("ai_listening") : t("ai_mic_not_supported")}
                  style={{
                    background: voice.isListening ? tk.danger : tk.surfaceAlt,
                    border: `1px solid ${voice.isListening ? tk.danger : tk.border}`,
                    color: voice.isListening ? "#fff" : tk.text,
                    borderRadius: tk.radius.md,
                    width: "46px",
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
                  style={{ ...fieldStyle, flex: 1, padding: "12px 14px" }}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                  disabled={isLoadingChat}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoadingChat || !chatInput.trim()}
                  style={{
                    background: `linear-gradient(135deg, ${tk.accent} 0%, ${tk.accentHover} 100%)`,
                    color: tk.onAccent,
                    border: "none",
                    borderRadius: tk.radius.md,
                    width: "46px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    opacity: (isLoadingChat || !chatInput.trim()) ? 0.5 : 1,
                    boxShadow: tk.shadow.accent,
                    transition: tk.transition,
                  }}
                >
                  <Icon name="send" size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Training Generator */}
        {activeTab === "training" && (
          <div>
            {!showTrainingForm && !generatedRoutine && (
              <Card isDark={isDark} padding={isMobile ? "sm" : "lg"} style={{ textAlign: "center" }}>
                <h3 style={{ margin: "0 0 8px", color: tk.text }}>¿Necesitas un plan a tu medida?</h3>
                <p style={{ color: tk.textMuted, fontSize: tk.fontSize.sm, margin: "0 0 20px" }}>Nuestra IA analizará tus datos para crear la rutina perfecta para ti.</p>
                <Button isDark={isDark} fullWidth onClick={() => setShowTrainingForm(true)}>
                  Crear entrenamiento personalizado
                </Button>
              </Card>
            )}

            {showTrainingForm && (
              <Card isDark={isDark} padding={isMobile ? "sm" : "lg"}>
                <h3 style={{ margin: "0 0 16px", color: tk.text }}>Cuéntame sobre ti</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: "10px" }}>
                    <input placeholder="Edad" type="number" style={fieldStyle} value={trainingData.age} onChange={e => setTrainingData({ ...trainingData, age: e.target.value })} />
                    <select style={fieldStyle} value={trainingData.sex} onChange={e => setTrainingData({ ...trainingData, sex: e.target.value })}>
                      <option value="">Sexo</option>
                      <option value="hombre">Hombre</option>
                      <option value="mujer">Mujer</option>
                    </select>
                    <input placeholder="Altura (cm)" type="number" style={fieldStyle} value={trainingData.height} onChange={e => setTrainingData({ ...trainingData, height: e.target.value })} />
                    <input placeholder="Peso (kg)" type="number" style={fieldStyle} value={trainingData.weight} onChange={e => setTrainingData({ ...trainingData, weight: e.target.value })} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "10px" }}>
                    <select style={fieldStyle} value={trainingData.goal} onChange={e => setTrainingData({ ...trainingData, goal: e.target.value })}>
                      <option value="">Objetivo</option>
                      <option value="perder grasa">Perder grasa</option>
                      <option value="ganar músculo">Ganar músculo</option>
                      <option value="fuerza">Fuerza</option>
                      <option value="mantenimiento">Mantenimiento</option>
                    </select>
                    <select style={fieldStyle} value={trainingData.level} onChange={e => setTrainingData({ ...trainingData, level: e.target.value })}>
                      <option value="">Nivel</option>
                      <option value="principiante">Principiante</option>
                      <option value="intermedio">Intermedio</option>
                      <option value="avanzado">Avanzado</option>
                    </select>
                  </div>
                  <input placeholder="Días disponibles por semana" type="number" style={fieldStyle} value={trainingData.days} onChange={e => setTrainingData({ ...trainingData, days: e.target.value })} />
                  <input placeholder="Material (gym, casa, mancuernas...)" style={fieldStyle} value={trainingData.material} onChange={e => setTrainingData({ ...trainingData, material: e.target.value })} />
                  <textarea placeholder="Lesiones o preferencias..." style={{ ...fieldStyle, minHeight: "80px", resize: "vertical" }} value={trainingData.preferences} onChange={e => setTrainingData({ ...trainingData, preferences: e.target.value })} />

                  <Button isDark={isDark} fullWidth onClick={handleGenerateTraining} disabled={isGenerating} style={{ marginTop: "6px" }}>
                    {isGenerating ? "Generando plan..." : "Generar mi plan"}
                  </Button>
                </div>
              </Card>
            )}

            {generatedRoutine && (
              <Card isDark={isDark} padding={isMobile ? "sm" : "lg"}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "16px" }}>
                  <h2 style={{ color: tk.accent, margin: 0, fontSize: tk.fontSize.lg }}>{generatedRoutine.title}</h2>
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    <Button isDark={isDark} size="sm" onClick={async () => {
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
                    }}>
                      Guardar
                    </Button>
                    <Button isDark={isDark} variant="ghost" size="sm" onClick={() => setGeneratedRoutine(null)}>Volver</Button>
                  </div>
                </div>
                <p style={{ color: tk.textMuted, fontSize: tk.fontSize.sm }}>{generatedRoutine.summary}</p>

                {generatedRoutine.days.map((day, idx) => (
                  <div key={idx} style={{ marginBottom: "16px", padding: "14px", backgroundColor: tk.surfaceAlt, borderRadius: tk.radius.md, border: `1px solid ${tk.border}` }}>
                    <h4 style={{ margin: "0 0 10px 0", color: tk.accent, fontSize: tk.fontSize.sm }}>{day.name}</h4>
                    {day.exercises.map((ex, i) => (
                      <div key={i} style={{ padding: "8px 0", borderBottom: i === day.exercises.length - 1 ? "none" : `1px solid ${tk.border}` }}>
                        <div style={{ fontWeight: tk.weight.bold, color: tk.text, fontSize: tk.fontSize.sm }}>{ex.name}</div>
                        <div style={{ fontSize: tk.fontSize.xs, color: tk.textMuted }}>{ex.sets} series x {ex.reps} • Descanso: {ex.rest}</div>
                        <div style={{ fontSize: tk.fontSize.xs, fontStyle: "italic", marginTop: "4px", color: tk.textMuted }}>💡 {ex.note}</div>
                      </div>
                    ))}
                  </div>
                ))}

                <div style={{ backgroundColor: tk.accentSoft, padding: "14px", borderRadius: tk.radius.md, borderLeft: `3px solid ${tk.accent}`, fontSize: tk.fontSize.sm, color: tk.text }}>
                  <strong>Consejo IA:</strong> {generatedRoutine.advice}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Technique */}
        {activeTab === "technique" && (
          <div>
            <Card isDark={isDark} padding={isMobile ? "sm" : "lg"}>
              <h3 style={{ margin: "0 0 6px", color: tk.text }}>Explorador de Técnica</h3>
              <p style={{ color: tk.textMuted, fontSize: tk.fontSize.sm, margin: "0 0 16px" }}>Busca cualquier ejercicio para recibir una explicación detallada.</p>
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  placeholder="Ej: Sentadilla, Press Banca..."
                  style={fieldStyle}
                  value={techniqueSearch}
                  onChange={e => setTechniqueSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearchTechnique()}
                  disabled={isSearchingTechnique}
                />
                <Button isDark={isDark} onClick={handleSearchTechnique} disabled={!techniqueSearch.trim() || isSearchingTechnique}>
                  {isSearchingTechnique ? "Buscando..." : "Buscar"}
                </Button>
              </div>
            </Card>

            {techniqueResult && (
              <Card isDark={isDark} padding={isMobile ? "sm" : "lg"} style={{ marginTop: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <h2 style={{ color: tk.accent, margin: 0, fontSize: tk.fontSize.lg }}>{techniqueResult.name}</h2>
                  {techniqueResult.muscleGroup && (
                    <span style={{
                      fontSize: tk.fontSize.xs, fontWeight: tk.weight.medium, color: tk.textMuted,
                      backgroundColor: tk.surfaceAlt, border: `1px solid ${tk.border}`, borderRadius: tk.radius.pill,
                      padding: "3px 10px",
                    }}>
                      {techniqueResult.muscleGroup}
                    </span>
                  )}
                </div>

                {techniqueResult.recognized === false && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px",
                    color: tk.danger, fontSize: tk.fontSize.xs, fontWeight: tk.weight.medium,
                  }}>
                    <Icon name="alertCircle" size={14} />
                    No he reconocido este ejercicio con seguridad — tómalo con cautela.
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <strong style={{ display: "block", color: tk.accent, fontSize: tk.fontSize.sm, marginBottom: "4px" }}>📍 Posición y ejecución</strong>
                    <span style={{ color: tk.text, fontSize: tk.fontSize.sm }}>{techniqueResult.position}</span>
                  </div>
                  <div>
                    <strong style={{ display: "block", color: tk.danger, fontSize: tk.fontSize.sm, marginBottom: "4px" }}>❌ Errores comunes</strong>
                    <span style={{ color: tk.text, fontSize: tk.fontSize.sm }}>{techniqueResult.commonMistakes}</span>
                  </div>
                  <div>
                    <strong style={{ display: "block", color: tk.accent, fontSize: tk.fontSize.sm, marginBottom: "4px" }}>💪 Músculos implicados</strong>
                    <span style={{ color: tk.text, fontSize: tk.fontSize.sm }}>{techniqueResult.musclesInvolved}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr", gap: "10px" }}>
                    <div style={{ backgroundColor: tk.surfaceAlt, border: `1px solid ${tk.border}`, borderRadius: tk.radius.md, padding: "10px 12px" }}>
                      <div style={{ color: tk.textMuted, fontSize: tk.fontSize.xs, marginBottom: "2px" }}>Repeticiones</div>
                      <div style={{ color: tk.text, fontSize: tk.fontSize.sm, fontWeight: tk.weight.medium }}>{techniqueResult.repRange}</div>
                    </div>
                    <div style={{ backgroundColor: tk.surfaceAlt, border: `1px solid ${tk.border}`, borderRadius: tk.radius.md, padding: "10px 12px" }}>
                      <div style={{ color: tk.textMuted, fontSize: tk.fontSize.xs, marginBottom: "2px" }}>Descanso</div>
                      <div style={{ color: tk.text, fontSize: tk.fontSize.sm, fontWeight: tk.weight.medium }}>{techniqueResult.restAdvice}</div>
                    </div>
                  </div>
                  <div style={{ backgroundColor: tk.accentSoft, padding: "12px", borderRadius: tk.radius.sm, border: `1px dashed ${tk.accent}`, fontSize: tk.fontSize.sm, color: tk.text }}>
                    <strong>💡 Tip:</strong> {techniqueResult.tip}
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Overlay de historial de conversaciones — solo móvil */}
      {isMobile && showHistoryOverlay && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: tk.bg,
          zIndex: 3000,
          display: "flex",
          flexDirection: "column",
        }}>
          <div style={{
            padding: "14px 16px",
            borderBottom: `1px solid ${tk.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <span style={{ color: tk.text, fontWeight: tk.weight.bold, fontSize: tk.fontSize.lg }}>{t("ai_conversation_history")}</span>
            <button onClick={() => setShowHistoryOverlay(false)} aria-label="Cerrar" style={{ ...iconButtonStyle(tk), color: tk.textMuted }}>
              <Icon name="close" size={20} />
            </button>
          </div>

          <div style={{ padding: "12px 16px" }}>
            <Button isDark={isDark} icon="plus" fullWidth onClick={handleNewConversation}>
              {t("ai_new_conversation")}
            </Button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 16px" }}>
            {conversations.length === 0 ? (
              <EmptyState isDark={isDark} icon="message" title={t("ai_no_conversations")} />
            ) : conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                className="feeg-press feeg-hover"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  padding: "14px",
                  borderRadius: tk.radius.md,
                  cursor: "pointer",
                  marginBottom: "8px",
                  backgroundColor: conv.id === activeConversationId ? tk.accentSoft : tk.surface,
                  border: `1px solid ${conv.id === activeConversationId ? tk.accent : tk.border}`,
                  "--feeg-press-scale": 0.98,
                }}
              >
                <span style={{
                  color: conv.id === activeConversationId ? tk.accent : tk.text,
                  fontSize: tk.fontSize.sm,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {conv.title || t("ai_new_conversation")}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRequestDeleteConversation(conv); }}
                  aria-label={t("ai_delete_conversation")}
                  style={{ background: "none", border: "none", color: tk.textFaint, cursor: "pointer", padding: "6px", display: "flex", flexShrink: 0 }}
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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

      <style jsx global>{`
        .ia-typing-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          display: inline-block;
          animation: ia-typing-bounce 1.1s infinite ease-in-out;
        }
        @keyframes ia-typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ia-typing-dot { animation: none; opacity: 0.8; }
        }
      `}</style>
    </Layout>
  );
}

function iconButtonStyle(tk) {
  return {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    borderRadius: tk.radius.sm,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: tk.transition,
  };
}
