# Arte de los rangos

Aquí van las 30 insignias: 10 rangos × 3 escalones.

`components/ui/RankArt.tsx` las carga por nombre. **No hay ninguna lista que mantener**: el archivo
que se suelte en esta carpeta con el nombre correcto aparece solo, y el que falte sigue mostrando el
dibujo SVG de respaldo (`components/ui/RankIcon.tsx`). Se pueden ir añadiendo por tandas.

## Nombres exactos

Formato: `<slug>-<escalón>.png`, donde el escalón es `1`, `2` o `3`.

**El escalón 3 es el más alto de su rango**, así que es el que lleva el arte más ornamentado (alas,
laureles completos, mayor resplandor). El 1 es el más sencillo.

| Rango | Escalón 1 (niveles 1º) | Escalón 2 | Escalón 3 (el más alto) |
|---|---|---|---|
| Principiante | `principiante-1.png` | `principiante-2.png` | `principiante-3.png` |
| Novato | `novato-1.png` | `novato-2.png` | `novato-3.png` |
| Aprendiz | `aprendiz-1.png` | `aprendiz-2.png` | `aprendiz-3.png` |
| Constante | `constante-1.png` | `constante-2.png` | `constante-3.png` |
| Disciplinado | `disciplinado-1.png` | `disciplinado-2.png` | `disciplinado-3.png` |
| Atleta | `atleta-1.png` | `atleta-2.png` | `atleta-3.png` |
| Avanzado | `avanzado-1.png` | `avanzado-2.png` | `avanzado-3.png` |
| Élite | `elite-1.png` | `elite-2.png` | `elite-3.png` |
| Titán | `titan-1.png` | `titan-2.png` | `titan-3.png` |
| Leyenda | `leyenda-1.png` | `leyenda-2.png` | `leyenda-3.png` |

Sin acentos ni mayúsculas: `elite`, no `élite`; `titan`, no `Titán`.

## Ojo con la numeración

Si las imágenes vienen etiquetadas al estilo de los juegos competitivos —donde **III es el más bajo
y I el más alto**— hay que invertirlas al renombrarlas: la que venga marcada como "I" (la más
ornamentada) se guarda aquí como `-3.png`.

En FEEG el número crece con la fuerza: `Principiante I` es el nivel 1 y `Principiante III` el 3.

## Requisitos de los archivos

- **PNG con fondo transparente.** Las insignias se pintan sobre un disco de color dentro de la
  interfaz; un fondo blanco se vería como un cuadrado.
- **Cuadradas**, con el dibujo centrado y algo de aire alrededor. Se muestran en `objectFit: contain`,
  así que una imagen no cuadrada no se deforma pero deja huecos.
- **256×256 px es suficiente.** El tamaño mayor en el que se dibujan es 68 px (la insignia grande del
  perfil de rangos), así que 256 cubre pantallas retina de sobra. Subir 1024×1536 sólo añade peso.
- Conviene pasarlas por un compresor de PNG antes de subirlas: son 30 archivos que carga el cliente.
