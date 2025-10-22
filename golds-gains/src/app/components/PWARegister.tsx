"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[PWA] Service Worker registrado:", registration.scope);

          // Verificar si hay actualizaciones
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            console.log("[PWA] Nueva versión del Service Worker encontrada");

            newWorker?.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                console.log(
                  "[PWA] Nueva versión disponible, recarga la página"
                );
              }
            });
          });
        })
        .catch((error) => {
          console.error("[PWA] Error al registrar Service Worker:", error);
        });

      // Listener para mensajes del Service Worker
      navigator.serviceWorker.addEventListener("message", (event) => {
        console.log("[PWA] Mensaje del Service Worker:", event.data);

        if (event.data.type === "SYNC_WORKOUTS") {
          // Disparar evento personalizado para que los componentes sincronicen
          window.dispatchEvent(new CustomEvent("sync-workouts"));
        }
      });

      // Listener para cuando vuelve la conexión
      window.addEventListener("online", () => {
        console.log("[PWA] Conexión restaurada, sincronizando...");
        // Disparar sincronización
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: "SYNC_NOW",
          });
        }
        // Disparar evento personalizado
        window.dispatchEvent(new CustomEvent("sync-workouts"));
      });

      window.addEventListener("offline", () => {
        console.log("[PWA] Sin conexión, modo offline activado");
      });
    }
  }, []);

  return null;
}
