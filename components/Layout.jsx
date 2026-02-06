import Sidebar from "./Sidebar";
import { useUser } from "../context/UserContext";
import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

export default function Layout({ children }) {
  const { theme, isMobile: userIsMobile, activeRoutine, endRoutine } = useUser();
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
        <link rel="icon" href="/logo3.png" />
        <link rel="apple-touch-icon" href="/logo3.png" />
        <link rel="shortcut icon" href="/logo3.png" />
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
              transform: translateY(5px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .page-transition {
            animation: fadeInPage 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;
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

      {/* Pestaña de Rutina Activa */}
      {activeRoutine && router.asPath !== activeRoutine.path && (
        <div style={{
          position: "fixed",
          bottom: currentIsMobile ? "80px" : "20px",
          right: "20px",
          backgroundColor: isDark ? "#1a1a1a" : "#fff",
          border: "2px solid #1dd1a1",
          borderRadius: "12px",
          padding: "15px",
          boxShadow: "0 8px 25px rgba(0,0,0,0.4)",
          zIndex: 3000,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          minWidth: "220px",
          animation: "fadeInUp 0.3s ease-out"
        }}>
          <style>{`
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ 
                fontSize: "0.75rem", 
                color: isDark ? "#aaa" : "#666", 
                textTransform: "uppercase",
                letterSpacing: "1px",
                fontWeight: "bold"
              }}>
                Rutina en curso
              </span>
              <span style={{ 
                fontWeight: "bold", 
                color: isDark ? "#fff" : "#333", 
                fontSize: "1.1rem",
                marginTop: "2px"
              }}>
                {activeRoutine.name}
              </span>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); endRoutine(); }}
              title="Borrar rutina"
              style={{
                background: isDark ? "#333" : "#eee",
                border: "none",
                color: "#ff4d4d",
                cursor: "pointer",
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1rem",
                fontWeight: "bold",
                transition: "all 0.2s ease"
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
              onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
            >×</button>
          </div>
          <button 
            onClick={() => router.push(activeRoutine.path)}
            style={{
              backgroundColor: "#1dd1a1",
              color: "#000",
              border: "none",
              borderRadius: "8px",
              padding: "10px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "0.95rem",
              marginTop: "5px",
              transition: "all 0.2s ease",
              boxShadow: "0 4px 10px rgba(29, 209, 161, 0.3)"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "#19b088";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "#1dd1a1";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Continuar Rutina
          </button>
        </div>
      )}
    </div>
  );
}
