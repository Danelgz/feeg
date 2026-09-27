import { describe, expect, it } from "vitest";
import { compareWithPrevious, findPreviousSameWorkout, resolveElapsedSeconds, signed } from "./sessionCompare";

const w = (id: string, name: string, date: string, totalVolume: number, series: number, minutes: number) => ({
  id,
  name,
  completedAt: date,
  totalVolume,
  series,
  elapsedTime: minutes * 60,
});

describe("findPreviousSameWorkout", () => {
  const history = [
    w("1", "Empuje", "2026-09-01T10:00:00Z", 5000, 12, 60),
    w("2", "Tirón", "2026-09-05T10:00:00Z", 6000, 10, 55),
    w("3", "empuje ", "2026-09-10T10:00:00Z", 5200, 12, 58),
    w("4", "Empuje", "2026-09-20T10:00:00Z", 5400, 13, 62),
  ];

  it("elige la más reciente anterior con el mismo nombre (sin distinguir mayúsculas/espacios)", () => {
    const current = w("5", "Empuje", "2026-09-15T10:00:00Z", 5500, 14, 57);
    expect(findPreviousSameWorkout(current, history)?.id).toBe("3");
  });

  it("ignora el propio entreno aunque ya esté en el historial", () => {
    const current = history[3];
    expect(findPreviousSameWorkout(current, history)?.id).toBe("3");
  });

  it("devuelve null si no hay uno anterior igual", () => {
    expect(findPreviousSameWorkout(w("9", "Pierna", "2026-09-30T10:00:00Z", 1, 1, 1), history)).toBeNull();
    expect(findPreviousSameWorkout(w("9", "", "2026-09-30T10:00:00Z", 1, 1, 1), history)).toBeNull();
  });
});

describe("compareWithPrevious", () => {
  it("calcula las diferencias de volumen, minutos y series", () => {
    const prev = w("1", "Empuje", "2026-09-01T10:00:00Z", 5000, 12, 60);
    const cur = w("2", "Empuje", "2026-09-08T10:00:00Z", 5500, 14, 55);
    expect(compareWithPrevious(cur, [prev])).toEqual({
      previousDate: "2026-09-01T10:00:00Z",
      volumeDelta: 500,
      volumePct: 10,
      minutesDelta: -5,
      seriesDelta: 2,
    });
  });

  it("sin volumen previo no inventa un porcentaje", () => {
    const prev = w("1", "Empuje", "2026-09-01T10:00:00Z", 0, 12, 60);
    const cur = w("2", "Empuje", "2026-09-08T10:00:00Z", 100, 12, 60);
    expect(compareWithPrevious(cur, [prev])?.volumePct).toBeNull();
  });
});

describe("signed", () => {
  it("usa signo tipográfico y miles con punto", () => {
    expect(signed(1320)).toBe("+1320".replace("1320", (1320).toLocaleString("es-ES")));
    expect(signed(-15)).toBe("−15");
    expect(signed(0)).toBe("=");
  });
});


describe("resolveElapsedSeconds", () => {
  it("conserva el tiempo real si no se tocó la duración", () => {
    expect(resolveElapsedSeconds(3725, 62)).toBe(3725);
  });
  it("usa la duración corregida si se cambió", () => {
    expect(resolveElapsedSeconds(3 * 3600, 60)).toBe(3600);
    expect(resolveElapsedSeconds(600, "45")).toBe(2700);
  });
  it("ignora valores vacíos o no válidos", () => {
    expect(resolveElapsedSeconds(600, "")).toBe(600);
    expect(resolveElapsedSeconds(600, 0)).toBe(600);
    expect(resolveElapsedSeconds(600, null)).toBe(600);
  });
});
