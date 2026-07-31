import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

const BODYWEIGHT = 80;

function lift(name: string, muscleGroup: string, weight: number, reps: number) {
  return { name, muscleGroup, series: [{ reps, weight, type: "normal" }] };
}

/** Historial con varios grupos a niveles claramente distintos, para poder comprobar el orden. */
function seed(details: ReturnType<typeof lift>[]) {
  localStorage.setItem(
    "completedWorkouts",
    JSON.stringify([
      {
        id: "w1",
        name: "Entreno",
        completedAt: new Date().toISOString(),
        totalVolume: 5000,
        exerciseDetails: details,
      },
    ])
  );
  localStorage.setItem("measures", JSON.stringify([{ date: new Date().toISOString(), weight: BODYWEIGHT }]));
  localStorage.setItem("userProfile", JSON.stringify({ name: "Test", sex: "male", weightUnit: "kg" }));
}

function renderRanks() {
  render(
    <UserProvider>
      <Statistics />
    </UserProvider>
  );
  fireEvent.click(screen.getByRole("tab", { name: "Rangos" }));
}

describe("estadísticas · rangos", () => {
  beforeEach(() => {
    localStorage.clear();
    seed([
      // Sentadilla a 1.9× el peso corporal: nivel alto. Press de banca a 0.75×: bastante más bajo.
      lift("Sentadilla (Barra)", "Cuádriceps", 150, 1),
      lift("Press de Banca (Barra)", "Pecho", 60, 1),
      lift("Curl de Bíceps (Barra)", "Bíceps", 40, 1),
    ]);
  });

  it("anuncia el rango global como titular, con nivel y grupos puntuados", async () => {
    renderRanks();

    expect(await screen.findByText("Rango global")).toBeTruthy();
    // El nivel global es la media de los grupos, así que cae entre el mejor y el peor.
    expect(screen.getByText(/Nivel \d+ de 30/)).toBeTruthy();
    expect(screen.getByText(/3 grupos · 3 ejercicios/)).toBeTruthy();
  });

  it("ofrece la siguiente subida en kilos concretos en vez de un percentil inventado", async () => {
    renderRanks();

    // La promesa es un peldaño real y verificable: kilos, ejercicio y el grupo que sube.
    const milestone = await screen.findByText(/kg/, { selector: "strong" });
    expect(milestone.textContent).toMatch(/^\+[\d.]+ kg$/);
    expect(screen.getByText(/sube a/)).toBeTruthy();
  });

  it("lista un grupo por fila, ordenados de mayor a menor rango", async () => {
    renderRanks();
    await screen.findByText("Rankings musculares");

    const rows = screen.getAllByRole("button", { expanded: false });
    const groups = rows.map((row) => row.textContent || "");
    // Cuádriceps (1.9× peso corporal en sentadilla) va por delante de Pecho (0.75× en banca).
    const quads = groups.findIndex((text) => text.startsWith("Cuádriceps"));
    const chest = groups.findIndex((text) => text.startsWith("Pecho"));
    expect(quads).toBeGreaterThanOrEqual(0);
    expect(chest).toBeGreaterThan(quads);
  });

  it("despliega los ejercicios del grupo en el sitio, sin salir de la vista", async () => {
    renderRanks();
    await screen.findByText("Rankings musculares");

    const row = screen.getAllByRole("button", { expanded: false }).find((b) => b.textContent?.startsWith("Cuádriceps"));
    expect(row).toBeTruthy();
    // El ejercicio que sostiene el rango no se ve hasta abrir la fila.
    expect(screen.queryByText("Sentadilla (Barra)")).toBeNull();

    fireEvent.click(row!);

    expect(await screen.findByText("Sentadilla (Barra)")).toBeTruthy();
    // Sigue habiendo lista: no se ha navegado a una pantalla de detalle.
    expect(screen.getByText("Rankings musculares")).toBeTruthy();
    expect(screen.queryByText("Volver al mapa")).toBeNull();
    expect(row!.getAttribute("aria-expanded")).toBe("true");
  });

  it("enseña como pendientes los grupos que pueden puntuar, y omite los que no", async () => {
    renderRanks();
    const list = (await screen.findByText("Rankings musculares")).closest("section")!;

    // Espalda tiene baremos de sobra y aún no se ha entrenado: es una tarea pendiente real.
    expect(within(list).getByText("Espalda")).toBeTruthy();
    expect(within(list).getAllByText(/Sin rango todavía/).length).toBeGreaterThan(0);

    // Cuello no tiene ni un ejercicio puntuable: no es que falte entrenarlo, es que no puede subir.
    expect(within(list).queryByText("Cuello")).toBeNull();
  });

  it("manda a registrar el peso corporal cuando no hay con qué comparar", async () => {
    localStorage.removeItem("measures");
    renderRanks();

    expect(await screen.findByText("Falta tu peso corporal")).toBeTruthy();
    expect(screen.queryByText("Rango global")).toBeNull();
  });

  it("no deja la escalera de rangos como diez muestras de color sueltas", async () => {
    renderRanks();
    await screen.findByText("Tu cuerpo por rango");

    // La leyenda es una tira continua con los dos extremos escritos, no una pastilla por rango.
    await waitFor(() => {
      expect(screen.getByText("Principiante")).toBeTruthy();
      expect(screen.getByText("Leyenda")).toBeTruthy();
    });
    expect(screen.queryByText("Disciplinado")).toBeNull();
  });
});
