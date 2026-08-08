import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import MuscleMap from './MuscleMap';
import { ANATOMY_VIEW_BOX as MALE_VIEW_BOX } from '../data/muscleMapPaths';
import { ANATOMY_VIEW_BOX as FEMALE_VIEW_BOX } from '../data/muscleMapPathsFemale';

/** Todos los <path> de músculo que hay en pantalla, de las dos figuras. */
function musclePaths(container: HTMLElement): SVGPathElement[] {
  return [...container.querySelectorAll<SVGPathElement>('g[role="button"] path')];
}

function withStroke(container: HTMLElement) {
  return musclePaths(container).filter((p) => {
    const s = p.getAttribute('stroke');
    return s !== null && s !== 'none';
  });
}

const SERIES = { Pecho: 12, Cuádriceps: 6, Abdomen: 2 } as const;

describe.each([
  { sex: 'male', viewBox: MALE_VIEW_BOX },
  { sex: 'female', viewBox: FEMALE_VIEW_BOX },
] as const)('MuscleMap · cuerpo $sex', ({ sex, viewBox }) => {
  it('dibuja el cuerpo que corresponde al sexo', () => {
    const { container } = render(<MuscleMap seriesByMuscle={SERIES} sex={sex} />);
    const svgs = [...container.querySelectorAll('svg')];
    expect(svgs).toHaveLength(2);
    for (const svg of svgs) expect(svg.getAttribute('viewBox')).toBe(viewBox);
  });

  // El mapa separa un músculo del siguiente con el hueco de la propia anatomía, no con un trazo, y
  // eso vale también para el músculo señalado: al pasar por encima cambia la franja de lectura de
  // abajo, no el contorno del dibujo. Es fácil que vuelva a colarse un trazo "solo para el hover",
  // así que se comprueba en los dos estados.
  it('no pone trazo a ningún músculo, ni en reposo ni al señalarlo', () => {
    const { container } = render(<MuscleMap seriesByMuscle={SERIES} sex={sex} />);
    expect(musclePaths(container).length).toBeGreaterThan(0);
    expect(withStroke(container)).toHaveLength(0);

    const region = screen.getAllByRole('button', { name: /^Pecho:/ })[0];
    fireEvent.mouseEnter(region);

    // La franja de lectura confirma que el estado activo se ha encendido de verdad: sin esto, el
    // test pasaría igual si el hover dejara de funcionar.
    const readout = container.querySelector('[aria-live="polite"]') as HTMLElement;
    expect(within(readout).getByText(/12 series/)).toBeTruthy();
    expect(withStroke(container)).toHaveLength(0);
  });
});
