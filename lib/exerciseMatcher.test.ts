import { beforeEach, describe, expect, it } from "vitest";
import { matchExerciseName, resolveExerciseNames } from "./exerciseMatcher";

describe("exercise matcher", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("connects common English equipment variants to the canonical catalog", () => {
    expect(matchExerciseName("Barbell Bench Press")).toMatchObject({ name: "Press de Banca (Barra)" });
    expect(matchExerciseName("Dumbbell Bench Press")).toMatchObject({ name: "Press de Banca (Mancuerna)" });
  });

  it("asks before applying a non-exact fuzzy match", () => {
    const result = resolveExerciseNames(["Barbell Bench Press"]);
    const resolved = result.resolved as Record<string, { name: string }>;
    expect(resolved["Barbell Bench Press"]).toBeUndefined();
    expect(result.pending[0].suggestion).toMatchObject({ name: "Press de Banca (Barra)" });
  });

  it("resolves canonical names without creating duplicate identities", () => {
    const result = resolveExerciseNames(["Press de Banca (Barra)"]);
    const resolved = result.resolved as Record<string, { name: string }>;
    expect(resolved["Press de Banca (Barra)"]).toMatchObject({ name: "Press de Banca (Barra)" });
    expect(result.pending).toHaveLength(0);
    expect(matchExerciseName("Press de Banca (Barra)")).toMatchObject({ method: "exact" });
  });

  it("connects an exact custom exercise name without asking for verification", () => {
    localStorage.setItem("customExercises", JSON.stringify({ Espalda: [{ name: "Remo de Dani", muscleGroup: "Espalda" }] }));
    expect(matchExerciseName("Remo de Dani")).toMatchObject({ name: "Remo de Dani", group: "Espalda", method: "exact" });
  });

  it("treats accents, punctuation, and casing as the same canonical exercise", () => {
    expect(matchExerciseName(" press de banca (maquina smith) ")).toMatchObject({ name: "Press de Banca (Máquina Smith)" });
  });

  it("keeps the equipment signal when matching common English variants", () => {
    expect(matchExerciseName("Cable Lateral Raises")).toMatchObject({ name: "Elevación Lateral (Cable)" });
    expect(matchExerciseName("Machine Leg Press")).toMatchObject({ name: "Prensa de Piernas" });
  });

  it("keeps uncertain names pending so the user can choose", () => {
    const result = resolveExerciseNames(["Mi ejercicio inventado"]);
    const resolved = result.resolved as Record<string, { name: string }>;
    expect(resolved["Mi ejercicio inventado"]).toBeUndefined();
    expect(result.pending[0].foreignName).toBe("Mi ejercicio inventado");
  });
});
