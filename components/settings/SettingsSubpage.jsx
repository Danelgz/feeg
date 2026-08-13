import Layout from "../Layout";
import { PageHeader, Card } from "../ui";

/**
 * Envoltorio compartido por cada subpágina de Ajustes: mismo `Layout` (que ya pone la flecha de
 * "atrás" sola, ver `Layout.jsx`), mismo `PageHeader` y misma `Card` que tenía la página única
 * antes de partirse — así cada apartado no reinventa su propio layout.
 */
export default function SettingsSubpage({ isDark, isMobile, title, subtitle, children }) {
  return (
    <Layout>
      <PageHeader isDark={isDark} isMobile={isMobile} title={title} subtitle={subtitle} />
      <Card isDark={isDark} padding={isMobile ? "sm" : "lg"} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {children}
      </Card>
    </Layout>
  );
}
