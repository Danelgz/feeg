import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../context/UserContext", () => ({
  useUser: () => ({ theme: "dark" }),
}));

vi.mock("../components/ExerciseSelector", () => ({
  default: () => <div role="dialog">Selector de ejercicios</div>,
}));

vi.mock("../components/CreateCustomExerciseModal", () => ({
  default: () => <div role="dialog">Crear ejercicio</div>,
}));

import ExerciseMatchReview from "../components/import/ExerciseMatchReview";

describe("revisión de conexiones del importador", () => {
  beforeEach(() => localStorage.clear());

  it("muestra una confirmación accionable por coincidencia y el CTA móvil global", () => {
    render(
      <ExerciseMatchReview
        pending={[
          { foreignName: "Barbell Bench Press", suggestion: { name: "Press de Banca (Barra)", group: "Pecho" }, occurrences: 4 },
          { foreignName: "Unknown Movement", suggestion: null, occurrences: 1 },
        ]}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Confirmar esta conexión" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirma 2 conexiones" })).toHaveProperty("disabled", true);
    expect(screen.getByText(/No hemos encontrado una coincidencia segura/)).toBeTruthy();
  });

  it("habilita la confirmación global después de resolver todas las tarjetas", () => {
    const onComplete = vi.fn();
    render(
      <ExerciseMatchReview
        pending={[{ foreignName: "Barbell Bench Press", suggestion: { name: "Press de Banca (Barra)", group: "Pecho" }, occurrences: 1 }]}
        onComplete={onComplete}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Confirmar esta conexión" }));
    const finishButton = screen.getByRole("button", { name: "Confirmar conexiones" });
    expect(finishButton).toHaveProperty("disabled", false);
    fireEvent.click(finishButton);
    expect(onComplete).toHaveBeenCalledWith({ "Barbell Bench Press": { name: "Press de Banca (Barra)", group: "Pecho" } });
  });

  it("muestra las conexiones automáticas ya seleccionadas y exige confirmarlas", () => {
    const onComplete = vi.fn();
    render(
      <ExerciseMatchReview
        pending={[
          {
            foreignName: "Press de banca",
            resolution: { name: "Press de Banca (Barra)", group: "Pecho" },
            suggestion: null,
            occurrences: 3,
          },
        ]}
        onComplete={onComplete}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText("Press de banca")).toBeTruthy();
    expect(screen.getByText("Press de Banca (Barra)")).toBeTruthy();
    const finishButton = screen.getByRole("button", { name: "Confirmar conexiones" });
    expect(finishButton).toHaveProperty("disabled", false);

    fireEvent.click(finishButton);
    expect(onComplete).toHaveBeenCalledWith({
      "Press de banca": { name: "Press de Banca (Barra)", group: "Pecho" },
    });
  });
});
