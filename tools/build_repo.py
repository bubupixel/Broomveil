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
:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{touch-action:manipulation;overscroll-behavior:none}
#upd{position:absolute;left:50%;top:104px;transform:translateX(-50%);z-index:80;
  padding:9px 18px;font:15px "LXGW WenKai TC","Kaiti TC",serif;letter-spacing:.12em;color:#fbf2df;cursor:pointer;
  background:rgba(22,15,11,.92);border:1px solid #ecd7a2;border-radius:999px;box-shadow:0 6px 20px rgba(0,0,0,.45);white-space:nowrap}
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

open(dst, 'w', encoding='utf-8').write(head + body + updater)
open(os.path.join(os.path.dirname(os.path.abspath(dst)), 'version.json'), 'w', encoding='utf-8').write(
    json.dumps({'v': ver, 'notes': notes}, ensure_ascii=False) + '\n')
print('built version', ver)
