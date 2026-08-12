import { useState, useRef, useEffect, useCallback } from "react";
import { getAuth } from "firebase/auth";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { useVoice } from "../hooks/useVoice";
import { getTokens } from "../lib/tokens";
import { Icon, Button, PageHeader, ConfirmModal, EmptyState, ChipNav } from "../components/ui";
import TrainingGenerator from "../components/ai/TrainingGenerator";
import TechniqueExplorer from "../components/ai/TechniqueExplorer";
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

// Sugerencias de arranque del chat vacío: reducen la fricción de la hoja en blanco con un ejemplo
// de lo que el Coach IA puede hacer de verdad (consultar datos reales, proponer cambios) en vez de
// dejar que el usuario adivine qué preguntar.
const QUICK_PROMPTS = [
  "¿Cómo va mi progreso este mes?",
  "Crea una rutina de empuje para hoy",
  "¿En qué grupo muscular estoy más flojo?",
  "Explícame la técnica del peso muerto",
];

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

  const handleSendMessage = async (overrideText) => {
    const userMessage = (overrideText ?? chatInput).trim();
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

  // Estilo compartido de campos de formulario del chat, derivado de los tokens en vez de hex
  // sueltos con ternarias de tema repetidas.
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

  // Altura del panel de chat: en móvil se resta el hueco real de la cabecera (campana, ~59px),
  // el bloque de título+pestañas compacto (~46px+50px con sus márgenes) y el hueco reservado para
  // la navegación inferior fija de Layout.jsx (80px) — 235px en total. En escritorio se deja un
  // margen generoso con un techo para que no se estire sin límite en pantallas muy altas. No hay
  // forma de medirlo con exactitud sin JS de layout, así que se deja algo de margen de seguridad.
  const chatPanelHeight = isMobile ? "calc(100dvh - 235px)" : "min(700px, calc(100vh - 220px))";
  const chatPanelMinHeight = isMobile ? "400px" : "460px";

  // En móvil, el historial/nueva conversación/voz viven en la cabecera de la página en vez de en
  // una fila propia dentro de la tarjeta de chat — dos cabeceras apiladas (título de página +
  // barra de acciones del chat) es exactamente el chrome de sobra que hacía sentir la conversación
  // pequeña. En escritorio esas acciones siguen donde estaban (la tarjeta ya tiene sitio de sobra).
  const chatHeaderActions = isMobile && activeTab === "chat" ? (
    <div style={{ display: "flex", gap: "6px" }}>
      <button onClick={() => setShowHistoryOverlay(true)} aria-label={t("ai_conversation_history")} style={{ ...iconButtonStyle(tk), color: tk.text, backgroundColor: tk.surface, border: `1px solid ${tk.border}` }}>
        <Icon name="clock" size={17} />
      </button>
      <button onClick={handleNewConversation} aria-label={t("ai_new_conversation")} style={{ ...iconButtonStyle(tk), color: tk.text, backgroundColor: tk.surface, border: `1px solid ${tk.border}` }}>
        <Icon name="plus" size={17} />
      </button>
      <button onClick={() => setAiVoiceEnabled(!aiVoiceEnabled)} title={t("ai_voice_enable_label")} style={{ ...iconButtonStyle(tk), color: aiVoiceEnabled ? tk.accent : tk.textFaint, backgroundColor: tk.surface, border: `1px solid ${aiVoiceEnabled ? tk.accent : tk.border}` }}>
        <Icon name={aiVoiceEnabled ? "volume2" : "volumeX"} size={17} />
      </button>
    </div>
  ) : undefined;

  return (
    <Layout>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: isMobile ? "12px 12px 0" : "20px" }}>
        <PageHeader
          isDark={isDark}
          isMobile={isMobile}
          compact
          title={t("ai_chat_title")}
          subtitle={isMobile ? undefined : "Tu entrenador virtual, con acceso a tus datos reales."}
          actions={chatHeaderActions}
        />

        <div style={{ marginBottom: isMobile ? "8px" : "18px" }}>
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
              {/* En móvil estas mismas acciones viven en la cabecera de la página (ver
                  chatHeaderActions) — repetirlas aquí sería la fila de sobra que se quitó. */}
              {!isMobile && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderBottom: `1px solid ${tk.border}`,
                  flexShrink: 0,
                }}>
                  <span style={{ color: tk.textMuted, fontSize: tk.fontSize.xs, fontWeight: tk.weight.medium }}>
                    {conversations.find((c) => c.id === activeConversationId)?.title || t("ai_new_conversation")}
                  </span>
                  <button
                    onClick={() => setAiVoiceEnabled(!aiVoiceEnabled)}
                    title={t("ai_voice_enable_label")}
                    style={{ ...iconButtonStyle(tk), color: aiVoiceEnabled ? tk.accent : tk.textFaint }}
                  >
                    <Icon name={aiVoiceEnabled ? "volume2" : "volumeX"} size={18} />
                  </button>
                </div>
              )}

              <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "12px" : "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                {messages.length === 0 && (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "18px" }}>
                    <EmptyState isDark={isDark} icon="message" title={t("ai_chat_empty")} />
                    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px", maxWidth: "460px", padding: "0 12px" }}>
                      {QUICK_PROMPTS.map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => handleSendMessage(prompt)}
                          disabled={isLoadingChat}
                          className="feeg-surface feeg-press feeg-hover"
                          style={{
                            padding: "9px 14px",
                            borderRadius: tk.radius.pill,
                            fontSize: tk.fontSize.xs,
                            cursor: "pointer",
                            "--feeg-bg": tk.surfaceAlt,
                            "--feeg-fg": tk.text,
                            "--feeg-border": tk.border,
                            "--feeg-hover-fg": tk.accent,
                            "--feeg-hover-border": tk.accent,
                            "--feeg-border-width": "1px",
                            "--feeg-press-scale": 0.96,
                          }}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
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

              <div style={{ display: "flex", gap: "8px", padding: isMobile ? "8px 10px" : "12px 16px", borderTop: `1px solid ${tk.border}`, flexShrink: 0 }}>
                <button
                  onClick={handleMicClick}
                  title={voice.sttSupported ? t("ai_listening") : t("ai_mic_not_supported")}
                  style={{
                    background: voice.isListening ? tk.danger : tk.surfaceAlt,
                    border: `1px solid ${voice.isListening ? tk.danger : tk.border}`,
                    color: voice.isListening ? "#fff" : tk.text,
                    borderRadius: tk.radius.md,
                    width: isMobile ? "42px" : "46px",
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
                  style={{ ...fieldStyle, flex: 1, padding: isMobile ? "10px 12px" : "12px 14px" }}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                  disabled={isLoadingChat}
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={isLoadingChat || !chatInput.trim()}
                  style={{
                    background: `linear-gradient(135deg, ${tk.accent} 0%, ${tk.accentHover} 100%)`,
                    color: tk.onAccent,
                    border: "none",
                    borderRadius: tk.radius.md,
                    width: isMobile ? "42px" : "46px",
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

        {/* Generador de entrenamientos — cuestionario paso a paso, ver components/ai/TrainingGenerator */}
        {activeTab === "training" && (
          <TrainingGenerator isDark={isDark} isMobile={isMobile} onSaveRoutine={saveRoutine} showNotification={showNotification} />
        )}

        {/* Explorador de técnica — buscador + catálogo navegable, ver components/ai/TechniqueExplorer */}
        {activeTab === "technique" && (
          <TechniqueExplorer isDark={isDark} isMobile={isMobile} showNotification={showNotification} />
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
