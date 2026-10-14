from pathlib import Path
import subprocess, urllib.request, webbrowser, time, sys
root=Path(__file__).resolve().parent
try:
 urllib.request.urlopen('http://localhost:8091/api/status',timeout=1)
except Exception:
 subprocess.Popen([sys.executable,str(root/'serve.py')],cwd=root,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 for _ in range(30):
  try:
   urllib.request.urlopen('http://localhost:8091/api/status',timeout=1);break
  except Exception:time.sleep(.15)
webbrowser.open('http://localhost:8091/')
