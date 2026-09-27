import { describe, expect, it } from "vitest";
import { platesFor } from "./plates";

describe("platesFor", () => {
  it("reparte los discos de un lado del más pesado al más ligero", () => {
    expect(platesFor(100, 20)).toEqual({ perSide: [25, 15], achieved: 100, remainder: 0 });
    expect(platesFor(62.5, 20).perSide).toEqual([20, 1.25]);
  });
  it("con el peso de la barra o menos no hay discos", () => {
    expect(platesFor(20, 20).perSide).toEqual([]);
  });
  it("avisa de lo que falta cuando los discos no cuadran", () => {
    expect(platesFor(101, 20)).toMatchObject({ achieved: 100, remainder: 1 });
  });
});
