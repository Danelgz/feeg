// Definiciones puras de iconos (estilo outline 24x24, stroke=currentColor, strokeWidth=2 —
// mismo estilo que ya usaba BottomNavigation.jsx). Cada icono es una lista de shapes SVG;
// components/ui/Icon.jsx se encarga de renderizarlas.

export const ICONS = {
  home: [
    { tag: 'path', d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
    { tag: 'polyline', points: '9 22 9 12 15 12 15 22' },
  ],
  dumbbell: [
    { tag: 'path', d: 'M4 9v6', strokeLinecap: 'round' },
    { tag: 'path', d: 'M2 10v4', strokeLinecap: 'round' },
    { tag: 'path', d: 'M20 9v6', strokeLinecap: 'round' },
    { tag: 'path', d: 'M22 10v4', strokeLinecap: 'round' },
    { tag: 'line', x1: 6, y1: 12, x2: 18, y2: 12 },
  ],
  list: [
    { tag: 'line', x1: 8, y1: 6, x2: 21, y2: 6 },
    { tag: 'line', x1: 8, y1: 12, x2: 21, y2: 12 },
    { tag: 'line', x1: 8, y1: 18, x2: 21, y2: 18 },
    { tag: 'line', x1: 3, y1: 6, x2: 3.01, y2: 6 },
    { tag: 'line', x1: 3, y1: 12, x2: 3.01, y2: 12 },
    { tag: 'line', x1: 3, y1: 18, x2: 3.01, y2: 18 },
  ],
  zap: [{ tag: 'polygon', points: '13 2 3 14 12 14 11 22 21 10 12 10 13 2', fill: 'currentColor', stroke: 'none' }],
  utensils: [
    { tag: 'path', d: 'M3 2v7a2 2 0 0 0 2 2h1v11' },
    { tag: 'path', d: 'M6 2v7' },
    { tag: 'path', d: 'M9 2v7' },
    { tag: 'path', d: 'M17 2c-2.5 2-2.5 5.5-2.5 8.5 0 2 1.2 3 2.5 3v8.5' },
  ],
  barChart: [
    { tag: 'line', x1: 18, y1: 20, x2: 18, y2: 10 },
    { tag: 'line', x1: 12, y1: 20, x2: 12, y2: 4 },
    { tag: 'line', x1: 6, y1: 20, x2: 6, y2: 14 },
  ],
  user: [
    { tag: 'path', d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' },
    { tag: 'circle', cx: 12, cy: 7, r: 4 },
  ],
  download: [
    { tag: 'path', d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' },
    { tag: 'polyline', points: '7 10 12 15 17 10' },
    { tag: 'line', x1: 12, y1: 15, x2: 12, y2: 3 },
  ],
  settings: [
    { tag: 'circle', cx: 12, cy: 12, r: 3 },
    {
      tag: 'path',
      d: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
    },
  ],
  menu: [
    { tag: 'line', x1: 3, y1: 6, x2: 21, y2: 6 },
    { tag: 'line', x1: 3, y1: 12, x2: 21, y2: 12 },
    { tag: 'line', x1: 3, y1: 18, x2: 21, y2: 18 },
  ],
  close: [
    { tag: 'line', x1: 18, y1: 6, x2: 6, y2: 18 },
    { tag: 'line', x1: 6, y1: 6, x2: 18, y2: 18 },
  ],
  chevronLeft: [{ tag: 'polyline', points: '15 18 9 12 15 6' }],
  chevronRight: [{ tag: 'polyline', points: '9 18 15 12 9 6' }],
  check: [{ tag: 'polyline', points: '20 6 9 17 4 12' }],
  plus: [
    { tag: 'line', x1: 12, y1: 5, x2: 12, y2: 19 },
    { tag: 'line', x1: 5, y1: 12, x2: 19, y2: 12 },
  ],
  moon: [{ tag: 'path', d: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z' }],
  sun: [
    { tag: 'circle', cx: 12, cy: 12, r: 5 },
    { tag: 'line', x1: 12, y1: 1, x2: 12, y2: 3 },
    { tag: 'line', x1: 12, y1: 21, x2: 12, y2: 23 },
    { tag: 'line', x1: 4.22, y1: 4.22, x2: 5.64, y2: 5.64 },
    { tag: 'line', x1: 18.36, y1: 18.36, x2: 19.78, y2: 19.78 },
    { tag: 'line', x1: 1, y1: 12, x2: 3, y2: 12 },
    { tag: 'line', x1: 21, y1: 12, x2: 23, y2: 12 },
    { tag: 'line', x1: 4.22, y1: 19.78, x2: 5.64, y2: 18.36 },
    { tag: 'line', x1: 18.36, y1: 5.64, x2: 19.78, y2: 4.22 },
  ],
  monitor: [
    { tag: 'rect', x: 2, y: 3, width: 20, height: 14, rx: 2 },
    { tag: 'line', x1: 8, y1: 21, x2: 16, y2: 21 },
    { tag: 'line', x1: 12, y1: 17, x2: 12, y2: 21 },
  ],
  search: [
    { tag: 'circle', cx: 11, cy: 11, r: 8 },
    { tag: 'line', x1: 21, y1: 21, x2: 16.65, y2: 16.65 },
  ],
  bell: [
    { tag: 'path', d: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9' },
    { tag: 'path', d: 'M13.73 21a2 2 0 0 1-3.46 0' },
  ],
  trash: [
    { tag: 'polyline', points: '3 6 5 6 21 6' },
    { tag: 'path', d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' },
  ],
  edit: [
    { tag: 'path', d: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' },
    { tag: 'path', d: 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' },
  ],
  clock: [
    { tag: 'circle', cx: 12, cy: 12, r: 10 },
    { tag: 'polyline', points: '12 6 12 12 16 14' },
  ],
  users: [
    { tag: 'path', d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' },
    { tag: 'circle', cx: 9, cy: 7, r: 4 },
    { tag: 'path', d: 'M23 21v-2a4 4 0 0 0-3-3.87' },
    { tag: 'path', d: 'M16 3.13a4 4 0 0 1 0 7.75' },
  ],
  heart: [{ tag: 'path', d: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' }],
  message: [{ tag: 'path', d: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z' }],
  flame: [{ tag: 'path', d: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z' }],
  alertCircle: [
    { tag: 'circle', cx: 12, cy: 12, r: 10 },
    { tag: 'line', x1: 12, y1: 8, x2: 12, y2: 12 },
    { tag: 'line', x1: 12, y1: 16, x2: 12.01, y2: 16 },
  ],
  moreVertical: [
    { tag: 'circle', cx: 12, cy: 5, r: 1.2, fill: 'currentColor' },
    { tag: 'circle', cx: 12, cy: 12, r: 1.2, fill: 'currentColor' },
    { tag: 'circle', cx: 12, cy: 19, r: 1.2, fill: 'currentColor' },
  ],
  arrowRight: [
    { tag: 'line', x1: 5, y1: 12, x2: 19, y2: 12 },
    { tag: 'polyline', points: '12 5 19 12 12 19' },
  ],
  trendUp: [
    { tag: 'polyline', points: '22 7 13.5 15.5 8.5 10.5 2 17' },
    { tag: 'polyline', points: '16 7 22 7 22 13' },
  ],
  share: [
    { tag: 'circle', cx: 18, cy: 5, r: 3 },
    { tag: 'circle', cx: 6, cy: 12, r: 3 },
    { tag: 'circle', cx: 18, cy: 19, r: 3 },
    { tag: 'line', x1: 8.59, y1: 13.51, x2: 15.42, y2: 17.49 },
    { tag: 'line', x1: 15.41, y1: 6.51, x2: 8.59, y2: 10.49 },
  ],
};
