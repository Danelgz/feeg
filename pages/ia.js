import { useState, useEffect, useCallback, useMemo } from "react";
import { getAuth } from "firebase/auth";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { useVoice } from "../hooks/useVoice";
import { getTokens } from "../lib/tokens";
import { Icon, PageHeader, ConfirmModal, ChipNav } from "../components/ui";
import CoachChat from "../components/ai/CoachChat";
import { useRanks } from "../hooks/useRanks";
import { compactWorkouts, rankSnapshot, bodySnapshot, smartPrompts } from "../lib/aiContext";
import { resolveWeeklyGoal } from "../lib/exerciseStats";
import { getRankPosition } from "../data/ranks";
import TrainingGenerator from "../components/ai/TrainingGenerator";
import TechniqueExplorer from "../components/ai/TechniqueExplorer";
import BodyAnalyzer from "../components/ai/BodyAnalyzer";
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

const TABS = [
  { key: "chat", label: "Coach" },
  { key: "training", label: "Rutina IA" },
  { key: "technique", label: "Técnica" },
  { key: "body", label: "Físico" },
];

export default function IA() {
  const {
    theme, isMobile, t, user, authUser, routines, saveRoutine, updateRoutine, saveCompletedWorkout, showNotification,
    aiVoiceEnabled, setAiVoiceEnabled, aiVoiceURI, aiVoiceRate, aiVoicePitch,
    completedWorkouts, measures, loginWithGoogle,
  } = useUser();
  const ranks = useRanks();
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("chat"); // chat, training, technique

  useEffect(() => {
    if (!router.isReady) return;
    const requestedTab = Array.isArray(router.query.tab) ? router.query.tab[0] : router.query.tab;
    if (TABS.some((tab) => tab.key === requestedTab)) setActiveTab(requestedTab);
  }, [router.isReady, router.query.tab]);

  // States for Chat — conversaciones independientes en vez de un único hilo.
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
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
  // Sugerencias de seguimiento y herramientas consultadas en la última respuesta. Sólo en memoria:
  // son contexto del momento, no parte de la conversación guardada.
  const [lastMeta, setLastMeta] = useState(null);

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

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setPendingAction(null);
    setLastMeta(null);
    voice.stopSpeaking();
    setShowHistoryOverlay(false);
  };

  const handleSelectConversation = (id) => {
    setActiveConversationId(id);
    setPendingAction(null);
    setLastMeta(null);
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

  // Lo que el coach "ve": el historial local compacto (FEEG es local-first y la nube puede ir por
  // detrás), los rangos tal como salen en Estadísticas y el peso corporal. Ver lib/aiContext.ts.
  const weeklyGoal = resolveWeeklyGoal(user);
  const buildClientContext = () => ({
    workouts: compactWorkouts(completedWorkouts || []),
    routines: (routines || []).slice(0, 60).map((r) => ({ id: r.id, name: r.name, exercises: (r.exercises || []).map((e) => ({ name: e.name, group: e.group || e.muscleGroup })) })),
    ranks: rankSnapshot(ranks),
    body: bodySnapshot(measures, user),
    weeklyGoal,
  });

  const prompts = useMemo(() => smartPrompts(completedWorkouts || [], ranks), [completedWorkouts, ranks]);
  const contextChips = useMemo(() => {
    const chips = [];
    const n = (completedWorkouts || []).length;
    if (n) chips.push({ icon: "dumbbell", label: `${n} ${n === 1 ? "entreno" : "entrenos"}` });
    if ((routines || []).length) chips.push({ icon: "list", label: `${routines.length} ${routines.length === 1 ? "rutina" : "rutinas"}` });
    if (ranks.available && Object.keys(ranks.groupRanks).length) chips.push({ icon: "award", label: getRankPosition(ranks.overallLevel, ranks.prestigeLevels).label });
    if (ranks.bodyweightKg) chips.push({ icon: "activity", label: `${Math.round(ranks.bodyweightKg)} kg` });
    chips.push({ icon: "target", label: `${weeklyGoal} entrenos/semana` });
    return chips;
  }, [completedWorkouts, routines, ranks, weeklyGoal]);

  /** Pide la respuesta para `userMessage` sobre `history`. Guarda la respuesta del modelo. */
  const requestReply = async (conversationId, history, userMessage) => {
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
        userProfile: user,
        clientContext: buildClientContext(),
      })
    });

    const data = await response.json();
    const reply = response.ok
      ? data.reply
      : "Ha ocurrido un error contactando con mis servidores. Por favor, inténtalo de nuevo en unos segundos.";

    if (!response.ok) console.error('Error del servidor:', data.error);

    await addAiMessage(authUser.uid, conversationId, 'assistant', reply);
    setLastMeta(response.ok ? { suggestions: data.suggestions || [], toolsUsed: data.toolsUsed || [] } : null);
    if (response.ok && data.pendingAction) setPendingAction(data.pendingAction);
    if (aiVoiceEnabled) voice.speak(reply);
  };

  const handleSendMessage = async (text) => {
    const userMessage = String(text || "").trim();
    if (!userMessage || !authUser?.uid) return;

    setPendingAction(null);
    setLastMeta(null);
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
      await requestReply(conversationId, history, userMessage);
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      showNotification("Hubo un problema al enviar tu mensaje. Revisa tu conexión.", 'error');
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Si la petición falló sin respuesta (red caída), la pregunta queda sola al final: reintentar la
  // reenvía sin duplicarla en la conversación.
  const handleRetry = async () => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'user' || !activeConversationId || !authUser?.uid) return;
    setIsLoadingChat(true);
    try {
      const history = messages.slice(-11, -1).map(m => ({ role: m.role, content: m.content }));
      await requestReply(activeConversationId, history, last.content);
    } catch (error) {
      console.error('Error reintentando:', error);
      showNotification("Sigue sin haber conexión. Inténtalo en un momento.", 'error');
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
    // El dictado se envía directamente: dictar y luego tener que pulsar "enviar" es un paso de más.
    voice.startListening((text) => handleSendMessage(text));
  }, [voice, showNotification, t]);

  // En móvil, el historial/nueva conversación/voz viven en la cabecera de la página en vez de en
  // una fila propia dentro de la tarjeta de chat — dos cabeceras apiladas (título de página +
  // barra de acciones del chat) es exactamente el chrome de sobra que hacía sentir la conversación
  // pequeña. En escritorio esas acciones siguen donde estaban (la tarjeta ya tiene sitio de sobra).
  const headerButton = (label, icon, onClick, active = false) => (
    <button onClick={onClick} aria-label={label} title={label} className="feeg-press" style={{ width: 38, height: 38, display: "grid", placeItems: "center", border: "none", borderRadius: 12, cursor: "pointer", background: tk.hairline, color: active ? tk.accent : tk.text }}>
      <Icon name={icon} size={18} />
    </button>
  );
  const chatHeaderActions = activeTab === "chat" && authUser ? (
    <div style={{ display: "flex", gap: "6px" }}>
      {isMobile && headerButton(t("ai_conversation_history"), "history", () => setShowHistoryOverlay(true))}
      {headerButton(t("ai_voice_enable_label"), aiVoiceEnabled ? "volume2" : "volumeX", () => setAiVoiceEnabled(!aiVoiceEnabled), aiVoiceEnabled)}
      {headerButton(t("ai_new_conversation"), "plus", handleNewConversation)}
    </div>
  ) : undefined;

  const conversationRow = (conv) => {
    const active = conv.id === activeConversationId;
    return (
      <div
        key={conv.id}
        role="button"
        tabIndex={0}
        onClick={() => handleSelectConversation(conv.id)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleSelectConversation(conv.id)}
        className="feeg-press"
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 10px", borderRadius: 10, cursor: "pointer", background: active ? tk.accentSoft : "transparent", "--feeg-press-scale": 0.98 }}
      >
        <span style={{ color: active ? tk.accent : tk.textFaint, display: "flex" }}><Icon name="message" size={15} /></span>
        <span style={{ flex: 1, minWidth: 0, fontSize: "0.86rem", fontWeight: active ? 700 : 500, color: active ? tk.accent : tk.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {conv.title || t("ai_new_conversation")}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); handleRequestDeleteConversation(conv); }}
          aria-label={t("ai_delete_conversation")}
          className="feeg-surface feeg-press feeg-hover"
          style={{ border: "none", cursor: "pointer", padding: 4, display: "flex", flexShrink: 0, borderRadius: 8, "--feeg-fg": tk.textFaint, "--feeg-hover-fg": tk.danger, "--feeg-border-width": "0px", "--feeg-press-scale": 0.85 }}
        >
          <Icon name="trash" size={14} />
        </button>
      </div>
    );
  };

  return (
    <Layout gutter>
      <div style={{ maxWidth: activeTab === "chat" && !isMobile ? "1040px" : "900px", margin: "0 auto" }}>
        <PageHeader
          isDark={isDark}
          isMobile={isMobile}
          compact
          title={t("ai_chat_title")}
          subtitle={isMobile ? undefined : "Tu entrenador personal, con acceso a tus datos reales."}
          actions={chatHeaderActions}
        />

        <div style={{ marginBottom: isMobile ? 12 : 18 }}>
          <ChipNav items={TABS} activeKey={activeTab} onChange={setActiveTab} isDark={isDark} variant="underline" fill={isMobile} ariaLabel="Secciones del Coach IA" />
        </div>

        {activeTab === "chat" && (
          <div style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
            {/* Historial en escritorio: columna plana a la izquierda, sin tarjeta. */}
            {!isMobile && authUser && (
              <aside style={{ width: 230, flexShrink: 0, position: "sticky", top: 20, maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 800, color: tk.textFaint, textTransform: "uppercase", letterSpacing: "0.1em", padding: "4px 10px 8px" }}>
                  Conversaciones
                </div>
                {conversations.length === 0 ? (
                  <div style={{ color: tk.textMuted, fontSize: "0.8rem", padding: "6px 10px" }}>{t("ai_no_conversations")}</div>
                ) : (
                  conversations.map(conversationRow)
                )}
              </aside>
            )}

            <div style={{ flex: 1, minWidth: 0, maxWidth: 760 }}>
              <CoachChat
                isDark={isDark}
                isMobile={isMobile}
                signedIn={!!authUser}
                onLogin={loginWithGoogle}
                userName={user?.firstName || user?.username}
                contextChips={contextChips}
                prompts={prompts}
                messages={messages}
                isLoading={isLoadingChat}
                lastMeta={lastMeta}
                pendingAction={pendingAction}
                isApplyingAction={isApplyingAction}
                onConfirmAction={handleConfirmAction}
                onDismissAction={handleDismissAction}
                onSend={handleSendMessage}
                onRetry={handleRetry}
                placeholder={t("ai_chat_placeholder")}
                voice={{
                  isListening: voice.isListening,
                  isSpeaking: voice.isSpeaking,
                  onMic: handleMicClick,
                  onSpeak: (text) => voice.speak(text),
                  onStopSpeaking: voice.stopSpeaking,
                }}
              />
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

        {/* Analizador corporal multimodal — subida privada en memoria + lectura estructurada de Gemini */}
        {activeTab === "body" && (
          <BodyAnalyzer isDark={isDark} isMobile={isMobile} />
        )}
      </div>

      {/* Historial de conversaciones en móvil: hoja a pantalla completa. */}
      {isMobile && showHistoryOverlay && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: tk.bg, zIndex: 3000, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${tk.hairline}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <span style={{ color: tk.text, fontWeight: 800, fontSize: "1.05rem" }}>{t("ai_conversation_history")}</span>
            <button onClick={() => setShowHistoryOverlay(false)} aria-label="Cerrar" className="feeg-press" style={{ width: 36, height: 36, display: "grid", placeItems: "center", border: "none", borderRadius: 10, background: tk.hairline, color: tk.text, cursor: "pointer" }}>
              <Icon name="close" size={18} />
            </button>
          </div>
          <div style={{ padding: "12px 16px 4px" }}>
            <button onClick={handleNewConversation} className="feeg-press" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", border: "none", borderRadius: 12, background: tk.accent, color: tk.onAccent, fontWeight: 800, fontSize: "0.9rem", cursor: "pointer" }}>
              <Icon name="plus" size={16} /> {t("ai_new_conversation")}
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px 24px" }}>
            {conversations.length === 0 ? (
              <div style={{ color: tk.textMuted, fontSize: "0.86rem", padding: "24px 12px", textAlign: "center" }}>{t("ai_no_conversations")}</div>
            ) : (
              conversations.map(conversationRow)
            )}
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
    </Layout>
  );
}
