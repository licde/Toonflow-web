let setupPromise: Promise<void> | null = null;

export function setupWebavLog() {
  if (!setupPromise) {
    setupPromise = import("@webav/av-cliper").then(({ Log }) => {
      Log.setLogLevel(Log.warn);
    });
  }
  return setupPromise;
}
