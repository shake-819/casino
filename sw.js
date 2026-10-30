self.addEventListener("install", function(e){ self.skipWaiting(); });
self.addEventListener("activate", function(e){ e.waitUntil(self.clients.claim()); });

self.addEventListener("notificationclick", function(e){
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(cs){
    for (var i = 0; i < cs.length; i++) {
      if (cs[i].url.indexOf(self.location.origin) === 0) return cs[i].focus();
    }
    return clients.openWindow((e.notification.data && e.notification.data.url) || "/");
  }));
});
