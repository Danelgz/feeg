import { fireEvent, render, screen } from "@testing-library/react";
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

function seed() {
  localStorage.setItem(
    "completedWorkouts",
    JSON.stringify([
      {
        id: "w1",
        name: "Entreno",
        completedAt: new Date().toISOString(),
        totalVolume: 5000,
        exerciseDetails: [
          // Puntuable: tiene baremo en data/strengthStandards.ts.
          { name: "Sentadilla (Barra)", muscleGroup: "Cuádriceps", series: [{ reps: 5, weight: 120, type: "normal" }] },
          // No puntuable: sin baremo, no debe enseñar insignia.
          { name: "Plancha", muscleGroup: "Abdomen", series: [{ reps: 1, weight: 0, type: "time" }] },
        ],
      },
    ])
  );
  localStorage.setItem("measures", JSON.stringify([{ date: new Date().toISOString(), weight: BODYWEIGHT }]));
  localStorage.setItem("userProfile", JSON.stringify({ name: "Test", sex: "male", weightUnit: "kg" }));
}

function renderExerciseStats() {
  render(
    <UserProvider>
      <Statistics />
    </UserProvider>
  );
  fireEvent.click(screen.getByRole("tab", { name: "Ejercicios" }));
}

describe("estadísticas · rango por ejercicio", () => {
  beforeEach(() => {
    localStorage.clear();
    seed();
  });

  it("enseña el rango junto a un ejercicio puntuable", async () => {
    renderExerciseStats();

    const card = (await screen.findByText("Sentadilla (Barra)")).closest("li")!;
    // 120 kg / 80 kg de peso corporal es un rango real, no un texto fijo — sólo se comprueba que
    // aparece ALGUNA insignia, no cuál exactamente (eso ya lo cubre rankEngine.test.ts).
    expect(card.textContent).toMatch(/× tu peso/);
  });

  it("no inventa un rango para un ejercicio sin baremo", async () => {
    renderExerciseStats();

    const card = (await screen.findByText("Plancha")).closest("li")!;
    expect(card.textContent).not.toMatch(/× tu peso/);
  });
});
