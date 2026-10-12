// Heroku eco dynos go to sleep after 30 minutes without an HTTP request, and an
// open socket does not count as one - so a long game used to get the server put
// to sleep mid-round, wiping everything it held in memory.
//
// While a game is running we ping the server over plain HTTP every few minutes
// to keep it awake. If the game goes quiet (no events from the server for a
// while - say a tab left open overnight) we stop, so the dyno can still sleep
// and save eco hours when nobody is actually playing.
const PING_EVERY_MS = 5 * 60 * 1000;
const STOP_AFTER_IDLE_MS = 30 * 60 * 1000;

// Starts pinging; returns a cleanup function that stops it (handy as the
// return value of a useEffect).
export function keepServerAwake(serverUrl, socket) {
  let lastActivity = Date.now();
  const markActive = () => {
    lastActivity = Date.now();
  };
  socket.onAny(markActive);

  const timer = setInterval(() => {
    if (Date.now() - lastActivity > STOP_AFTER_IDLE_MS) return;
    fetch(new URL("/ping", serverUrl), { cache: "no-store" }).catch(() => {
      // Asleep or unreachable - the socket's own reconnect handles that.
    });
  }, PING_EVERY_MS);

  return () => {
    clearInterval(timer);
    socket.offAny(markActive);
  };
}
