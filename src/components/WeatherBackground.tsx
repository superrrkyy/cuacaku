import { weatherVisualState } from "../weather";
export default function WeatherBackground({
  code = 0,
  isDay = false,
}: {
  code?: number;
  isDay?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`atmosphere atmosphere--${weatherVisualState(code, isDay)}`}
    />
  );
}
