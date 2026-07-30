import { Outfit } from "next/font/google";
import { UserProvider } from "../context/UserContext";
import { InteractionStyles } from "../components/ui";

// La app venía con la pila de fuentes del sistema (-apple-system, Segoe UI, Roboto...), que es
// exactamente la tipografía que tiene cualquier web sin decidir: distinta en cada plataforma y sin
// carácter propio. Outfit es geométrica, moderna y con numerales muy legibles, que en una app llena
// de cifras (volumen, series, récords) importa más que en una web normal.
// `next/font` la autoaloja en el build: no hay petición a Google en runtime ni parpadeo de fuente.
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-feeg",
  display: "swap",
});

export default function App({ Component, pageProps }) {
  return (
    <UserProvider>
      {/* Primitivas de interacción globales (pulsación, hover solo con puntero, anillo de foco,
          grano de fondo). Va aquí y no en Layout para que alcance también a pantallas que no lo usen. */}
      <InteractionStyles />
      {/* `display: contents` expone la variable de la fuente a todo el árbol sin introducir una caja
          de layout que pudiera afectar al posicionado existente. */}
      <div className={outfit.variable} style={{ display: "contents" }}>
        <Component {...pageProps} />
      </div>
    </UserProvider>
  );
}
