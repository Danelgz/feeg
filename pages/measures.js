import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";

export default function Measures() {
  const { isDark } = useUser();
  return (
    <Layout>
      <div style={{ backgroundColor: "#000", color: "#fff", minHeight: "100vh", padding: "20px" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: "bold" }}>Medidas Corporales</h1>
        <p style={{ color: "#aaa" }}>Próximamente: Registra y visualiza tu progreso físico.</p>
      </div>
    </Layout>
  );
}
