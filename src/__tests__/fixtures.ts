export const iso = (h: number) => `2026-10-13T${String(h).padStart(2, "0")}:00`;

export const fixture = {
    timezone: "Asia/Jakarta",
    current: {
      time: iso(7),
      temperature_2m: 31.5,
      apparent_temperature: 34,
      relative_humidity_2m: 70,
      wind_speed_10m: 12,
      wind_direction_10m: 90,
      surface_pressure: 1008,
      weather_code: 61,
      is_day: 1,
      precipitation: 0.4,
    },
    hourly: {
      // 31 jam mulai 06:00 pada 13 Okt → jam 07:00 ada di indeks 1
      time: Array.from({ length: 31 }, (_, i) =>
        new Date(Date.UTC(2026, 9, 13, 6 + i)).toISOString().slice(0, 16),
      ),
      temperature_2m: Array.from({ length: 31 }, (_, i) => 24 + i),
      weather_code: Array.from({ length: 31 }, () => 3),
      precipitation_probability: Array.from({ length: 31 }, (_, i) => i),
      is_day: Array.from({ length: 31 }, () => 1),
    },
    daily: {
      time: ["2026-10-13", "2026-10-14"],
      weather_code: [61, 0],
      temperature_2m_max: [32, 33],
      temperature_2m_min: [25, 26],
      precipitation_probability_max: [80, null],
      sunrise: ["2026-10-13T05:30", "2026-10-14T05:30"],
      sunset: ["2026-10-13T17:45", "2026-10-14T17:45"],
      uv_index_max: [7.5, null],
    },
  };

