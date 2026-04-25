self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  const payload = event.data.json();
  const title = payload.title || "Portal Noemia";
  const options = {
    body: payload.body || "Existe uma atualizacao aguardando voce.",
    icon: "/icon",
    badge: "/apple-icon",
    data: {
      href: payload.href || "/cliente",
      notificationId: payload.notificationId || null
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification.data?.href || "/cliente";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => "focus" in client);

      if (existing) {
        existing.navigate(href);
        return existing.focus();
      }

      return self.clients.openWindow(href);
    })
  );
});
