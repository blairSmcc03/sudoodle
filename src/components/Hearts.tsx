import { STARTING_HEARTS } from "../logic/game";

export function Hearts({ hearts }: { hearts: number }) {
  return (
    <div class="hearts" role="img" aria-label={`${hearts} ${hearts === 1 ? "heart" : "hearts"} left`}>
      {Array.from({ length: STARTING_HEARTS }, (_, i) => (
        <span key={i} class={i < hearts ? "heart full" : "heart empty"} aria-hidden="true">
          {i < hearts ? "💗" : "🤍"}
        </span>
      ))}
    </div>
  );
}
