import Sidebar from "./Sidebar";
import { useUser } from "../context/UserContext";
import { useState, useEffect } from "react";
import Head from "next/head";

export default function Layout({ children }) {
  const { theme } = useUser();
  const isDark = theme === 'dark';
  const [isMobile, setIsMobile] = useState(false);

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
      </Head>
      <Sidebar />
      <main style={{ 
        flex: 1, 
        padding: isMobile ? "10px" : "20px", 
        backgroundColor: isDark ? "#0f0f0f" : "#f0f2f5", 
        color: isDark ? "#fff" : "#333",
        transition: "all 0.3s ease",
        width: "100%",
        boxSizing: "border-box"
      }}>
        {children}
      </main>
    </div>
  );
}
