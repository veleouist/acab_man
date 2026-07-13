const CACHE_NAME = "acab-man-v3";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./APP_ICON.png",
  "./START_SCREEN.png",
  "./ACAB_MAN.png",
  "./PIGLETS.png",
  "./COCKTAIL.png",
  "./SQUARE.png",
  "./src/main.js",
  "./src/game/Background.js",
  "./src/game/Enemy.js",
  "./src/game/Game.js",
  "./src/game/InputController.js",
  "./src/game/Maze.js",
  "./src/game/Player.js",
  "./src/game/PowerPickup.js",
  "./src/game/SoundController.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => Promise.all(cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(
      (cachedResponse) =>
        cachedResponse ??
        fetch(event.request)
          .then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200) return networkResponse;
            const responseCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseCopy));
            return networkResponse;
          })
          .catch(() => caches.match("./index.html")),
    ),
  );
});
