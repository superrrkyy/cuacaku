import { useCallback, useEffect, useRef, useState } from "react";
import { getWeather, type Place, type Weather } from "../weather";
import { errorMessage, isAbortError } from "../lib/api";

type State =
  | { status: "idle"; data: null; error: ""; place: null }
  | { status: "loading"; data: null; error: ""; place: Place }
  | { status: "success"; data: Weather; error: ""; place: Place }
  | { status: "error"; data: null; error: string; place: Place };
const initial: State = { status: "idle", data: null, error: "", place: null };
export function useWeather(place: Place, online: boolean) {
  const [state, setState] = useState<State>(initial);
  const request = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    if (!online || navigator.onLine === false || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setState({ status: "loading", data: null, error: "", place });
    try {
      const data = await getWeather(place.latitude, place.longitude, { signal: controller.signal });
      if (!controller.signal.aborted) setState({ status: "success", data, error: "", place });
    } catch (error) {
      if (!controller.signal.aborted && !isAbortError(error)) setState({ status: "error", data: null, error: errorMessage(error), place });
    } finally {
      if (request.current === controller) request.current = null;
    }
  }, [place, online]);
  useEffect(() => {
    if (online) void refresh();
    else setState(initial);
    const timer = online ? setInterval(() => { void refresh(); }, 10 * 60 * 1000) : undefined;
    return () => {
      clearInterval(timer);
      request.current?.abort();
      request.current = null;
    };
  }, [online, refresh]);
  // Never render a previous city's data under a newly selected city, even before effects run.
  return { ...(state.place === place ? state : initial), refresh };
}
