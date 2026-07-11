import { useState } from 'react';
import {
  DECORATIVE_SHAPES,
  MUSCLE_REGIONS,
  VIEW_BOX,
  type BodyView,
  type MuscleGroup,
  type RegionShape,
} from '../data/muscleMapRegions';

export type IntensityLevel = 0 | 1 | 2 | 3 | 4;

export interface MuscleMapProps {
  /** Series entrenadas por grupo muscular (p. ej. en la última semana). */
  seriesByMuscle: Partial<Record<MuscleGroup, number>>;
  isDark?: boolean;
  /** Umbrales de series para pasar de un nivel a otro. Por defecto: [1, 4, 8, 12]. */
  thresholds?: [number, number, number, number];
  onMuscleClick?: (group: MuscleGroup) => void;
  labelForGroup?: (group: MuscleGroup) => string;
}

const DEFAULT_THRESHOLDS: [number, number, number, number] = [1, 4, 8, 12];

const LEVEL_COLORS: Record<IntensityLevel, string> = {
  0: '', // se resuelve según tema
  1: '#c4f5e7',
  2: '#8dedce',
  3: '#57e5b6',
  4: '#1dd1a1',
};

const LEVEL_LABELS: Record<Exclude<IntensityLevel, 0>, string> = {
  1: 'Bajo',
  2: 'Moderado',
  3: 'Alto',
  4: 'Muy alto',
};

function getIntensity(value: number, thresholds: [number, number, number, number]): IntensityLevel {
  if (value <= 0) return 0;
  const [t1, t2, t3, t4] = thresholds;
  if (value >= t4) return 4;
  if (value >= t3) return 3;
  if (value >= t2) return 2;
  if (value >= t1) return 1;
  return 0;
}

function shapeToSvgProps(shape: RegionShape) {
  if (shape.kind === 'rect') {
    return { x: shape.x, y: shape.y, width: shape.width, height: shape.height, rx: shape.rx };
  }
  return { cx: shape.cx, cy: shape.cy, rx: shape.rx, ry: shape.ry };
}

interface Tooltip {
  x: number;
  y: number;
  group: MuscleGroup;
  value: number;
}

export default function MuscleMap({
  seriesByMuscle,
  isDark = false,
  thresholds = DEFAULT_THRESHOLDS,
  onMuscleClick,
  labelForGroup,
}: MuscleMapProps) {
  const [view, setView] = useState<BodyView>('front');
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  const neutralFill = isDark ? '#2a2a2a' : '#e2e2e2';
  const decorativeFill = isDark ? '#333' : '#d4d4d4';
  const strokeColor = isDark ? '#0f0f0f' : '#fff';

  const colorForLevel = (level: IntensityLevel) => (level === 0 ? neutralFill : LEVEL_COLORS[level]);

  const regions = MUSCLE_REGIONS.filter((r) => r.view === view);
  const decorative = DECORATIVE_SHAPES.filter((d) => d.view === view);

  const handleEnter = (e: React.MouseEvent, group: MuscleGroup, value: number) => {
    setTooltip({ x: e.clientX, y: e.clientY, group, value });
  };
  const handleMove = (e: React.MouseEvent) => {
    setTooltip((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : prev));
  };
  const handleLeave = () => setTooltip(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', width: '100%' }}>
      <div style={{ display: 'flex', gap: '10px' }}>
        {(['front', 'back'] as BodyView[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: '8px 16px',
              backgroundColor: view === v ? '#1dd1a1' : isDark ? '#1a1a1a' : '#fff',
              border: `1px solid ${view === v ? '#1dd1a1' : isDark ? '#333' : '#ddd'}`,
              borderRadius: '20px',
              color: view === v ? '#000' : isDark ? '#fff' : '#333',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {v === 'front' ? 'Vista Frontal' : 'Vista Posterior'}
          </button>
        ))}
      </div>

      <svg
        viewBox={VIEW_BOX}
        style={{ width: '100%', maxWidth: '260px', height: 'auto' }}
        onMouseMove={handleMove}
      >
        {decorative.map((d) => {
          const props = shapeToSvgProps(d.shape);
          return d.shape.kind === 'rect' ? (
            <rect key={d.id} {...props} fill={decorativeFill} />
          ) : (
            <ellipse key={d.id} {...props} fill={decorativeFill} />
          );
        })}

        {regions.map((region) => {
          const value = seriesByMuscle[region.group] || 0;
          const level = getIntensity(value, thresholds);
          const fill = colorForLevel(level);
          const props = shapeToSvgProps(region.shape);
          const shared = {
            fill,
            stroke: strokeColor,
            strokeWidth: 1.5,
            style: { cursor: onMuscleClick ? 'pointer' : 'default', transition: 'fill 0.25s ease' },
            onMouseEnter: (e: React.MouseEvent) => handleEnter(e, region.group, value),
            onMouseLeave: handleLeave,
            onClick: () => onMuscleClick?.(region.group),
          };
          return region.shape.kind === 'rect' ? (
            <rect key={region.id} {...props} {...shared} />
          ) : (
            <ellipse key={region.id} {...props} {...shared} />
          );
        })}
      </svg>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {([1, 2, 3, 4] as const).map((level) => (
          <div key={level} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '3px',
                backgroundColor: LEVEL_COLORS[level],
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: '0.75rem', color: isDark ? '#888' : '#666' }}>{LEVEL_LABELS[level]}</span>
          </div>
        ))}
      </div>

      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x + 12,
            top: tooltip.y - 36,
            backgroundColor: isDark ? '#1a1a1a' : '#333',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '0.9rem',
            fontWeight: 600,
            pointerEvents: 'none',
            zIndex: 9999,
            border: '1px solid #1dd1a1',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          {labelForGroup ? labelForGroup(tooltip.group) : tooltip.group}:{' '}
          <span style={{ color: '#1dd1a1' }}>{tooltip.value} series</span>
        </div>
      )}
    </div>
  );
}
