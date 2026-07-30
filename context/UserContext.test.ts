import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Estado compartido con el mock de lib/firebase. `gate` permite dejar una sincronización a medias
// para poder inspeccionar el estado MIENTRAS está en vuelo (que es justo cuando se decide si se
// tapa la app con la pantalla de carga o no).
type Gate = { promise: Promise<void>; open: () => void };

function makeGate(): Gate {
  let open!: () => void;
  const promise = new Promise<void>((resolve) => {
    open = () => resolve();
  });
  return { promise, open };
}

const cloud = {
  /** Cuántas veces se ha leído users/{uid}, es decir cuántas sincronizaciones han arrancado. */
  reads: 0,
  gate: null as Gate | null,
  profile: null as Record<string, unknown> | null,
};

let authCallback: ((user: unknown) => void) | null = null;

vi.mock("../lib/firebase", () => ({
  onAuthChange: (cb: (user: unknown) => void) => {
    authCallback = cb;
    return () => {};
  },
  signInWithGoogle: vi.fn(),
  getGoogleRedirectResult: vi.fn(() => Promise.resolve(null)),
  signOutUser: vi.fn(() => Promise.resolve()),
  ensureFreshAuthToken: vi.fn(() => Promise.resolve()),
  saveToCloud: vi.fn(() => Promise.resolve()),
  getFromCloud: vi.fn(async (path: string) => {
    if (!path.startsWith("users/")) return null; // usersPublic/{uid}
    cloud.reads += 1;
    if (cloud.gate) await cloud.gate.promise;
    return cloud.profile ? { profile: cloud.profile } : null;
  }),
  deleteFromCloud: vi.fn(() => Promise.resolve()),
  getPublicWorkoutDocId: vi.fn(),
  bulkSaveWorkoutsToCloud: vi.fn(() => Promise.resolve()),
  getAllUserWorkouts: vi.fn(() => Promise.resolve([])),
  deleteAllPublicWorkoutsForUser: vi.fn(() => Promise.resolve()),
  followUser: vi.fn(() => Promise.resolve()),
  unfollowUser: vi.fn(() => Promise.resolve()),
  getFollowersCount: vi.fn(() => Promise.resolve(0)),
  getFollowersList: vi.fn(() => Promise.resolve([])),
  getFollowingList: vi.fn(() => Promise.resolve([])),
  subscribeToNotifications: vi.fn(() => () => {}),
  markNotificationsRead: vi.fn(() => Promise.resolve()),
}));

import { UserProvider, useUser } from "./UserContext";

// UserContext.js no está tipado (createContext() sin genérico), así que el valor del contexto llega
// como `undefined` a TS. Solo se declara aquí lo que estas pruebas tocan.
type Ctx = {
  isLoaded: boolean;
  isSyncing: boolean;
  isInitialSync: boolean;
  refreshData: (force?: boolean) => Promise<void>;
};

const useCtx = () => useUser() as unknown as Ctx;

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(UserProvider, null, children);

/** Renderiza el provider y simula que Firebase ya ha resuelto la sesión. */
async function mountSignedIn() {
  const view = renderHook(() => useCtx(), { wrapper });
  await act(async () => {
    authCallback?.({ uid: "u1", email: "a@b.c", displayName: "A", photoURL: null });
  });
  return view;
}

describe("UserContext — sincronización con la nube", () => {
  beforeEach(() => {
    localStorage.clear();
    cloud.reads = 0;
    cloud.gate = null;
    cloud.profile = { username: "danel" };
    authCallback = null;
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-30T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("no vuelve a leer la nube al cambiar de apartado dentro de la ventana de reutilización", async () => {
    const { result } = await mountSignedIn();
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(cloud.reads).toBe(1);

    // Tres cambios de apartado seguidos: cada página llama a refreshData() al montar.
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await result.current.refreshData();
      });
    }

    expect(cloud.reads).toBe(1);
    expect(result.current.isSyncing).toBe(false);
  });

  it("vuelve a sincronizar cuando la ventana ha expirado", async () => {
    const { result } = await mountSignedIn();
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(cloud.reads).toBe(1);

    vi.setSystemTime(new Date("2026-07-30T10:01:01Z")); // +61s

    await act(async () => {
      await result.current.refreshData();
    });

    expect(cloud.reads).toBe(2);
  });

  it("refreshData(true) se salta la ventana", async () => {
    const { result } = await mountSignedIn();
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(async () => {
      await result.current.refreshData(true);
    });

    expect(cloud.reads).toBe(2);
  });

  it("deduplica llamadas simultáneas en una sola lectura", async () => {
    const { result } = await mountSignedIn();
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    vi.setSystemTime(new Date("2026-07-30T10:02:00Z"));

    cloud.gate = makeGate();
    let settled = 0;
    await act(async () => {
      const a = result.current.refreshData().then(() => { settled += 1; });
      const b = result.current.refreshData().then(() => { settled += 1; });
      cloud.gate!.open();
      await Promise.all([a, b]);
    });

    expect(cloud.reads).toBe(2); // la del montaje + una sola de las dos simultáneas
    // Las dos llamadas esperan la sincronización de verdad, no salen en seco: es lo que permite que
    // `refreshData(true).then(() => setIsLoaded(true))` siga siendo correcto.
    expect(settled).toBe(2);
  });

  it("marca isInitialSync en la carga en frío (sin nada en localStorage)", async () => {
    cloud.gate = makeGate();
    const { result } = await mountSignedIn();

    await waitFor(() => expect(result.current.isSyncing).toBe(true));
    expect(result.current.isInitialSync).toBe(true);

    await act(async () => {
      cloud.gate!.open();
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.isSyncing).toBe(false));
    expect(result.current.isInitialSync).toBe(false);
  });

  it("no marca isInitialSync si hay datos locales que mostrar", async () => {
    localStorage.setItem("userProfile", JSON.stringify({ username: "danel" }));
    cloud.gate = makeGate();
    const { result } = await mountSignedIn();

    await waitFor(() => expect(result.current.isSyncing).toBe(true));
    // Sincronizando, pero con el perfil ya en pantalla: revalidación de fondo, sin overlay.
    expect(result.current.isInitialSync).toBe(false);

    await act(async () => {
      cloud.gate!.open();
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.isSyncing).toBe(false));
  });

  it("no arranca la ventana de reutilización si la sincronización falla", async () => {
    const { getFromCloud } = await import("../lib/firebase");
    const { result } = await mountSignedIn();
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(cloud.reads).toBe(1);

    // Ventana expirada: este intento sí sale, pero la red falla.
    vi.setSystemTime(new Date("2026-07-30T10:01:01Z"));
    vi.mocked(getFromCloud).mockRejectedValueOnce(new Error("red caída"));
    await act(async () => {
      await result.current.refreshData();
    });
    expect(cloud.reads).toBe(1); // el mock rechazado no llega a contar

    // 4s después: si el fallo hubiera arrancado la ventana, esto saldría en seco y el usuario se
    // quedaría con los datos locales casi un minuto. Tiene que reintentar.
    vi.setSystemTime(new Date("2026-07-30T10:01:05Z"));
    await act(async () => {
      await result.current.refreshData();
    });
    expect(cloud.reads).toBe(2);
  });
});
