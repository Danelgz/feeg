import { useEffect, useRef, useState, type ReactNode } from "react";
import { getWorkoutTokens } from "../../lib/tokens";

interface PagerItem {
  uid?: string | number;
}

interface WorkoutExercisePagerProps<T extends PagerItem> {
  exercises: T[];
  renderExercise: (exercise: T, index: number) => ReactNode;
  lastAction?: ReactNode;
}

/** Vertical, snap-based exercise navigation for the focused live workout experience. */
export default function WorkoutExercisePager<T extends PagerItem>({
  exercises,
  renderExercise,
  lastAction,
}: WorkoutExercisePagerProps<T>) {
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

  if (exercises.length === 0) return null;

  return (
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

      <div
        aria-label="Navegación de ejercicios"
        style={{
          position: "absolute",
          bottom: "14px",
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          width: "fit-content",
          maxWidth: "calc(100% - 30px)",
          margin: 0,
          padding: "7px 9px",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: tk.radius.pill,
          background: "rgba(17,17,17,0.86)",
          boxShadow: "0 14px 34px rgba(0,0,0,0.42)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <span style={{ width: 36, height: 36 }} aria-hidden="true" />

        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "72px", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }} aria-hidden="true">
            {exercises.map((exercise, index) => (
              <span
                key={exercise.uid ?? index}
                style={{
                  width: index === activeIndex ? 16 : 5,
                  height: 5,
                  borderRadius: tk.radius.pill,
                  background: index === activeIndex ? tk.accent : tk.textFaint,
                  opacity: index === activeIndex ? 1 : 0.7,
                  transition: "width 240ms cubic-bezier(0.16,1,0.3,1), background 180ms ease",
                }}
              />
            ))}
          </div>
          <span style={{ color: tk.textMuted, fontSize: "0.72rem", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
            {activeIndex + 1}/{exercises.length}
          </span>
        </div>

        {activeIndex === exercises.length - 1 && lastAction ? (
          lastAction
        ) : (
          <span style={{ width: 36, height: 36 }} aria-hidden="true" />
        )}
      </div>

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
  );
}
