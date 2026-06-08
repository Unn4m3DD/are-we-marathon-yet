export function secondsPerKmFromWorkout(distanceKm?: number | null, durationMin?: number | null) {
  if (!distanceKm || !durationMin || distanceKm <= 0 || durationMin <= 0) {
    return null;
  }

  return Math.round((durationMin * 60) / distanceKm);
}

export function secondsPerKmFromMinPerKm(paceMinPerKm?: number | null) {
  if (!paceMinPerKm || paceMinPerKm <= 0) {
    return null;
  }

  return Math.round(paceMinPerKm * 60);
}

export function paceToSpeedKmh(secondsPerKm: number) {
  return 3600 / secondsPerKm;
}

export function paceMinPerKmToSpeedKmh(paceMinPerKm: number) {
  return 60 / paceMinPerKm;
}

export function formatPace(secondsPerKm: number) {
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}/km`;
}

export function formatSpeed(secondsPerKm: number) {
  return `${paceToSpeedKmh(secondsPerKm).toFixed(1)} km/h`;
}

export function formatPaceAndSpeed(secondsPerKm: number) {
  return `${formatPace(secondsPerKm)} · ${formatSpeed(secondsPerKm)}`;
}

export function formatPaceMinPerKmAndSpeed(paceMinPerKm?: number | null) {
  const seconds = secondsPerKmFromMinPerKm(paceMinPerKm);

  if (!seconds || !paceMinPerKm) {
    return null;
  }

  return `${formatPace(seconds)} · ${paceMinPerKmToSpeedKmh(paceMinPerKm).toFixed(1)} km/h`;
}

export function formatPaceRange(
  fastestSecondsPerKm?: number | null,
  slowestSecondsPerKm?: number | null,
) {
  if (!fastestSecondsPerKm || !slowestSecondsPerKm) {
    return null;
  }

  const lowSpeed = paceToSpeedKmh(slowestSecondsPerKm).toFixed(1);
  const highSpeed = paceToSpeedKmh(fastestSecondsPerKm).toFixed(1);

  return `${formatPace(fastestSecondsPerKm).replace("/km", "")}-${formatPace(
    slowestSecondsPerKm,
  )} · ${lowSpeed}-${highSpeed} km/h`;
}

export function formatDistance(distanceKm?: number | null) {
  if (distanceKm == null) {
    return null;
  }

  return `${Number.isInteger(distanceKm) ? distanceKm.toFixed(0) : distanceKm.toFixed(1)} km`;
}

export function formatDuration(durationMin?: number | null) {
  if (durationMin == null) {
    return null;
  }

  const hours = Math.floor(durationMin / 60);
  const minutes = Math.round(durationMin % 60);
  if (hours === 0) {
    return `${minutes} min`;
  }

  return `${hours}h ${minutes.toString().padStart(2, "0")}`;
}
