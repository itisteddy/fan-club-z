/**
 * Shared native auth in-flight state (module singleton).
 * Keeps logic deterministic without using window globals.
 */

let _authInFlight = false;

export function setNativeAuthInFlight(v: boolean) {
  _authInFlight = v;
}

export function isNativeAuthInFlight(): boolean {
  return _authInFlight;
}

