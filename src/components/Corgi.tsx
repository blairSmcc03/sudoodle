import type { CorgiPose } from "../logic/corgi";

interface Props {
  pose: CorgiPose;
  size?: "small" | "large";
}

/** The mascot. Swap the files in public/corgi/ to change the art; filenames are corgi-<pose>.svg. */
export function Corgi({ pose, size = "small" }: Props) {
  return (
    <img
      class={`corgi corgi-${size}`}
      src={`${import.meta.env.BASE_URL}corgi/corgi-${pose}.svg`}
      alt=""
      data-pose={pose}
      draggable={false}
    />
  );
}
