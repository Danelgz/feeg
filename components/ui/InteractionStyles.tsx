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

      /* Superficie pintada por clase (no inline) para que los estados de arriba puedan cambiarla. */
      .feeg-surface {
        background-color: var(--feeg-bg, transparent);
        color: var(--feeg-fg, inherit);
        border: var(--feeg-border-width, 1px) solid var(--feeg-border, transparent);
        box-shadow: var(--feeg-shadow, none);
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
      }
    `}</style>
  );
}
