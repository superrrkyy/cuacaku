import { info, weatherVisualState } from "../weather";

/** Small inline vectors; weather meanings always come from the shared WMO mapping. */
export default function WeatherIcon({
  code,
  isDay = true,
  className = "",
}: {
  code: number;
  isDay?: boolean;
  className?: string;
}) {
  const state = weatherVisualState(code, isDay);
  const cloudy = ["cloudy", "rain", "storm", "snow"].includes(state);
  return (
    <svg
      className={`weather-icon ${className}`}
      viewBox="0 0 80 80"
      role="img"
      aria-label={`${info(code).label}, ${isDay ? "siang" : "malam"}`}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {state === "clear-night" ? (
        <path
          d="M53 12a28 28 0 1 0 15 43A29 29 0 0 1 53 12Z"
          fill="#d6e3f7"
          stroke="#edf4ff"
          strokeWidth="1.5"
        />
      ) : (
        (state === "clear-day" || (cloudy && isDay && state !== "storm")) && (
          <g stroke="#f8d489" strokeWidth="2.5">
            <circle
              cx={cloudy ? 29 : 40}
              cy={cloudy ? 29 : 40}
              r={cloudy ? 14 : 17}
              fill="#edc477"
            />
            {!cloudy && (
              <path d="M40 8v6m0 52v6M8 40h6m52 0h6M17 17l5 5m36 36 5 5M17 63l5-5m36-36 5-5" />
            )}
          </g>
        )
      )}
      {cloudy && (
        <path
          d="M21 56a13 13 0 0 1-1-26 20 20 0 0 1 38 2 12 12 0 0 1 1 24Z"
          fill={state === "storm" ? "#8896bc" : "#c4d3e7"}
          stroke="#dbe6f7"
          strokeWidth="1.5"
        />
      )}
      {state === "rain" && (
        <path
          d="m27 64-3 7m17-7-3 7m17-7-3 7"
          stroke="#8ccec9"
          strokeWidth="3"
        />
      )}
      {state === "storm" && (
        <path d="m42 49-10 15h10l-7 13 20-19H43l7-9" fill="#efd299" />
      )}
      {state === "snow" && (
        <g stroke="#b1dcf0" strokeWidth="2">
          <path d="M27 64v10m-5-5h10m16-5v10m-5-5h10" />
        </g>
      )}
      {state === "fog" && (
        <g stroke="#bacbde" strokeWidth="3">
          <path d="M15 29h43M23 40h43M13 51h44M25 62h37" />
        </g>
      )}
    </svg>
  );
}
