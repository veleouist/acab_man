const CACHE_NAME = "acab-man-v25";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=25",
  "./manifest.webmanifest",
  "./APP_ICON.png",
  "./logo.png",
  "./START_SCREEN.png",
  "./ACAB_MAN.png",
  "./PIGLETS.png",
  "./COCKTAIL.png",
  "./SQUARE.png",
  "./GAME_OVER.png",
  "./TITLE_BACKGROUND.mp4.mp4",
  "./TITLE_MUSIC.mp3",
  "./src/main.js?v=25",
  "./src/game/Background.js",
  "./src/game/Enemy.js?v=23",
  "./src/game/Game.js?v=24",
  "./src/game/HapticsController.js?v=19",
  "./src/game/InputController.js?v=22",
  "./src/game/LeaderboardController.js?v=25",
  "./src/game/Maze.js",
  "./src/game/Player.js?v=23",
  "./src/game/PowerPickup.js",
  "./src/game/SmoothMovement.js?v=23",
  "./src/game/SoundController.js?v=24"
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

  // Always refresh document navigations first. The game code itself remains
  // offline-capable, but a plain browser refresh can now receive new releases.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetchAndCache(event.request).catch(() =>
        caches.match(event.request).then((cachedResponse) => cachedResponse ?? caches.match("./index.html")),
      ),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(
      (cachedResponse) =>
        cachedResponse ??
        fetchAndCache(event.request)
          .catch(() => caches.match("./index.html")),
    ),
  );
});

function fetchAndCache(request) {
  return fetch(request).then((networkResponse) => {
    if (!networkResponse || networkResponse.status !== 200) return networkResponse;
    return caches.open(CACHE_NAME).then((cache) => {
      return cache.put(request, networkResponse.clone()).then(() => networkResponse);
    });
  });
}
