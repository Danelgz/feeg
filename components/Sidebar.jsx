import Link from "next/link";
import { useUser } from "../context/UserContext";

export default function Sidebar() {
  const { theme } = useUser();
  const isDark = theme === 'dark';

  const links = [
    { name: "Feed", href: "/" },
    { name: "Rutinas", href: "/routines" },
    { name: "Ejercicios", href: "/exercises" },
    { name: "Perfil", href: "/profile" },
    { name: "Ajustes", href: "/settings" }
  ];

  return (
    <aside style={{
      width: "220px",
      backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
      color: isDark ? "#fff" : "#333",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "15px",
      minHeight: "100vh",
      borderRight: isDark ? "2px solid #333" : "2px solid #e0e0e0",
      transition: "all 0.3s ease"
    }}>
      <h2 style={{ margin: 0, color: isDark ? "#fff" : "#333", fontSize: "1.5rem" }}>FEEG</h2>
      {links.map(link => (
        <Link key={link.name} href={link.href} style={{
          color: isDark ? "#fff" : "#333",
          textDecoration: "none",
          padding: "10px",
          borderRadius: "5px",
          transition: "0.2s",
          backgroundColor: "transparent"
        }}>
          {link.name}
        </Link>
      ))}
    </aside>
  );
}
