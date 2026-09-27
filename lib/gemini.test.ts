import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateContent, normalizeHistory, parseJsonLoose, responseText, GeminiError } from "./gemini";

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as unknown as Response;
const fail = (status: number, message = "x") => ({ ok: false, status, json: async () => ({ error: { message } }) }) as unknown as Response;
const noWait = async () => {};

describe("generateContent", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "k";
    process.env.GEMINI_MODEL = "primary";
    process.env.GEMINI_FALLBACK_MODEL = "backup";
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("reintenta los fallos pasajeros (503/429) y acaba respondiendo", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(fail(503)).mockResolvedValueOnce(fail(429)).mockResolvedValueOnce(ok({ candidates: [] }));
    await expect(generateContent({}, { fetchImpl, wait: noWait })).resolves.toEqual({ candidates: [] });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("pasa al modelo de respaldo si el principal no existe", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(fail(404, "models/primary is not found")).mockResolvedValueOnce(ok({ done: true }));
    await expect(generateContent({}, { fetchImpl, wait: noWait })).resolves.toEqual({ done: true });
    expect(String(fetchImpl.mock.calls[1][0])).toContain("/backup:generateContent");
  });

  it("no reintenta un error de la petición y da un mensaje legible", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fail(403, "API key not valid"));
    await expect(generateContent({}, { fetchImpl, wait: noWait })).rejects.toThrow(/clave de Gemini/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("si todo falla, explica que el servicio está saturado", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fail(503));
    await expect(generateContent({}, { fetchImpl, wait: noWait })).rejects.toBeInstanceOf(GeminiError);
    expect(fetchImpl).toHaveBeenCalledTimes(6);
  });
});

describe("utilidades de respuesta", () => {
  it("ignora las partes de razonamiento", () => {
    expect(responseText({ candidates: [{ content: { parts: [{ text: "pienso", thought: true }, { text: "Hola" }] } }] })).toBe("Hola");
  });
  it("lee JSON con envoltorio de markdown o texto alrededor", () => {
    expect(parseJsonLoose('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJsonLoose('Aquí tienes: {"a":2} ¡suerte!')).toEqual({ a: 2 });
  });
  it("normaliza el historial para que empiece por el usuario y alterne", () => {
    const h = normalizeHistory([
      { role: "assistant", content: "hola" },
      { role: "user", content: "a" },
      { role: "user", content: "b" },
      { role: "assistant", content: "c" },
    ]);
    expect(h.map((m) => m.role)).toEqual(["user", "model"]);
    expect(h[0].parts[0].text).toBe("a\n\nb");
  });
});
