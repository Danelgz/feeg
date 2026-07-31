/**
 * Convierte un nombre en algo que se puede usar como identificador.
 *
 * Existe porque los grupos musculares llevan tilde ('Bíceps', 'Cuádriceps') y espacios ('Cuerpo
 * Completo'), y de ellos salen ids que luego hay que poder BUSCAR: el de la fila del ranking
 * (`document.getElementById`, para hacerle scroll) y el del `<linearGradient>` de cada músculo del
 * mapa (`fill="url(#...)"`). Un id con acentos es válido en HTML5, pero en cuanto se consulta como
 * selector CSS deja de funcionar.
 *
 * Vive aparte y no duplicado en cada componente porque los dos ids tienen que generarse igual el día
 * que se añada un grupo nuevo — si divergen, el fallo es un músculo sin color o un scroll que no va
 * a ningún sitio, y ninguno de los dos avisa.
 */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    // Marcas diacríticas combinantes, que es lo que NFD acaba de separar de cada letra.
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
}
