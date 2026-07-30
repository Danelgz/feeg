import { transformWithOxc } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    // El repo escribe JSX dentro de archivos .js (convención de Next, ver la migración a TS en
    // curso en CLAUDE.md). Vite solo transforma JSX en .jsx/.tsx, así que sin esto cualquier test
    // que importe un componente o contexto .js falla al parsear ("invalid JS syntax"). Limitado a
    // los .js del propio proyecto: node_modules se queda con el tratamiento por defecto.
    {
      name: "feeg:jsx-in-js",
      async transform(code: string, id: string) {
        if (!/\.js$/.test(id) || id.includes("node_modules")) return null;
        return transformWithOxc(code, id, { lang: "jsx", jsx: { runtime: "automatic" } });
      },
    },
  ],
  test: {
    environment: "jsdom",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules", ".next"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
