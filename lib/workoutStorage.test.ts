import { beforeEach, describe, expect, it } from "vitest";
import { clearSnapshot, loadSnapshot, readLiveElapsedFromSnapshot, saveSnapshot } from "./workoutStorage";
import { createEmptySession } from "../hooks/workoutSessionReducer";

beforeEach(() => {
  window.localStorage.clear();
});

describe("saveSnapshot / loadSnapshot", () => {
  it("round-trips a session for the same workoutId", () => {
    const state = { ...createEmptySession("w1"), name: "Empuje" };
    saveSnapshot(state);

    const loaded = loadSnapshot("w1");
    expect(loaded).toMatchObject({ workoutId: "w1", name: "Empuje" });
    // `savedAt` es un detalle de almacenamiento, no debe filtrarse al estado devuelto.
    expect(loaded).not.toHaveProperty("savedAt");
  });

  it("returns null when the saved snapshot belongs to a different workoutId", () => {
    saveSnapshot(createEmptySession("w1"));
    expect(loadSnapshot("w2")).toBeNull();
  });

  it("returns null when nothing has been saved", () => {
    expect(loadSnapshot("anything")).toBeNull();
  });

  it("returns null instead of throwing on corrupt JSON in storage", () => {
    window.localStorage.setItem("workoutSessionSnapshot", "{not valid json");
    expect(loadSnapshot("w1")).toBeNull();
  });
});

describe("clearSnapshot", () => {
  it("removes the stored snapshot", () => {
    saveSnapshot(createEmptySession("w1"));
    clearSnapshot();
    expect(loadSnapshot("w1")).toBeNull();
  });
});

describe("readLiveElapsedFromSnapshot", () => {
  it("returns null when there is no snapshot", () => {
    expect(readLiveElapsedFromSnapshot()).toBeNull();
  });

  it("returns null when the session is not ongoing", () => {
    saveSnapshot({ ...createEmptySession("w1"), status: "preview" });
    expect(readLiveElapsedFromSnapshot()).toBeNull();
  });

  it("returns the elapsed seconds for an ongoing session, regardless of workoutId", () => {
    const startedAt = Date.now() - 5000;
    saveSnapshot({ ...createEmptySession("w1"), status: "ongoing", startedAt });
    const elapsed = readLiveElapsedFromSnapshot();
    expect(elapsed).toBeGreaterThanOrEqual(5);
    expect(elapsed).toBeLessThan(7);
  });
});
