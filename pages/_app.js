import { UserProvider } from "../context/UserContext";
import { InteractionStyles } from "../components/ui";

export default function App({ Component, pageProps }) {
  return (
    <UserProvider>
      {/* Primitivas de interacción globales (pulsación, hover solo con puntero, anillo de foco,
          grano de fondo). */}
      <InteractionStyles />
      {/* La pila mantiene Outfit como mejora progresiva si está instalada y conserva un fallback
          estable sin depender de una descarga remota durante el build de producción. */}
      <div style={{ display: "contents", "--font-feeg": "Outfit" }}>
        <Component {...pageProps} />
      </div>
    </UserProvider>
  );
}
