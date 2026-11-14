"use client";

let registration: Promise<ServiceWorkerRegistration> | undefined;

export function registerPushWorker(): Promise<ServiceWorkerRegistration> {
  registration ??= navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
    .then(() => new Promise<ServiceWorkerRegistration>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("Notification setup timed out")), 10_000);
      navigator.serviceWorker.ready.then((ready) => {
        window.clearTimeout(timer);
        resolve(ready);
      }, (error) => {
        window.clearTimeout(timer);
        reject(error);
      });
    }))
    .catch((error) => {
      registration = undefined;
      throw error;
    });
  return registration;
}
