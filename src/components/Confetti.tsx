const COLOURS = ["#ff9ec4", "#ffd1e3", "#ffc8a2", "#fff1a8", "#c9f0d8", "#cfe3ff"];
const PIECES = 28;

/** A small, tasteful burst. Positions are derived from the index so the markup is stable. */
export function Confetti() {
  return (
    <div class="confetti" aria-hidden="true">
      {Array.from({ length: PIECES }, (_, i) => (
        <span
          key={i}
          class="confetti-piece"
          style={{
            left: `${(i * 37) % 100}%`,
            background: COLOURS[i % COLOURS.length],
            animationDelay: `${(i % 7) * 0.12}s`,
            animationDuration: `${2.4 + (i % 5) * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}
