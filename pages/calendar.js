import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";

export default function Calendar() {
  return (
    <Layout>
      <div style={{ backgroundColor: "#000", color: "#fff", minHeight: "100vh", padding: "20px" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: "bold" }}>Calendario</h1>
        <p style={{ color: "#aaa" }}>Próximamente: Visualiza tus entrenamientos pasados y planea los futuros.</p>
      </div>
    </Layout>
  );
}
