// Service Worker para Gold's Gains PWA
const CACHE_NAME = "golds-gains-v1";
const STATIC_CACHE = "static-v1";

// Archivos estáticos a cachear
const STATIC_FILES = ["/", "/home", "/plan", "/progress", "/logo.png"];

// Instalación del Service Worker
self.addEventListener("install", (event) => {
  console.log("[SW] Instalando Service Worker...");
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log("[SW] Cacheando archivos estáticos");
      return cache.addAll(STATIC_FILES);
    })
  );
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener("activate", (event) => {
  console.log("[SW] Activando Service Worker...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
            console.log("[SW] Eliminando cache antiguo:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Intercepción de peticiones
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar peticiones a Supabase o APIs externas (dejar que fallen naturalmente si no hay conexión)
  if (
    url.hostname.includes("supabase") ||
    url.hostname.includes("googleapis") ||
    request.method !== "GET"
  ) {
    return;
  }

  // Strategy: Network First, fallback to Cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Si la respuesta es válida, cachearla
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Si falla la red, intentar desde cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Si no está en cache y es una navegación, devolver página offline
          if (request.mode === "navigate") {
            return caches.match("/");
          }
        });
      })
  );
});

// Sincronización en background cuando vuelve la conexión
self.addEventListener("sync", (event) => {
  console.log("[SW] Evento de sincronización:", event.tag);

  if (event.tag === "sync-workouts") {
    event.waitUntil(syncOfflineWorkouts());
  }
});

// Función para sincronizar workouts offline
async function syncOfflineWorkouts() {
  console.log("[SW] Sincronizando workouts offline...");

  // Enviar mensaje a los clientes para que sincronicen
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: "SYNC_WORKOUTS",
    });
  });
}

// Listener para mensajes desde la app
self.addEventListener("message", (event) => {
  console.log("[SW] Mensaje recibido:", event.data);

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaititing();
  }

  if (event.data.type === "SYNC_NOW") {
    syncOfflineWorkouts();
  }
});
