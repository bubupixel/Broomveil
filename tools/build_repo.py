# Build the GitHub Pages release.
#
#   python3 tools/build_repo.py <source index.html> <repo root> [notes]
#
# Layout it writes:
#   index.html         – a tiny launcher. Home-screen shortcuts open this page. It never holds game
#                        content: it reads version.json (no cache) and jumps to v/<version>/.
#   v/<version>/       – the game page for that release. A new release is a new address, so a
#                        phone can never be served a stale copy of the game.
#   version.json       – the current release number.
#
# The Claude artifact viewer adds the doctype, viewport meta and safe-area padding itself; a plain
# web host does not, so they are added here too.
import sys, json, datetime, os, shutil, re

src, root = sys.argv[1], sys.argv[2]
notes = sys.argv[3] if len(sys.argv) > 3 else ''
ver = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime('%Y%m%d-%H%M%S')
KEEP = 4  # how many old releases to keep, so a phone mid-update still finds its files

META = '''<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="format-detection" content="telephone=no">
<meta name="theme-color" content="#1f1a3e">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="花朝靈院">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
'''

# ---------- game page: v/<ver>/index.html ----------
body = open(src, encoding='utf-8').read()
for name in ('audio.js', 'story.js'):
    body = body.replace(f'<script src="{name}"></script>', f'<script src="{name}?v={ver}"></script>')

game_head = '''<!doctype html>
<html lang="zh-Hant">
<head>
<base href="../../">
''' + META + '''<style>
html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{touch-action:manipulation;overscroll-behavior:none}
#upd{position:absolute;left:50%;top:calc(104px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:80;
  padding:9px 18px;font:15px "LXGW WenKai TC","Kaiti TC",serif;letter-spacing:.12em;color:#fbf2df;cursor:pointer;
  background:rgba(22,15,11,.92);border:1px solid #ecd7a2;border-radius:999px;box-shadow:0 6px 20px rgba(0,0,0,.45);white-space:nowrap}
</style>
<script>window.GAME_VERSION = '__VER__';</script>
'''.replace('__VER__', ver)

# Full-bleed on phones: the scene runs under the status bar and home indicator; only the HUD,
# panels and dialogue keep clear of them. Placed after the game's stylesheet so these rules win.
fullbleed = '''
<style>
html,body{height:100%}
#app{position:fixed;top:0;bottom:0;left:0;right:0;height:auto}
/* iOS home-screen apps with a translucent status bar size the page one status bar short and leave
   a black band at the bottom. In home-screen mode make the page itself taller by that amount and
   lay the game over the whole page. Painted navy so any leftover gap matches the title screen. */
html{background:#1f1a3e}
html.ios-app,html.ios-app body{height:calc(100% + env(safe-area-inset-top,0px));overflow:hidden}
html.ios-app #app{position:absolute;top:0;left:0;right:0;bottom:auto;height:100%}
.hud{padding-top:calc(12px + env(safe-area-inset-top,0px))}
.quest{top:calc(66px + env(safe-area-inset-top,0px))}
.place{top:calc(62px + env(safe-area-inset-top,0px))}
.portrait.framed{top:calc(96px + env(safe-area-inset-top,0px))}
.toast{top:calc(104px + env(safe-area-inset-top,0px))}
.sheet header{padding-top:calc(16px + env(safe-area-inset-top,0px))}
.shade{background:linear-gradient(rgba(14,10,8,.62),rgba(14,10,8,0) calc(17% + env(safe-area-inset-top,0px))),
  linear-gradient(rgba(14,10,8,0) 58%,rgba(14,10,8,.55)),radial-gradient(140% 95% at 50% 42%,transparent 60%,rgba(10,6,4,.5))}
</style>
<script>if (navigator.standalone || matchMedia('(display-mode: standalone)').matches) document.documentElement.classList.add('ios-app');</script>
'''

updater = '''
<script>
// 更新：開啟、切回前景、每 15 分鐘檢查 version.json。還在載入畫面就直接跳到新版本；
// 遊戲進行中則顯示提示，避免打斷。新版本放在新的網址 v/<版本>/，不會讀到舊快取。
(() => {
  const V = window.GAME_VERSION;
  let busy = false;
  const go = v => location.replace('v/' + v + '/');
  const sp = document.getElementById('splash');
  if (sp){ const t = document.createElement('div'); t.id = 'verlabel'; t.textContent = '版本 ' + V;
    t.style.cssText = 'font-size:11px;letter-spacing:.08em;color:rgba(241,227,195,.5);margin-top:4px';
    sp.appendChild(t); }
  const say = t => { const n = document.getElementById('vernote'); if (n) n.textContent = t; };
  async function check(manual){
    if (busy) return; busy = true;
    if (manual) say('檢查中……');
    try {
      const r = await fetch('version.json?t=' + Date.now(), {cache:'no-store'});
      const j = await r.json();
      if (j.v && j.v > V){
        try { localStorage.setItem('huachao-last-v', j.v); } catch (e) {}
        if (manual) { say('找到新版本 ' + j.v + '，更新中……'); return go(j.v); }
        if (document.getElementById('splash') && !document.querySelector('.splash.out')) return go(j.v);
        if (!document.getElementById('upd')){
          const b = document.createElement('button');
          b.id = 'upd'; b.type = 'button'; b.textContent = '有新版本・輕觸更新';
          b.title = '更新後會回到本時段的開頭';
          b.onclick = e => { e.stopPropagation(); go(j.v); };
          (document.getElementById('app') || document.body).appendChild(b);
        }
      } else if (manual) say('目前版本：' + V + '（已是最新）');
    } catch (e) { if (manual) say('目前版本：' + V + '（無法連線檢查更新）'); }
    finally { busy = false; }
  }
  window.checkUpdate = m => check(m === true);
  try { localStorage.setItem('huachao-last-v', V); } catch (e) {}
  check();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  addEventListener('pageshow', () => check());
  setInterval(check, 15 * 60 * 1000);
})();
</script>
'''

vdir = os.path.join(root, 'v', ver)
os.makedirs(vdir, exist_ok=True)
open(os.path.join(vdir, 'index.html'), 'w', encoding='utf-8').write(game_head + body + fullbleed + updater)

# keep the newest releases only
vroot = os.path.join(root, 'v')
for old in sorted(d for d in os.listdir(vroot) if re.fullmatch(r'\d{8}-\d{6}', d))[:-KEEP]:
    shutil.rmtree(os.path.join(vroot, old))

# ---------- launcher: index.html ----------
launcher = '''<!doctype html>
<html lang="zh-Hant">
<head>
''' + META + '''<title>花朝靈院</title>
<link rel="icon" type="image/png" sizes="32x32" href="icons/icon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="icons/icon-180.png">
<link rel="manifest" href="manifest.json">
<style>
html,body{height:100%;margin:0;background:#1f1a3e}
body{background:#1f1a3e url("img/title_v2.jpg") center top / cover no-repeat;color:#f1e3c3;font:14px "Kaiti TC","STKaiti",serif}
p{position:fixed;left:0;right:0;bottom:calc(15vh + env(safe-area-inset-bottom,0px));margin:0;text-align:center;letter-spacing:.4em}
</style>
</head>
<body>
<p id="msg">載入中</p>
<script>
// 入口：讀取最新版本號，再跳到該版本的網址。讀不到時，用上次玩過的版本或這個入口建立時的版本。
(() => {
  const FALLBACK = '__VER__';
  const last = () => { try { return localStorage.getItem('huachao-last-v'); } catch (e) { return null; } };
  const go = v => location.replace('v/' + v + '/' + location.hash);
  let done = false;
  const fail = () => { if (done) return; done = true; const v = [last(), FALLBACK].filter(Boolean).sort().pop(); document.getElementById('msg').textContent = '離線模式'; go(v); };
  setTimeout(fail, 6000);
  fetch('version.json?t=' + Date.now(), {cache:'no-store'}).then(r => r.json()).then(j => {
    if (done || !j.v) return fail(); done = true;
    try { localStorage.setItem('huachao-last-v', j.v); } catch (e) {}
    go(j.v);
  }).catch(fail);
})();
</script>
</body>
</html>
'''.replace('__VER__', ver)
open(os.path.join(root, 'index.html'), 'w', encoding='utf-8').write(launcher)

open(os.path.join(root, 'version.json'), 'w', encoding='utf-8').write(
    json.dumps({'v': ver, 'notes': notes}, ensure_ascii=False) + '\n')
print('built version', ver)
