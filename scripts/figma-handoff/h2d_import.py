# html.to.design File-tab batch import through an intercepted chooser (figma domain skill recipe).
# exec'd inside browser-harness, where cdp/js/bg_attach/iframe_target/drain_events/wait live.
import json, time
FILE_URL = "figma.com/design/IhP85A6mlHZqUbHWtEzHCH"

def _ev(expr, gesture=False):
    r = cdp("Runtime.evaluate", expression=expr, userGesture=gesture, returnByValue=True)
    return r.get("result", {}).get("value")

def plugin_session():
    bg_attach_url(FILE_URL)
    fid = iframe_target("h2d.to.design/plugin")
    bg_attach(fid)
    cdp("Page.enable"); cdp("Runtime.enable"); cdp("DOM.enable")
    return fid

def open_file_tab():
    return _ev("(()=>{const t=[...document.querySelectorAll('button,[role=tab],a,span,div')].find(e=>e.textContent.trim()==='File' && e.children.length===0); if(!t) return 'no tab'; t.click(); return 'ok'})()", True)

def choose(paths):
    """Arm the chooser on the plugin session, click the File tab's visible file input, hand it the files."""
    cdp("Page.setInterceptFileChooserDialog", enabled=True)
    drain_events()
    which = _ev("""(()=>{const ins=[...document.querySelectorAll('input[type=file]')];
      const vis=ins.find(i=>{let e=i; while(e){const s=getComputedStyle(e); if(s.display==='none') return false; e=e.parentElement;} return true;}) || ins[ins.length-1];
      vis.setAttribute('data-pick','1'); vis.click(); return ins.indexOf(vis)})()""", True)
    t0 = time.time(); evt = None
    while time.time() - t0 < 10 and not evt:
        for e in drain_events():
            if e.get("method") == "Page.fileChooserOpened": evt = e; break
        if not evt: wait(0.3)
    if not evt: return f"no chooser event (input {which})"
    cdp("DOM.setFileInputFiles", files=paths, backendNodeId=evt["params"]["backendNodeId"])
    cdp("Page.setInterceptFileChooserDialog", enabled=False)
    return f"handed {len(paths)} files to input {which}"

WANT = {"autolayout": True, "style": False, "existing": False, "hover": False, "high": False, "hyperlink": True, "layer name": True, "don't show": False}

def enforce_options():
    """The inline Import options panel: set each checkbox to what we want, then Proceed."""
    for _ in range(20):
        vis = _ev("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Proceed' && b.getBoundingClientRect().width>0)")
        if vis: break
        wait(0.5)
    else:
        return "no options panel (import may have started directly)"
    state = _ev("""JSON.stringify([...document.querySelectorAll('input[type=checkbox]')].map((c,i)=>{let l=c.closest('label'); let t=(l?l.innerText:(c.parentElement?c.parentElement.innerText:'')).replace(/\\s+/g,' ').trim().toLowerCase(); return {i,t:t.slice(0,80),on:c.checked}}))""")
    changed = []
    for c in json.loads(state or "[]"):
        for key, want in WANT.items():
            if key in c["t"]:
                if c["on"] != want:
                    _ev(f"document.querySelectorAll('input[type=checkbox]')[{c['i']}].click()", True); changed.append((c["t"][:40], want))
                break
    final = _ev("""JSON.stringify([...document.querySelectorAll('input[type=checkbox]')].map(c=>{let l=c.closest('label'); return ((l?l.innerText:c.parentElement.innerText)||'').replace(/\\s+/g,' ').trim().slice(0,40)+'='+c.checked}))""")
    # The plugin keeps the previous batch's options panel (and its Proceed) in the DOM: click only a VISIBLE Proceed.
    _ev("(()=>{const b=[...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Proceed').find(b=>{const r=b.getBoundingClientRect(); return r.width>0&&r.height>0}); if(b) b.click(); return !!b})()", True)
    return {"changed": changed, "final": final}

def wait_done(names, timeout=900):
    """Done when no Loading/Importing text remains and the completed panel names this batch."""
    t0 = time.time(); last = ""
    while time.time() - t0 < timeout:
        txt = _ev("document.body.innerText.replace(/\\s+/g,' ')") or ""
        busy = ("Loading file" in txt) or ("Importing" in txt and "Import completed" not in txt)
        if not busy and ("completed" in txt.lower()):
            hits = sum(1 for n in names if n[:8] in txt)
            return {"done": True, "secs": round(time.time() - t0), "chips_matched": hits, "of": len(names), "tail": txt[-300:]}
        if txt[-120:] != last: last = txt[-120:]
        wait(3)
    return {"done": False, "tail": last}
