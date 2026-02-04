import Sidebar from "./Sidebar";
import { useUser } from "../context/UserContext";

export default function Layout({ children }) {
  const { theme } = useUser();
  const isDark = theme === 'dark';

  return (
    <div style={{ 
      display: "flex", 
      minHeight: "100vh", 
      fontFamily: "Arial, sans-serif", 
      backgroundColor: isDark ? "#0f0f0f" : "#f0f2f5",
      color: isDark ? "#fff" : "#333",
      transition: "all 0.3s ease"
    }}>
      <Sidebar />
      <main style={{ 
        flex: 1, 
        padding: "20px", 
        backgroundColor: isDark ? "#0f0f0f" : "#f0f2f5", 
        color: isDark ? "#fff" : "#333",
        transition: "all 0.3s ease"
      }}>
        {children}
      </main>
    </div>
  );
}
