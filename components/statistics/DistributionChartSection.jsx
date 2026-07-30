import { EmptyState } from "../ui";
import StatSection from "./StatSection";
import BarList from "./BarList";

export default function DistributionChartSection({ isDark, isMobile, seriesByGroup, t }) {
  const entries = Object.entries(seriesByGroup).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  const items = entries.map(([group, n]) => ({
    key: group,
    label: t(group) || group,
    value: n,
    // El recuento crudo vivía solo dentro del tooltip. Ahora se imprime, que era lo único que el
    // tooltip aportaba sobre lo ya visible.
    detail: n > 0 ? `${n} series` : undefined,
  }));

  return (
    <StatSection
      title="Distribución muscular"
      meta={total > 0 ? `${total} series totales` : undefined}
      isDark={isDark}
      isMobile={isMobile}
    >
      {total === 0 ? (
        <EmptyState
          isDark={isDark}
          icon="barChart"
          title={t("stats_no_data")}
          description="Cuando registres series verás qué porcentaje del trabajo se lleva cada grupo."
        />
      ) : (
        <BarList
          items={items}
          isDark={isDark}
          scale="total"
          formatValue={(value, sum) => `${Math.round((value / (sum || 1)) * 100)}%`}
        />
      )}
    </StatSection>
  );
}
