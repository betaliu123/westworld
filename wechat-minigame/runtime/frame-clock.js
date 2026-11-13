// Keep animation callbacks and performance.now() in the same millisecond clock domain.
export function createFrameClock({nativePerformance, wxPerformance, now = Date.now, request, cancel, schedule = setTimeout, unschedule = clearTimeout} = {}) {
  const source = nativePerformance?.now ? () => nativePerformance.now()
    : wxPerformance?.now ? () => wxPerformance.now() / 1000
    : now;
  const origin = source();
  let previous = 0;
  const performance = {now() {const value = source() - origin;previous = Math.max(previous, Number.isFinite(value) ? value : previous);return previous;}};
  return {
    performance,
    requestAnimationFrame(callback) {return request ? request(() => callback(performance.now())) : schedule(() => callback(performance.now()), 16);},
    cancelAnimationFrame(id) {if(request)cancel?.(id);else unschedule(id);},
  };
}
