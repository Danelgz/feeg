import { UserProvider } from "../context/UserContext";
import { InteractionStyles } from "../components/ui";

export default function App({ Component, pageProps }) {
  return (
    <UserProvider>
      {/* Primitivas de interacción globales (pulsación, hover solo con puntero, anillo de foco).
          Va aquí y no en Layout para que alcance también a pantallas que no lo usen. */}
      <InteractionStyles />
      <Component {...pageProps} />
    </UserProvider>
  );
}
