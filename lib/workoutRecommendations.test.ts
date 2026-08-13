import { describe, expect, it } from "vitest";
import { getLatestExerciseSeries, getSetRecommendation } from "./workoutRecommendations";

describe("workout recommendations", () => {
  it("finds the latest exercise even when workouts are not sorted", () => {
    const series = getLatestExerciseSeries(
      [
        { completedAt: "2026-07-01T10:00:00Z", exerciseDetails: [{ name: "Press banca", series: [{ weight: 60, reps: 8 }] }] },
        { completedAt: "2026-07-10T10:00:00Z", exerciseDetails: [{ name: "Press banca", series: [{ weight: 62.5, reps: 8 }] }] },
      ],
      "Press banca"
    );

    expect(series?.[0]).toMatchObject({ weight: 62.5, reps: 8 });
  });

  it("increases weight when the previous set had at least three reps in reserve", () => {
    expect(getSetRecommendation({ weight: 60, reps: 10, rir: 3 }, 10)).toMatchObject({
      decision: "increase",
      weight: 61.5,
      reps: 10,
    });
  });

  it("lowers weight when the previous set was too close to failure and missed the target", () => {
    expect(getSetRecommendation({ weight: 60, reps: 8, rir: 0 }, 10)).toMatchObject({
      decision: "decrease",
      weight: 57,
      reps: 8,
    });
  });

  it("keeps the previous load when there is no RIR data and progress is not clear", () => {
    expect(getSetRecommendation({ weight: 60, reps: 8 }, 10)).toMatchObject({
      decision: "maintain",
      weight: 60,
      reps: 10,
    });
  });
});
