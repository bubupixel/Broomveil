# Build the stand-alone index.html for GitHub Pages.
# The Claude artifact viewer adds the doctype, viewport meta and safe-area padding itself;
# a plain web host does not, so they are added here. Also stamps a build version so that
# home-screen installs pick up new releases on their own (see the updater script below).
#
# Usage: python3 tools/build_repo.py <source index.html> <output index.html> [notes]
import sys, json, datetime, os

src, dst = sys.argv[1], sys.argv[2]
notes = sys.argv[3] if len(sys.argv) > 3 else ''
ver = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime('%Y%m%d-%H%M%S')

body = open(src, encoding='utf-8').read()
# load fresh scripts after each release instead of a cached copy
for name in ('audio.js', 'story.js'):
    body = body.replace(f'<script src="{name}"></script>', f'<script src="{name}?v={ver}"></script>')

head = '''<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="format-detection" content="telephone=no">
<style>
html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{touch-action:manipulation;overscroll-behavior:none}
#upd{position:absolute;left:50%;top:calc(104px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:80;
  padding:9px 18px;font:15px "LXGW WenKai TC","Kaiti TC",serif;letter-spacing:.12em;color:#fbf2df;cursor:pointer;
  background:rgba(22,15,11,.92);border:1px solid #ecd7a2;border-radius:999px;box-shadow:0 6px 20px rgba(0,0,0,.45);white-space:nowrap}
</style>
'''

# Full-bleed on phones: the scene runs under the status bar and home indicator;
# only the HUD, panels and dialogue keep clear of them. Placed after the game's own
# stylesheet so these rules win.
fullbleed = '''
<style>
html,body{height:100%}
#app{position:fixed;top:0;bottom:0;left:0;right:0;height:auto}
.hud{padding-top:calc(12px + env(safe-area-inset-top,0px))}
.quest{top:calc(66px + env(safe-area-inset-top,0px))}
.place{top:calc(62px + env(safe-area-inset-top,0px))}
.portrait.framed{top:calc(96px + env(safe-area-inset-top,0px))}
.toast{top:calc(104px + env(safe-area-inset-top,0px))}
.sheet header{padding-top:calc(16px + env(safe-area-inset-top,0px))}
.shade{background:linear-gradient(rgba(14,10,8,.62),rgba(14,10,8,0) calc(17% + env(safe-area-inset-top,0px))),
  linear-gradient(rgba(14,10,8,0) 58%,rgba(14,10,8,.55)),radial-gradient(140% 95% at 50% 42%,transparent 60%,rgba(10,6,4,.5))}
</style>
'''

updater = '''
<script>
// 自動更新：開啟、切回前景時檢查 version.json。還在載入畫面就直接更新；遊戲進行中則顯示提示。
(() => {
  const V = '%s';
  let busy = false;
  // 同一個版本只自動重新載入一次，避免伺服器未同步時不停重新載入
  const tried = v => new URLSearchParams(location.search).get('v') === v;
  const go = v => location.replace(location.pathname + '?v=' + v);
  async function check(){
    if (busy) return; busy = true;
    try {
      const r = await fetch('version.json?t=' + Date.now(), {cache:'no-store'});
      const j = await r.json();
      if (j.v && j.v !== V){
        if (tried(j.v)) return;
        if (document.getElementById('splash') && !document.querySelector('.splash.out')) return go(j.v);
        if (!document.getElementById('upd')){
          const b = document.createElement('button');
          b.id = 'upd'; b.type = 'button'; b.textContent = '有新版本・輕觸更新';
          b.title = '更新後會回到本時段的開頭';
          b.onclick = e => { e.stopPropagation(); go(j.v); };
          (document.getElementById('app') || document.body).appendChild(b);
        }
      }
    } catch (e) {} finally { busy = false; }
  }
  check();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  addEventListener('pageshow', check);
  setInterval(check, 15 * 60 * 1000);
})();
</script>
''' % ver

open(dst, 'w', encoding='utf-8').write(head + body + fullbleed + updater)
open(os.path.join(os.path.dirname(os.path.abspath(dst)), 'version.json'), 'w', encoding='utf-8').write(
    json.dumps({'v': ver, 'notes': notes}, ensure_ascii=False) + '\n')
print('built version', ver)
