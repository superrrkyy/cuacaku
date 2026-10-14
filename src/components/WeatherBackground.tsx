import { useEffect, useState } from "react";
import { weatherVisualState } from "../weather";
import { getDayPart } from "../lib/daylight";

export default function WeatherBackground({
  code = 0,
  isDay = false,
  timezone,
}: {
  code?: number;
  isDay?: boolean;
  timezone?: string;
}) {
  const [dayPart, setDayPart] = useState(() =>
    timezone ? getDayPart(timezone) : isDay ? "day" : "night",
  );

  useEffect(() => {
    if (!timezone) {
      setDayPart(isDay ? "day" : "night");
      return;
    }

    const update = () => setDayPart(getDayPart(timezone));
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, [timezone, isDay]);

  const visual = weatherVisualState(code, isDay);
  const atmosphereClass = `${visual} atmosphere--${dayPart}`;

  return (
    <div aria-hidden="true" className={`atmosphere atmosphere--${atmosphereClass}`}>
      <span className="atmosphere-orb" />
      <span className="atmosphere-horizon" />
    </div>
  );
}
