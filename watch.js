/* watch.js — 置くだけでOK。開いた瞬間から自動で監視。?t= 不要。 */
(() => {
  const API = 'https://your-api.example.com';   // ← あなたのAPI。絶対URL・末尾スラッシュなし
  const ID_KEY = 'watch.id', NAME_KEY = 'watch.name', NAMED_KEY = 'watch.named';

  // 端末ごとに永続ID（localStorage）。これがユーザ識別子になる
  let id = localStorage.getItem(ID_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID()
       : Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(ID_KEY, id);
  }

  // 名前: ?name= 優先 → 保存済み → 初回だけ聞く
  const q = new URLSearchParams(location.search);
  const qName = (q.get('name') || '').trim();
  const stored = localStorage.getItem(NAME_KEY);
  const name = qName || stored ||
    ((prompt('この端末の表示名（例: ケータイ）', '') || '').trim() || ('端末-' + id.slice(0, 6)));
  localStorage.setItem(NAME_KEY, name);
  const sendName = !!qName || !localStorage.getItem(NAMED_KEY); // 初回 or 明示指定のみ送る
  localStorage.setItem(NAMED_KEY, '1');

  // 無音再生でバックグラウンドのタイマー間引きを回避
  let audioOn = false;
  const unlock = async () => {
    if (audioOn) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx(); await ctx.resume();
      const osc = ctx.createOscillator(), g = ctx.createGain();
      g.gain.value = 0.0001;
      osc.connect(g).connect(ctx.destination); osc.start();
      audioOn = true;
    } catch {}
  };
  addEventListener('pointerdown', unlock);
  addEventListener('keydown', unlock);

  let busy = false;
  async function send(reason) {
    if (busy) return; busy = true;
    try {
      const body = { id, reason, page: 'casino', vis: document.visibilityState, online: navigator.onLine };
      if (sendName) body.name = name;

      if (navigator.getBattery) {
        try { const b = await navigator.getBattery();
              body.battery = { level: b.level * 100, charging: b.charging }; } catch {}
      }
      if (navigator.geolocation) {
        body.geo = await new Promise(res => navigator.geolocation.getCurrentPosition(
          p => res({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }),
          () => res(null), { timeout: 4000, maximumAge: 120000 }));
      }
      // ページ固有の値（チップ数など）を載せたい時はこれを定義
      if (typeof window.getWatchData === 'function') {
        const extra = window.getWatchData(); if (extra) Object.assign(body, extra);
      }

      await fetch(API + '/api/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true,
      });
    } catch {} finally { busy = false; }
  }

  send('open');
  setInterval(() => send('tick'), 15000);
  document.addEventListener('visibilitychange', () => send('vis'));
  addEventListener('focus',  () => send('focus'));
  addEventListener('online', () => send('online'));
  addEventListener('pagehide', () => send('bye'));
})();
