import Link from "next/link";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { getTokens } from "../lib/tokens";
import { Button } from "../components/ui";

// Next sirve una 404 en texto plano si no existe esta página: fondo blanco, Times New Roman y sin
// salida. Va dentro de Layout a propósito, para que la navegación siga estando ahí — un callejón sin
// salida es peor que el propio error.
export default function NotFound() {
  const { theme, isMobile } = useUser();
  const tk = getTokens(theme === "dark");

  return (
    <Layout>
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          minHeight: "60dvh",
          padding: isMobile ? tk.space.xl : tk.space.huge,
        }}
      >
        <span
          style={{
            fontSize: isMobile ? "4.5rem" : "6rem",
            fontWeight: tk.weight.heavy,
            lineHeight: 1,
            letterSpacing: "-0.04em",
            // El número como elemento gráfico, no como texto: relleno degradado que se apaga hacia
            // abajo para que pese sin competir con el mensaje.
            background: `linear-gradient(180deg, ${tk.text} 0%, ${tk.textFaint} 100%)`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          404
        </span>

        <h1
          style={{
            fontSize: isMobile ? tk.fontSize.xl : "1.7rem",
            fontWeight: tk.weight.bold,
            color: tk.text,
            margin: `${tk.space.lg} 0 ${tk.space.sm}`,
          }}
        >
          Esta página no existe
        </h1>
        <p style={{ color: tk.textMuted, fontSize: tk.fontSize.md, maxWidth: "38ch", margin: 0 }}>
          El enlace puede estar roto o la página haberse movido. Tus entrenos y rutinas están intactos.
        </p>

        <div style={{ display: "flex", gap: tk.space.md, marginTop: tk.space.huge, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <Button isDark={tk.isDark} icon="home">Ir al inicio</Button>
          </Link>
          <Link href="/routines" style={{ textDecoration: "none" }}>
            <Button isDark={tk.isDark} variant="secondary" icon="dumbbell">Mis rutinas</Button>
          </Link>
        </div>
      </main>
    </Layout>
  );
}
