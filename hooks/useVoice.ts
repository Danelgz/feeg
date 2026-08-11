import { useCallback, useEffect, useRef, useState } from "react";

export interface VoiceSettings {
  enabled: boolean;
  voiceURI: string | null;
  rate: number;
  pitch: number;
}

/**
 * Envoltorio fino sobre las Web Speech APIs del navegador — dictado (SpeechRecognition) y
 * lectura en voz alta (SpeechSynthesis) del Coach IA, sin backend ni coste: coherente con usar
 * el plan gratuito de Gemini. Se degrada en silencio si el navegador no las soporta (típico en
 * Safari/iOS para el dictado); el chat sigue funcionando por texto.
 */
export function useVoice(settings: VoiceSettings) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const recognitionRef = useRef<any>(null);

  const sttSupported =
    typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const ttsSupported = typeof window !== "undefined" && !!window.speechSynthesis;

  useEffect(() => {
    if (!ttsSupported) return;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [ttsSupported]);

  useEffect(() => {
    // Al desmontar (salir del chat) no debe quedar el micro escuchando ni una frase a medias.
    return () => {
      recognitionRef.current?.stop();
      if (ttsSupported) window.speechSynthesis.cancel();
    };
  }, [ttsSupported]);

  const startListening = useCallback(
    (onResult: (text: string) => void, lang = "es-ES") => {
      if (!sttSupported) return false;
      const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = lang;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (e: any) => {
        const text = e.results?.[0]?.[0]?.transcript;
        if (text) onResult(text);
      };
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognitionRef.current = recognition;
      setIsListening(true);
      recognition.start();
      return true;
    },
    [sttSupported]
  );

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!ttsSupported || !settings.enabled || !text) return;
      window.speechSynthesis.cancel(); // no solapar lecturas si llega una respuesta nueva
      const utterance = new SpeechSynthesisUtterance(text);
      const chosenVoice = voices.find((v) => v.voiceURI === settings.voiceURI);
      if (chosenVoice) utterance.voice = chosenVoice;
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.lang = chosenVoice?.lang || "es-ES";
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [ttsSupported, settings.enabled, settings.voiceURI, settings.rate, settings.pitch, voices]
  );

  const stopSpeaking = useCallback(() => {
    if (ttsSupported) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [ttsSupported]);

  return { isListening, isSpeaking, voices, sttSupported, ttsSupported, startListening, stopListening, speak, stopSpeaking };
}
