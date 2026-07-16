// ponytail: bare service worker. Its only job is to make the app installable —
// Chrome/Edge only fire `beforeinstallprompt` once a SW with a fetch handler is
// registered. No offline caching (not asked for); add a caching strategy here
// if the app ever needs to work offline.
self.addEventListener("fetch", () => {});
