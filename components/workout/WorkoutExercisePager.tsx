import { useEffect, useRef, useState, type ReactNode } from "react";

interface PagerItem {
  uid?: string | number;
}

interface WorkoutExercisePagerProps<T extends PagerItem> {
  exercises: T[];
  renderExercise: (exercise: T, index: number) => ReactNode;
}

/** Vertical, snap-based exercise navigation for the focused live workout experience. */
export default function WorkoutExercisePager<T extends PagerItem>({
  exercises,
  renderExercise,
}: WorkoutExercisePagerProps<T>) {
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
