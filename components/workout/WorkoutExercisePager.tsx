import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import { getWorkoutTokens } from "../../lib/tokens";

interface PagerItem {
  uid?: string | number;
}

interface WorkoutExercisePagerProps<T extends PagerItem> {
  exercises: T[];
  renderExercise: (exercise: T, index: number) => ReactNode;
}

/** Métodos que el padre puede invocar sobre el pager (ver `pages/routines/[id].js` / `empty.js`):
 *  saltar automáticamente al siguiente ejercicio cuando se completa la última serie del actual. */
export interface WorkoutExercisePagerHandle {
  scrollToNext: () => void;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Vertical, snap-based exercise navigation for the focused live workout experience. */
function WorkoutExercisePagerInner<T extends PagerItem>(
  { exercises, renderExercise }: WorkoutExercisePagerProps<T>,
  ref: Ref<WorkoutExercisePagerHandle>
) {
  const tk = getWorkoutTokens();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (exercises.length === 0) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((index) => Math.min(index, exercises.length - 1));
  }, [exercises.length]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || exercises.length === 0 || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!mostVisible) return;
        const nextIndex = Number((mostVisible.target as HTMLElement).dataset.exerciseIndex);
        if (Number.isInteger(nextIndex)) setActiveIndex(nextIndex);
      },
      { root: scroller, threshold: [0.55, 0.75, 0.95] }
    );

    sectionRefs.current.slice(0, exercises.length).forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, [exercises.length]);

  useImperativeHandle(
    ref,
    () => ({
      scrollToNext: () => {
        const nextIndex = activeIndex + 1;
        const section = sectionRefs.current[nextIndex];
        if (!section) return;
        section.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      },
    }),
    [activeIndex]
  );

  if (exercises.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Progreso del entreno: cuántos ejercicios se han recorrido, no solo el scroll-snap del que
          depende antes no daba ninguna pista salvo bajar y mirar. Un segmento por ejercicio, como
          las stories — los ya pasados y el actual van llenos, el resto se queda tenue. */}
      {exercises.length > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 20px 12px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", gap: "4px", flex: 1 }}>
            {exercises.map((exercise, index) => (
              <span
                key={exercise.uid ?? index}
                style={{
                  flex: 1,
                  height: "3px",
                  borderRadius: "2px",
                  backgroundColor: index <= activeIndex ? tk.accent : tk.surfaceAlt,
                  transition: "background-color 320ms ease",
                }}
              />
            ))}
          </div>
          <span
            style={{
              flexShrink: 0,
              color: tk.textFaint,
              fontSize: "0.72rem",
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "0.02em",
            }}
          >
            {activeIndex + 1}/{exercises.length}
          </span>
        </div>
      )}

      <div
        ref={scrollerRef}
        className="feeg-exercise-pager"
        style={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          scrollSnapType: "y mandatory",
          overscrollBehaviorY: "contain",
          overscrollBehaviorX: "none",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        {exercises.map((exercise, index) => (
          <section
            key={exercise.uid ?? index}
            ref={(node) => {
              sectionRefs.current[index] = node;
            }}
            data-exercise-index={index}
            className={index === activeIndex ? "feeg-exercise-pager__page is-active" : "feeg-exercise-pager__page"}
            style={{
              minHeight: "100%",
              boxSizing: "border-box",
              scrollSnapAlign: "start",
              scrollSnapStop: "always",
              display: "flex",
              alignItems: "center",
              padding: "22px 15px 92px",
            }}
          >
            <div style={{ width: "100%", maxWidth: "900px", margin: "0 auto" }}>
              {renderExercise(exercise, index)}
            </div>
          </section>
        ))}

        <style>{`
          .feeg-exercise-pager::-webkit-scrollbar { display: none; }
          .feeg-exercise-pager__page.is-active > div {
            animation: feeg-exercise-page-enter 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
          }
          @keyframes feeg-exercise-page-enter {
            from { opacity: 0.62; transform: translateY(14px) scale(0.985); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @media (prefers-reduced-motion: reduce) {
            .feeg-exercise-pager { scroll-behavior: auto; }
            .feeg-exercise-pager__page.is-active > div { animation: none; }
          }
        `}</style>
      </div>
    </div>
  );
}

const WorkoutExercisePager = forwardRef(WorkoutExercisePagerInner) as unknown as <T extends PagerItem>(
  props: WorkoutExercisePagerProps<T> & { ref?: Ref<WorkoutExercisePagerHandle> }
) => ReturnType<typeof WorkoutExercisePagerInner>;

export default WorkoutExercisePager;
