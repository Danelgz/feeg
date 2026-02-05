import Sidebar from "./Sidebar";
import { useUser } from "../context/UserContext";
import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

export default function Layout({ children }) {
  const { theme, isMobile: userIsMobile } = useUser();
  const isDark = theme === 'dark';
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  // Usar la detección de UserContext si está disponible, si no usar el estado local
  const currentIsMobile = userIsMobile !== undefined ? userIsMobile : isMobile;

  useEffect(() => {
    // Aplicar color de fondo al body para evitar bordes blancos y mejorar el scroll en móvil
    document.body.style.backgroundColor = isDark ? "#0f0f0f" : "#f0f2f5";
    document.documentElement.style.backgroundColor = isDark ? "#0f0f0f" : "#f0f2f5";
  }, [isDark]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: currentIsMobile ? "column" : "row",
      minHeight: "100vh", 
      fontFamily: "Arial, sans-serif", 
      backgroundColor: isDark ? "#0f0f0f" : "#f0f2f5",
      color: isDark ? "#fff" : "#333",
      transition: "background-color 0.3s ease",
    }}>
      <Head>
        <title>FEEG - Tu App de Entrenamiento</title>
        <link rel="icon" href="/logo2.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <style>{`
          html, body {
            margin: 0;
            padding: 0;
            background-color: ${isDark ? "#0f0f0f" : "#f0f2f5"};
            transition: background-color 0.3s ease;
            height: 100%;
            width: 100%;
          }
          #__next {
            min-height: 100%;
          }
          @keyframes fadeInPage {
            0% {
              opacity: 0;
              transform: translateY(10px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .page-transition {
            animation: fadeInPage 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            will-change: opacity, transform;
          }
        `}</style>
      </Head>
      <Sidebar />
      
      {/* Botón de Retroceder */}
      {router.asPath !== "/" && (
        <button
          onClick={() => router.back()}
          style={{
            position: "fixed",
            top: "15px",
            left: currentIsMobile ? "15px" : "235px", // Ajustado para no solapar el sidebar en PC
            zIndex: 2000,
            width: "45px",
            height: "45px",
            borderRadius: "50%",
            backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
            border: `2px solid #1dd1a1`,
            color: "#1dd1a1",
            cursor: "pointer",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: "1.2rem",
            fontWeight: "bold",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            transition: "all 0.2s ease"
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = "#1dd1a1";
            e.currentTarget.style.color = "#000";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = isDark ? "#1a1a1a" : "#ffffff";
            e.currentTarget.style.color = "#1dd1a1";
          }}
        >
          ←
        </button>
      )}

      <main 
        key={router.asPath}
        className="page-transition"
        style={{ 
          flex: 1, 
          padding: currentIsMobile ? "15px" : "20px", 
          backgroundColor: isDark ? "#0f0f0f" : "#f0f2f5", 
          color: isDark ? "#fff" : "#333",
          transition: "background-color 0.3s ease",
          width: "100%",
          boxSizing: "border-box"
        }}
      >
        {children}
      </main>
    </div>
  );
}
