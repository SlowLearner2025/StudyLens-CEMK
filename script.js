/* SnapLearn CEMK — script.js
   All shared utilities. Visualization init functions
   are defined IN each HTML file, called from here.
*/

// ============================================================
//  THEME
// ============================================================
function initTheme() {
  const t = localStorage.getItem('cemk_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', t);
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = t === 'dark' ? '☀️' : '🌙';
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const nxt = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', nxt);
  localStorage.setItem('cemk_theme', nxt);
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = nxt === 'dark' ? '☀️' : '🌙';
}

// ============================================================
//  COLLAPSIBLES
// ============================================================
function initCollapsibles() {
  document.querySelectorAll('.collap-hd').forEach(hd => {
    hd.addEventListener('click', () => {
      const bd = hd.nextElementSibling;
      const open = hd.classList.contains('open');
      hd.classList.toggle('open', !open);
      bd.classList.toggle('open', !open);
    });
  });
}

// ============================================================
//  VISUALIZE BUTTONS  ← KEY FIX: use data-vis-id
// ============================================================
// Each visualize button must have:   data-vis="SOME_ID"
// The vis container must have:       id="SOME_ID"  class="vis-wrap"
// The init function must be:         window.VIS["SOME_ID"] = function(canvas){ ... }
// ============================================================
window.VIS = window.VIS || {};  // registry for all vis functions

function initVisButtons() {
  document.querySelectorAll('[data-vis]').forEach(btn => {
    btn.addEventListener('click', function () {
      const id = this.getAttribute('data-vis');
      const wrap = document.getElementById(id);
      if (!wrap) { console.warn('vis wrap not found:', id); return; }

      const isOpen = wrap.classList.contains('open');

      if (isOpen) {
        // CLOSE
        wrap.classList.remove('open');
        this.textContent = '🎬 Visualize Concept';
        // stop animation
        if (wrap._animId) { cancelAnimationFrame(wrap._animId); wrap._animId = null; }
        // disconnect resize observer if present
        if (wrap._resizeObs) { try { wrap._resizeObs.disconnect(); } catch(e){}; wrap._resizeObs = null; }
      } else {
        // OPEN
        wrap.classList.add('open');
        this.textContent = '✕ Close Visualization';

        // Resize canvas to fit container BEFORE drawing
        const canvas = wrap.querySelector('canvas');
        if (canvas) {
          // Wait one frame so display:block takes effect
          requestAnimationFrame(() => {
            const W = wrap.clientWidth - 24; // 12px padding each side
            canvas.width  = Math.max(W, 280);
            canvas.height = canvas.getAttribute('data-h')
              ? parseInt(canvas.getAttribute('data-h'))
              : Math.round(canvas.width * 0.46);

            // Call registered init function
            const fn = window.VIS[id];
            if (fn) {
              try { fn(canvas, wrap); }
              catch (e) { console.error('VIS error for', id, e); }
            } else {
              console.warn('No VIS function registered for:', id);
            }
          });
              // Bind control inputs inside the vis-wrap so changes restart/redraw the visualization
              if (!wrap._controlsBound) {
                wrap.querySelectorAll('input, select').forEach(ctrl => {
                  ctrl.addEventListener('input', () => {
                    const fn2 = window.VIS[id];
                    if (fn2) {
                      try { fn2(canvas, wrap); }
                      catch (e) { console.error('VIS redraw error for', id, e); }
                    }
                  });
                  ctrl.addEventListener('change', () => {
                    const fn3 = window.VIS[id];
                    if (fn3) {
                      try { fn3(canvas, wrap); }
                      catch (e) { console.error('VIS redraw error for', id, e); }
                    }
                  });
                });
                wrap._controlsBound = true;
              }
              // Attach a ResizeObserver so canvas is resized/redrawn when container changes size
              if (!wrap._resizeObs && typeof ResizeObserver !== 'undefined') {
                wrap._resizeObs = new ResizeObserver(() => {
                  const W2 = wrap.clientWidth - 24;
                  canvas.width = Math.max(W2, 280);
                  canvas.height = canvas.getAttribute('data-h') ? parseInt(canvas.getAttribute('data-h')) : Math.round(canvas.width * 0.46);
                  const fnR = window.VIS[id]; if (fnR) { try { fnR(canvas, wrap); } catch(e){console.error('VIS resize error for', id, e);} }
                });
                try { wrap._resizeObs.observe(wrap); } catch(e){}
              }
        }
      }
    });
  });
}

// ============================================================
//  ELI5 BUTTONS
// ============================================================
function initELI5() {
  document.querySelectorAll('[data-eli5]').forEach(btn => {
    btn.addEventListener('click', function () {
      const box = document.getElementById(this.getAttribute('data-eli5'));
      if (!box) return;
      const open = box.classList.contains('open');
      box.classList.toggle('open', !open);
      this.textContent = open ? "🧠 Explain Like I'm Weak" : '✕ Hide';
    });
  });
}

// ============================================================
//  QUIZ ENGINE
// ============================================================
function runQuiz(containerId, questions) {
  const el = document.getElementById(containerId);
  if (!el) return;
  let cur = 0, score = 0, answered = false;
  window['_qdata_' + containerId] = questions;

  function render() {
    if (cur >= questions.length) {
      el.innerHTML = `<div class="card fade">
        <div class="card-title">✅ Quiz Done!</div>
        <p style="font-size:1.4rem;font-weight:700;margin:6px 0">${score}/${questions.length}</p>
        <p class="sm muted">${score===questions.length?'🎉 Perfect!':score>=Math.ceil(questions.length/2)?'👍 Good! Review mistakes.':'📖 Keep studying!'}</p>
        <button class="btn btn-sm mt8" onclick="runQuiz('${containerId}',window._qdata_${containerId})">🔄 Try Again</button>
      </div>`;
      return;
    }
    const q = questions[cur];
    answered = false;
    el.innerHTML = `<div class="fade" style="margin-top:10px">
      <div class="row mb-4">
        <span class="sm muted">Q${cur+1}/${questions.length}</span>
      </div>
      <div class="prog-wrap"><div class="prog-bar" style="width:${(cur/questions.length)*100}%"></div></div>
      <div class="quiz-q" style="margin-top:10px">${q.q}</div>
      <div class="quiz-opts">${q.opts.map((o,i)=>`<div class="quiz-opt" data-i="${i}">${o}</div>`).join('')}</div>
      <div class="quiz-fb" id="_qfb_${containerId}"></div>
    </div>`;
    el.querySelectorAll('.quiz-opt').forEach(opt => {
      opt.addEventListener('click', function () {
        if (answered) return;
        answered = true;
        const i = parseInt(this.getAttribute('data-i'));
        if (i === q.a) score++;
        el.querySelectorAll('.quiz-opt').forEach((o, j) => {
          if (j === q.a) o.classList.add('correct');
          else if (j === i && i !== q.a) o.classList.add('wrong');
        });
        const fb = document.getElementById('_qfb_' + containerId);
        if (fb) fb.innerHTML = i === q.a
          ? `<span style="color:var(--green)">✅ ${q.exp}</span>`
          : `<span style="color:var(--red)">❌ Ans: ${q.opts[q.a]} — ${q.exp}</span>`;
        setTimeout(() => { cur++; render(); }, 2200);
      });
    });
  }
  render();
}

// ============================================================
//  CANVAS HELPERS  (available globally)
// ============================================================
function canvasBg(ctx, w, h) {
  ctx.fillStyle = '#060a10';
  ctx.fillRect(0, 0, w, h);
}
function grid(ctx, w, h, sp = 40) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += sp) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
  for (let y = 0; y < h; y += sp) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
  ctx.restore();
}
function axes(ctx, ox, oy, w, h) {
  ctx.save();
  ctx.strokeStyle = '#2a3040'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ox, oy - h/2 + 10); ctx.lineTo(ox, oy + h/2 - 10);
  ctx.moveTo(ox - w/2 + 10, oy); ctx.lineTo(ox + w/2 - 10, oy);
  ctx.stroke();
  ctx.restore();
}
function arrow(ctx, x1, y1, x2, y2, color, lw=2) {
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  const ang = Math.atan2(y2-y1, x2-x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 10*Math.cos(ang-0.4), y2 - 10*Math.sin(ang-0.4));
  ctx.lineTo(x2 - 10*Math.cos(ang+0.4), y2 - 10*Math.sin(ang+0.4));
  ctx.closePath(); ctx.fill();
  ctx.restore();
}
function label(ctx, txt, x, y, color='#8b949e', size='11px') {
  ctx.save();
  ctx.fillStyle = color; ctx.font = `${size} 'Space Grotesk',sans-serif`;
  ctx.textAlign = 'center'; ctx.fillText(txt, x, y);
  ctx.restore();
}

// ============================================================
//  PROGRESS TRACKER
// ============================================================
function updateProgress() {
  const p = (() => { try { return JSON.parse(localStorage.getItem('cemk_prog')) || {}; } catch { return {}; } })();
  const done = Object.keys(p).length;
  const total = 15;
  const pct = Math.min(100, Math.round(done/total*100));
  const bar = document.getElementById('gProgressBar');
  const lbl = document.getElementById('gProgressLbl');
  if (bar) bar.style.width = pct + '%';
  if (lbl) lbl.textContent = pct + '% Complete';
}

// ============================================================
//  BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initCollapsibles();
  initVisButtons();
  initELI5();
  updateProgress();

  const tb = document.getElementById('themeBtn');
  if (tb) tb.addEventListener('click', toggleTheme);

  // Active bottom nav
  const pg = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.bnav-item').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (pg === href || (pg === '' && href === 'index.html')) a.classList.add('active');
  });

  // Auto-initialize any visualizations that are already open in the DOM
  document.querySelectorAll('.vis-wrap.open').forEach(wrap => {
    const id = wrap.id;
    const canvas = wrap.querySelector('canvas');
    if (!canvas) return;
    // Resize canvas to match visible container
    requestAnimationFrame(() => {
      const W = wrap.clientWidth - 24; // match initVisButtons sizing
      canvas.width  = Math.max(W, 280);
      canvas.height = canvas.getAttribute('data-h')
        ? parseInt(canvas.getAttribute('data-h'))
        : Math.round(canvas.width * 0.46);

      const fn = window.VIS[id];
      if (fn) {
        try { fn(canvas, wrap); }
        catch (e) { console.error('VIS error for', id, e); }
      }
    });
    // Bind controls and resize observer for pre-open vis-wraps
    if (!wrap._controlsBound) {
      wrap.querySelectorAll('input, select').forEach(ctrl => {
        ctrl.addEventListener('input', () => { const fn2 = window.VIS[id]; if (fn2) { try { fn2(canvas, wrap); } catch(e){console.error('VIS redraw error for', id, e);} } });
        ctrl.addEventListener('change', () => { const fn3 = window.VIS[id]; if (fn3) { try { fn3(canvas, wrap); } catch(e){console.error('VIS redraw error for', id, e);} } });
      });
      wrap._controlsBound = true;
    }
    if (!wrap._resizeObs && typeof ResizeObserver !== 'undefined') {
      wrap._resizeObs = new ResizeObserver(() => {
        const W2 = wrap.clientWidth - 24;
        canvas.width = Math.max(W2, 280);
        canvas.height = canvas.getAttribute('data-h') ? parseInt(canvas.getAttribute('data-h')) : Math.round(canvas.width * 0.46);
        const fnR = window.VIS[id]; if (fnR) { try { fnR(canvas, wrap); } catch(e){console.error('VIS resize error for', id, e);} }
      });
      try { wrap._resizeObs.observe(wrap); } catch(e){}
    }
  });
});