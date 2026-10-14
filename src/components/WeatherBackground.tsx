import { memo } from "react";
import type { WeatherVisualState } from "../weather";

/** Decorative, CSS-only atmosphere. Normalize API weather in the caller. */
const WeatherBackground = memo(function WeatherBackground({
  state,
}: {
  state: WeatherVisualState;
}) {
  return (
    <div aria-hidden="true" className={`atmosphere atmosphere--${state}`} />
  );
});

export default WeatherBackground;
