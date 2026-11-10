# Build the stand-alone index.html for GitHub Pages: the artifact viewer adds the doctype,
# viewport meta and safe-area padding itself; a plain web host does not, so add them here.
import sys
src, dst = sys.argv[1], sys.argv[2]
body = open(src, encoding='utf-8').read()
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
</style>
'''
open(dst, 'w', encoding='utf-8').write(head + body)
