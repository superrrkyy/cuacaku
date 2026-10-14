export interface Place {
  id: number;
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export interface Weather {
  timezone: string;
  current: {
    time: string;
    temperature: number;
    feelsLike: number;
    humidity: number;
    wind: number;
    windDir: number;
    pressure: number;
    code: number;
    isDay: boolean;
    precipitation: number;
    /** Visibility from the current forecast hour, in metres. */
    visibility?: number | null;
  };
  hourly: { time: string; temp: number; code: number; rain: number | null; isDay: boolean }[];
  daily: {
    date: string;
    code: number;
    max: number;
    min: number;
    /** Null when Open-Meteo has no probability for the day; never displayed as 0. */
    rain: number | null;
    sunrise: string;
    sunset: string;
    uv: number;
  }[];
}

