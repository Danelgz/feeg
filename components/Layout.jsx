import Sidebar from "./Sidebar";
import { useUser } from "../context/UserContext";
import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

export default function Layout({ children }) {
  const { theme } = useUser();
  const isDark = theme === 'dark';
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

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
      flexDirection: isMobile ? "column" : "row",
      minHeight: "100vh", 
      fontFamily: "Arial, sans-serif", 
      backgroundColor: isDark ? "#0f0f0f" : "#f0f2f5",
      color: isDark ? "#fff" : "#333",
      transition: "all 0.3s ease",
      paddingBottom: isMobile ? "70px" : "0" // Espacio para el bottom nav
    }}>
      <Head>
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
            from {
              opacity: 0;
              transform: translateY(5px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .page-transition {
            animation: fadeInPage 0.4s ease-out forwards;
          }
        `}</style>
      </Head>
      <Sidebar />
      <main 
        key={router.asPath}
        className="page-transition"
        style={{ 
          flex: 1, 
          padding: isMobile ? "10px" : "20px", 
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
