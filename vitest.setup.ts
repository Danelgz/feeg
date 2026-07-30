import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest corre sin `globals: true`, así que el cleanup automático de Testing Library (que se
// engancha al afterEach global cuando existe) no llega a registrarse. Sin esto cada render() se
// acumula en el mismo document y las consultas empiezan a encontrar elementos duplicados de tests
// anteriores — un fallo que parece "el componente se renderiza dos veces" y no lo es.
afterEach(() => {
  cleanup();
});
