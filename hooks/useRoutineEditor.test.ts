import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useRoutineEditor, type UseRoutineEditorOptions } from "./useRoutineEditor";
import { createSeries, type ExerciseSession } from "./workoutSessionReducer";

type RoutineArg = UseRoutineEditorOptions["routine"];

function exercise(overrides: Partial<ExerciseSession> = {}): ExerciseSession {
  return {
    uid: "ex-1",
    name: "Sentadilla trasera con barra",
    muscleGroup: "Cuádriceps",
    exerciseType: "weight_reps",
    restSeconds: 90,
    notes: "",
    series: [createSeries({ uid: "s-1" })],
    ...overrides,
  };
}

describe("useRoutineEditor", () => {
  it("starts from an empty session when no routine is given", () => {
    const { result } = renderHook(() => useRoutineEditor({ editorId: "e1" }));
    expect(result.current.state.workoutId).toBe("e1");
    expect(result.current.state.exercises).toHaveLength(0);
    expect(result.current.state.status).toBe("preview");
  });

  it("hydrates from a routine passed on mount", () => {
    const routine = {
      id: "r1",
      name: "Empuje",
      exercises: [{ name: "Press militar con barra", group: "Hombros", rest: 90, series: [{ type: "N", reps: 8, weight: 40 }] }],
    };
    const { result } = renderHook(() => useRoutineEditor({ editorId: "e1", routine }));
    expect(result.current.state.name).toBe("Empuje");
    expect(result.current.state.exercises).toHaveLength(1);
    expect(result.current.state.exercises[0].name).toBe("Press militar con barra");
  });

  it("hydrates late-arriving routine data (context loads async) exactly once per editorId", () => {
    const { result, rerender } = renderHook(
      ({ routine }) => useRoutineEditor({ editorId: "e1", routine }),
      { initialProps: { routine: null as RoutineArg } }
    );
    expect(result.current.state.exercises).toHaveLength(0);

    const routine = { id: "r1", name: "Empuje", exercises: [{ name: "Press militar con barra", exercises: [] }] };
    rerender({ routine });
    expect(result.current.state.name).toBe("Empuje");

    // El usuario edita el nombre tras la hidratación...
    act(() => result.current.actions.setName("Mi rutina de empuje"));
    expect(result.current.state.name).toBe("Mi rutina de empuje");

    // ...y si el objeto `routine` del contexto se recrea (misma rutina, referencia nueva),
    // NO debe pisar la edición en curso porque editorId ya se hidrató una vez.
    rerender({ routine: { ...routine } });
    expect(result.current.state.name).toBe("Mi rutina de empuje");
  });

  it("exposes actions that dispatch through the shared reducer", () => {
    const { result } = renderHook(() => useRoutineEditor({ editorId: "e1" }));

    act(() => result.current.actions.addExercise(exercise()));
    expect(result.current.state.exercises).toHaveLength(1);

    act(() => result.current.actions.addSeries("ex-1", false));
    expect(result.current.state.exercises[0].series).toHaveLength(2);

    const serieUid = result.current.state.exercises[0].series[1].uid;
    act(() => result.current.actions.updateSeriesField("ex-1", serieUid, "reps", 12));
    expect(result.current.state.exercises[0].series[1].reps).toBe(12);

    act(() => result.current.actions.setSeriesType("ex-1", serieUid, "D"));
    expect(result.current.state.exercises[0].series[1].type).toBe("D");

    act(() => result.current.actions.setExerciseRest("ex-1", 120));
    expect(result.current.state.exercises[0].restSeconds).toBe(120);

    act(() => result.current.actions.removeSeries("ex-1", serieUid));
    expect(result.current.state.exercises[0].series).toHaveLength(1);

    act(() => result.current.actions.removeExercise("ex-1"));
    expect(result.current.state.exercises).toHaveLength(0);
  });
});
