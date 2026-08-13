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
// Mancuernas/polea viven ahora en su propia subpágina de Ajustes (ver components/settings/
// SettingsMenuRow.jsx), no en pages/settings.js -- ese archivo pasó a ser sólo el menú.
import SettingsEquipment from "../pages/settings/equipment";

function renderSettings() {
  render(
    <UserProvider>
      <SettingsEquipment />
    </UserProvider>
  );
}

describe("ajustes · cómo se registran mancuernas y poleas", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("userProfile", JSON.stringify({ name: "Test", sex: "male", weightUnit: "kg" }));
  });

  it("por defecto marca 'peso de una' y 'no me ayuda', sin tocar el perfil guardado", async () => {
    renderSettings();

    expect(await screen.findByText("Cómo registras tus pesos")).toBeTruthy();
    const perHand = screen.getByRole("button", { name: /El peso de una/ });
    const asShown = screen.getByRole("button", { name: /No, es la carga real/ });
    expect(perHand.getAttribute("aria-pressed")).toBe("true");
    expect(asShown.getAttribute("aria-pressed")).toBe("true");
  });

  it("guarda en el perfil al elegir 'peso de las dos juntas', sin perder el resto de campos", async () => {
    renderSettings();
    await screen.findByText("Cómo registras tus pesos");

    fireEvent.click(screen.getByRole("button", { name: /El peso de las dos juntas/ }));

    const stored = JSON.parse(localStorage.getItem("userProfile") || "{}");
    expect(stored.dumbbellMode).toBe("combined");
    // El sexo y la unidad de peso, que ya estaban guardados, no se pisan al cambiar este campo.
    expect(stored.sex).toBe("male");
    expect(stored.weightUnit).toBe("kg");

    const combined = await screen.findByRole("button", { name: /El peso de las dos juntas/ });
    expect(combined.getAttribute("aria-pressed")).toBe("true");
  });

  it("guarda en el perfil al elegir que la polea ayuda", async () => {
    renderSettings();
    await screen.findByText("Cómo registras tus pesos");

    fireEvent.click(screen.getByRole("button", { name: /Sí, me ayuda a tirar más/ }));

    const stored = JSON.parse(localStorage.getItem("userProfile") || "{}");
    expect(stored.pulleyMode).toBe("assisted");
  });
});
