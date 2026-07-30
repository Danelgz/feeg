import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Layout se sustituye por un paso a través: arrastra Sidebar/BottomNavigation y con ellos next/link
// y el router, que no aportan nada a lo que se comprueba aquí (la composición de la propia página).
vi.mock("../components/Layout", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("../lib/firebase", () => ({
  onAuthChange: () => () => {},
  signInWithGoogle: vi.fn(),
  getGoogleRedirectResult: vi.fn(() => Promise.resolve(null)),
  signOutUser: vi.fn(),
  ensureFreshAuthToken: vi.fn(() => Promise.resolve()),
  saveToCloud: vi.fn(),
  getFromCloud: vi.fn(() => Promise.resolve(null)),
  deleteFromCloud: vi.fn(),
  getPublicWorkoutDocId: vi.fn(),
  bulkSaveWorkoutsToCloud: vi.fn(),
  getAllUserWorkouts: vi.fn(() => Promise.resolve([])),
  deleteAllPublicWorkoutsForUser: vi.fn(),
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  getFollowersCount: vi.fn(),
  getFollowersList: vi.fn(() => Promise.resolve([])),
  getFollowingList: vi.fn(() => Promise.resolve([])),
  subscribeToNotifications: vi.fn(() => () => {}),
  markNotificationsRead: vi.fn(),
}));

import { UserProvider } from "../context/UserContext";
import Statistics from "../pages/statistics";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Entreno con fecha relativa a hoy, para que caiga dentro o fuera de la ventana del filtro. */
function workout(daysAgo: number, volume: number, id: string) {
  return {
    id,
    name: `Entreno ${id}`,
    completedAt: new Date(Date.now() - daysAgo * DAY_MS).toISOString(),
    exercises: 4,
    series: 12,
    totalReps: 100,
    totalVolume: volume,
    elapsedTime: 3600,
  };
}

function renderStats() {
  return render(
    <UserProvider>
      <Statistics />
    </UserProvider>
  );
}

const tab = (name: string) => screen.getByRole("tab", { name });

describe("pantalla de estadísticas", () => {
  beforeEach(() => {
    localStorage.clear();
    // 12.000 kg en los últimos 7 días y 6.000 kg en los 7 anteriores → +100% de variación.
    localStorage.setItem(
      "completedWorkouts",
      JSON.stringify([workout(1, 7200, "a"), workout(3, 4800, "b"), workout(9, 6000, "c")])
    );
  });

  it("presenta las vistas como chips accesibles, sin la rejilla de tarjetas con descripción", async () => {
    renderStats();
    const tabs = await screen.findAllByRole("tab");
    // 8 vistas + 4 periodos (Resumen es la vista inicial y sí usa periodo).
    expect(tabs).toHaveLength(12);
    expect(tab("Rangos")).toBeTruthy();
    expect(tab("Resumen").getAttribute("aria-selected")).toBe("true");

    // Las descripciones de las antiguas tarjetas de navegación ya no ocupan pantalla.
    expect(screen.queryByText("Visión general de tu progreso")).toBeNull();
    expect(screen.queryByText("Tus marcas personales y cuándo las batiste")).toBeNull();
  });

  it("muestra el volumen del periodo como métrica protagonista con su variación", async () => {
    renderStats();
    // 7200 + 4800 en los últimos 7 días, con separador de miles español.
    expect(await screen.findByText("12.000")).toBeTruthy();
    expect(screen.getByText("kg")).toBeTruthy();
    // Frente a los 6.000 kg de los 7 días anteriores.
    expect(screen.getByText(/100%/)).toBeTruthy();
    expect(screen.getByText(/vs 7 días antes/)).toBeTruthy();
  });

  it("solo ofrece el filtro de periodo en las vistas que de verdad reaccionan a él", async () => {
    renderStats();
    expect(await screen.findByRole("tab", { name: "7 días" })).toBeTruthy();

    // Récords mira al histórico completo a propósito: ofrecer un filtro que no hace nada engaña.
    fireEvent.click(tab("Récords"));
    await waitFor(() => {
      expect(screen.queryByRole("tab", { name: "7 días" })).toBeNull();
    });

    // Series por grupo sí lo usa, así que vuelve a aparecer.
    fireEvent.click(tab("Series por grupo"));
    expect(await screen.findByRole("tab", { name: "7 días" })).toBeTruthy();
  });

  it("no repite los totales del periodo encima de las vistas de contenido histórico", async () => {
    renderStats();
    expect(await screen.findByText("Racha semanal")).toBeTruthy();

    fireEvent.click(tab("Mapa muscular"));
    await waitFor(() => {
      expect(screen.queryByText("Racha semanal")).toBeNull();
    });
    expect(screen.queryByText("Volumen medio")).toBeNull();
  });

  it("cuenta la racha por semanas cumplidas y no la altera el filtro de periodo", async () => {
    // Tres entrenos hoy: siempre caen en la semana en curso, sea el día de la semana que sea cuando
    // corra el test (por eso no se usan fechas relativas de días, que dependerían del calendario).
    localStorage.setItem(
      "completedWorkouts",
      JSON.stringify([workout(0, 500, "a"), workout(0, 500, "b"), workout(0, 500, "c"), workout(40, 900, "viejo")])
    );
    renderStats();

    expect(await screen.findByText("1 semana")).toBeTruthy();
    expect(screen.getByText(/3 de 3 esta semana/)).toBeTruthy();

    // Cambiar a "Todo" no toca la racha: se calcula siempre sobre el histórico completo.
    fireEvent.click(tab("Todo"));
    await waitFor(() => {
      expect(screen.getByText("1 semana")).toBeTruthy();
    });
    expect(screen.getByText(/3 de 3 esta semana/)).toBeTruthy();
  });

  it("no rompe la racha por una semana en curso a medias", async () => {
    // Un solo entreno hoy: 1 de 3, semana en progreso. No hay racha, pero tampoco un "0" acusador
    // por una semana que aún no ha terminado.
    localStorage.setItem("completedWorkouts", JSON.stringify([workout(0, 500, "a")]));
    renderStats();

    expect(await screen.findByText("Sin racha")).toBeTruthy();
    expect(screen.getByText(/1 de 3 esta semana/)).toBeTruthy();
  });
});
