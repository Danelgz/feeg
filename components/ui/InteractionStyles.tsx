import { ACCENT } from "../../lib/tokens";

/**
 * Primitivas de interacción globales. Se monta una vez en pages/_app.js, fuera de Layout, para que
 * alcance también a cualquier pantalla que no use Layout.
 *
 * Por qué existe como CSS y no como estilos inline (que es la convención del repo): `:active`,
 * `:focus-visible` y `@media (hover)` **no se pueden expresar inline**. Antes de esto la app
 * resolvía el hover con `useState` + `onMouseEnter` en cada componente, lo que tiene tres
 * problemas: re-renderiza en cada hover, no da ningún feedback al tocar (el usuario objetivo va con
 * el móvil en la mano, no con ratón), y en táctil el navegador dispara `mouseenter` al tocar y el
 * estado se queda "pegado" al volver de otra pantalla.
 *
 * Contrato con los componentes: como una hoja de estilos NO puede ganarle a un atributo `style`
 * inline, los componentes que usan estas clases pasan inline **solo variables CSS** (que no pintan
 * nada por sí mismas) y es la clase la que pinta con `var()`. Así los colores siguen viniendo de
 * lib/tokens.js a través de React, sin duplicar la paleta aquí ni recurrir a `!important`.
 */
export default function InteractionStyles() {
  return (
    <style jsx global>{`
      /* Mata el flash azul de WebKit al tocar y el retardo de ~300ms del doble-tap. Dos reglas que
         son buena parte de la diferencia entre "una web abierta en el móvil" y "una app". */
      * {
        -webkit-tap-highlight-color: transparent;
      }
      button,
      a,
      [role="button"],
      .feeg-press {
        touch-action: manipulation;
      }

      /* Feedback de pulsación. El elemento se hunde ligeramente mientras el dedo está encima.
         --feeg-press-scale se puede bajar por elemento: cuanto más grande la superficie, menos
         escala hace falta para que se lea (una tarjeta a 0.97 se deforma mucho, un botón no). */
      .feeg-press {
        transition: transform 130ms cubic-bezier(0.2, 0.8, 0.3, 1),
          background-color 180ms ease, border-color 180ms ease, color 180ms ease,
          box-shadow 180ms ease;
      }
      .feeg-press:active:not(:disabled):not([aria-disabled="true"]) {
        transform: scale(var(--feeg-press-scale, 0.96));
      }

      /* Hover solo donde hay puntero de verdad. */
      @media (hover: hover) and (pointer: fine) {
        .feeg-hover:not(:disabled):hover {
          background-color: var(--feeg-hover-bg, var(--feeg-bg, transparent));
          color: var(--feeg-hover-fg, var(--feeg-fg, inherit));
          border-color: var(--feeg-hover-border, var(--feeg-border, transparent));
        }
        /* Elevación para tarjetas pulsables. Separada de .feeg-hover porque no toda superficie con
           hover debe levantarse (un botón dentro de una tarjeta, por ejemplo). */
        .feeg-lift:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: var(--feeg-lift-shadow, 0 10px 24px rgba(0, 0, 0, 0.28));
        }
        /* El :active gana al :lift para que al pulsar baje en lugar de quedarse levantada. */
        .feeg-lift.feeg-press:active:not(:disabled) {
          transform: scale(var(--feeg-press-scale, 0.96));
        }
      }

      /* Anillo de foco visible solo para navegación por teclado. :where() mantiene especificidad 0
         para no competir con nada. Antes no había ninguno: la app era inusable con teclado. */
      :where(button, a, [role="button"], input, select, textarea, [tabindex]):focus-visible {
        outline: 2px solid ${ACCENT};
        outline-offset: 2px;
      }
      /* ...y quitar el del navegador cuando el foco llega con el ratón. Sin esta regla la de arriba
         no basta: Chrome sólo se guarda su anillo para :focus-visible en los controles nativos, pero
         en un elemento con tabindex — el <g> de cada músculo del mapa, sin ir más lejos — lo pinta en
         :focus a secas. Así que al pulsar un músculo salía el recuadro negro de serie del navegador
         encajonando el grupo, que además es lo contrario de lo que hace el mapa: el músculo ya se
         recorta solo y la franja de lectura ya dice cuál es.
         Las dos reglas son excluyentes (o hay :focus-visible o no), así que el orden da igual. */
      :where(button, a, [role="button"], input, select, textarea, [tabindex]):focus:not(:focus-visible) {
        outline: none;
      }

      /* Superficie pintada por clase (no inline) para que los estados de arriba puedan cambiarla. */
      .feeg-surface {
        background-color: var(--feeg-bg, transparent);
        color: var(--feeg-fg, inherit);
        border: var(--feeg-border-width, 1px) solid var(--feeg-border, transparent);
        box-shadow: var(--feeg-shadow, none);
      }

      /* Brillo de los esqueletos de carga (ver components/ui/Skeleton.tsx). Anima background-position
         y no width/left, para que corra en GPU sin provocar relayouts. */
      .feeg-skeleton {
        position: relative;
        overflow: hidden;
      }
      .feeg-skeleton::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0) 0%,
          rgba(255, 255, 255, 0.06) 50%,
          rgba(255, 255, 255, 0) 100%
        );
        background-size: 200% 100%;
        animation: feegShimmer 1.4s ease-in-out infinite;
      }
      @keyframes feegShimmer {
        0% {
          background-position: 150% 0;
        }
        100% {
          background-position: -150% 0;
        }
      }

      /* Grano de película sobre todo el lienzo. Un fondo plano y perfectamente uniforme es lo que
         hace que una interfaz oscura se lea como "vector estéril"; un 2.5% de ruido le da textura
         sin que se perciba como suciedad. Va en un pseudoelemento fijo con pointer-events: none, y a
         z-index 1 para quedar por encima del contenido pero por debajo de toda la cromática de la app
         (cabecera 500, nav 1000, modales y overlays 3000+). */
      body::after {
        content: "";
        position: fixed;
        inset: 0;
        z-index: 1;
        pointer-events: none;
        opacity: 0.025;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E");
      }

      /* Pulso al completar algo (p. ej. marcar una serie). Es la acción más repetida de todo un
         entreno (puede pasar 20-30 veces por sesión), así que merece su propio feedback aparte
         del genérico .feeg-press: un rebote de escala más el anillo de ::after expandiéndose y
         desvaneciéndose. Se dispara una vez añadiendo la clase (el consumidor la quita tras la
         animación); requiere position: relative en el elemento para que el anillo se ancle bien.
         Color configurable con --feeg-pulse-color (por defecto currentColor). */
      .feeg-check-pulse {
        animation: feegCheckPulse 420ms cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      @keyframes feegCheckPulse {
        0% { transform: scale(1); }
        45% { transform: scale(1.32); }
        100% { transform: scale(1); }
      }
      .feeg-check-pulse::after {
        content: "";
        position: absolute;
        inset: -7px;
        border-radius: 50%;
        border: 2px solid var(--feeg-pulse-color, currentColor);
        opacity: 0.85;
        animation: feegCheckRing 550ms ease-out forwards;
        pointer-events: none;
      }
      @keyframes feegCheckRing {
        0% { transform: scale(0.55); opacity: 0.85; }
        100% { transform: scale(2); opacity: 0; }
      }

      @media (prefers-reduced-motion: reduce) {
        .feeg-press,
        .feeg-lift {
          transition: none;
        }
        .feeg-press:active:not(:disabled),
        .feeg-lift:not(:disabled):hover {
          transform: none;
        }
        .feeg-check-pulse,
        .feeg-check-pulse::after {
          animation: none;
        }
      }
    `}</style>
  );
}
