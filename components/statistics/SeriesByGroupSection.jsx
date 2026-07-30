import { EmptyState } from "../ui";
import StatSection from "./StatSection";
import BarList from "./BarList";

export default function SeriesByGroupSection({ isDark, isMobile, seriesByGroup, t }) {
  const entries = Object.entries(seriesByGroup).sort((a, b) => b[1] - a[1]);
  const activeGroups = entries.filter(([, n]) => n > 0).length;
  const items = entries.map(([group, n]) => ({ key: group, label: t(group) || group, value: n }));

  return (
    <StatSection
      title="Series por grupo muscular"
      meta={entries.length > 0 ? `${activeGroups} grupos activos` : undefined}
      isDark={isDark}
      isMobile={isMobile}
    >
      {entries.length === 0 ? (
        <EmptyState
          isDark={isDark}
          icon="barChart"
          title={t("stats_no_data")}
          description="Completa un entrenamiento y aquí verás cuántas series le dedicas a cada grupo."
        />
      ) : (
        // `max` y no `total`: aquí la pregunta es "¿qué grupo entreno más y cuáles se me quedan
        // atrás?", y comparar contra el mayor hace visible el desequilibrio. El reparto porcentual
        // sobre el total es lo que responde la vista de Distribución.
        <BarList items={items} isDark={isDark} scale="max" />
      )}
    </StatSection>
  );
}
