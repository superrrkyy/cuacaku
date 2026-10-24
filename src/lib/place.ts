import type { Place } from "../types/weather";

/**
 * Identity of a saved location: two entries are the same city when their
 * coordinates match. Kept in `lib/` (not inside a component module) so both
 * `App` and `FavoriteCities` can share it without breaking fast refresh.
 */
export const placeKey = (place: Place) => `${place.latitude},${place.longitude}`;
