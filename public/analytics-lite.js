// Lightweight tracker for static presentation pages (/sena/, /luma/).
// Writes to the same analytics as the main site, with the same tab session id,
// so the "portfolio → presentation" transition shows up as one route.
// As on the site, events are sent only after a live human action.
(function () {
  var h = location.hostname;
  if (h === "localhost" || h === "127.0.0.1" || h.endsWith(".local")) return;
  try { if (navigator.webdriver) return; } catch (e) {}

  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }
  var sid = ss("a_sid");
  if (!sid) { sid = Math.random().toString(36).slice(2) + Date.now().toString(36); ss("a_sid", sid); }
  var ref = new URLSearchParams(location.search).get("ref");
  if (ref) ss("a_ref", ref.slice(0, 32));
  var tz = null;
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch (e) {}

  var human = ss("a_human") === "1";
  var queue = [];
  function post(body, beacon) {
    try {
      if (beacon && navigator.sendBeacon) { navigator.sendBeacon("/api/analytics/track", new Blob([body], { type: "application/json" })); return; }
      fetch("/api/analytics/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: body, keepalive: true }).catch(function () {});
    } catch (e) {}
  }
  function send(type, meta, beacon) {
    var body = JSON.stringify({
      type: type, path: location.pathname, referrer: type === "pageview" ? document.referrer || null : null,
      link_code: ss("a_ref"), session_id: sid, lang: document.documentElement.lang || null, tz: tz, meta: meta == null ? null : String(meta),
    });
    if (human) post(body, beacon); else if (queue.length < 50) queue.push(body);
  }
  function markHuman() {
    if (human) return;
    human = true; ss("a_human", "1");
    queue.splice(0).forEach(function (b) { post(b); });
  }
  if (!human) {
    var moves = 0;
    window.addEventListener("pointermove", function () { if (++moves >= 3) markHuman(); }, { passive: true });
    ["scroll", "wheel", "touchstart", "keydown", "pointerdown"].forEach(function (ev) { window.addEventListener(ev, markHuman, { passive: true }); });
  }

  send("pageview", null);

  // Time on page: only while the tab is visible.
  var acc = 0, start = Date.now(), sent = false;
  function flush() {
    if (sent) return;
    if (document.visibilityState === "visible") { acc += Date.now() - start; start = Date.now(); }
    sent = true;
    if (acc >= 2000) send("page_time", Math.round(acc / 1000), true);
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") { acc += Date.now() - start; start = Date.now(); flush(); }
    else { sent = false; start = Date.now(); }
  });
  window.addEventListener("pagehide", flush);

  // Leaving via an external link (GitHub, download) and returning to the main site.
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    try {
      var u = new URL(a.href, location.href);
      if (/^https?:$/.test(u.protocol) && u.host !== location.host) send("outbound_click", u.href.slice(0, 500));
    } catch (e2) {}
  }, true);
})();
