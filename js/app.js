/* Permis B Belgique — application d'entraînement (vanilla JS, sans dépendances). */
(function () {
  'use strict';

  const QUESTIONS = window.QUESTIONS || [];
  const THEMES = window.THEMES || [];
  const MEMO = window.MEMO || [];
  const LESSONS = window.LESSONS || {};
  const THEME_LABEL = Object.fromEntries(THEMES.map((t) => [t.key, t.label]));
  const G = window.Game;
  const CREDITS = window.PHOTO_CREDITS || {};
  const PHOTO_QS = QUESTIONS.filter((q) => q.photo);

  const EXAM_SIZE = 50;
  const PASS_MARK = 41;
  const TRAIN_SIZE = 20;
  const SWIPE_SIZE = 20;
  const CHRONO_SECONDS = 60;
  const EXAM_PHOTOS = 12;
  const LETTERS = ['A', 'B', 'C', 'D'];
  const GOALS = [[20, 'Détente'], [50, 'Normal'], [100, 'Sérieux'], [150, 'Intense']];

  // ---------- Stockage de la progression par question ----------
  const STORE_KEY = 'permi.v1';
  const store = (() => {
    let data = { q: {}, exams: [], themesPlayed: {}, lessons: {} };
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) data = Object.assign(data, JSON.parse(raw));
    } catch (e) { /* stockage indisponible : on continue en mémoire */ }
    const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ } };
    return {
      data, save,
      record(id, ok) {
        const r = data.q[id] || { s: 0, c: 0, last: null };
        r.s += 1; if (ok) r.c += 1; r.last = ok ? 1 : 0; r.t = Date.now();
        data.q[id] = r; save();
      },
      addExam(e) { data.exams.unshift(e); data.exams = data.exams.slice(0, 30); save(); },
      reset() { data.q = {}; data.exams = []; data.themesPlayed = {}; data.lessons = {}; save(); },
      get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
      set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
    };
  })();

  // ---------- Utilitaires ----------
  const $app = document.getElementById('app');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pct = (n, d) => (d ? Math.round((100 * n) / d) : 0);
  const go = (hash) => { if (location.hash === hash) render(); else location.hash = hash; };
  const signHTML = (code) => (code && window.Signs && Signs.has(code) ? Signs.render(code) : '');
  // Lien vers l'article officiel (codedelaroute.be) et signalement d'erreur (issue GitHub pré-remplie).
  const AR_URL = 'https://www.codedelaroute.be/fr/reglementation/1975120109~hra8v386pu';
  const LOI_URL = 'https://www.codedelaroute.be/fr/reglementation/1968031601~invynqx4tj';
  const ISSUE_URL = 'https://github.com/hugohismans/Permi/issues/new';
  function refURL(ref) {
    if (!ref || /1998|2006/.test(ref)) return null;
    const m = ref.match(/Art(?:icle)?\.?\s*(\d+)(bis|ter|quater|quinquies|sexies|septies|octies|novies|decies|undecies)?/i);
    if (!m) return /1968/.test(ref) ? LOI_URL : AR_URL;
    return (/1968/.test(ref) ? LOI_URL : AR_URL) + '#art-' + m[1] + (m[2] ? m[2].toLowerCase() : '');
  }
  function issueURL(title, lines) {
    const body = lines.concat(['', '**Ce qui ne va pas (et source si tu en as une) :**', '']).join('\n');
    return `${ISSUE_URL}?labels=${encodeURIComponent('erreur-contenu')}&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  }
  function reportURL(q, mine) {
    return issueURL(`Erreur possible : ${q.id}`, [
      `**Question ${q.id}** (${THEME_LABEL[q.theme] || q.theme})`, '', `> ${q.q}`, '',
      ...q.choices.map((c, k) => `- ${k === q.answer ? '✅' : '⬜'} ${LETTERS[k]}. ${c}${k === mine ? ' ← ma réponse' : ''}`), '',
      `Explication de l'app : ${q.explain}`, `Référence : ${q.ref || '—'}`, q.photo ? `Photo : ${q.photo}` : '',
    ]);
  }
  function refHTML(ref, report) {
    const u = refURL(ref);
    return `<div class="ref">${esc(ref || '')}${u ? ` · <a href="${u}" target="_blank" rel="noopener">📜 Lire l’article officiel</a>` : ''}${report ? ` · <a href="${report}" target="_blank" rel="noopener">🚩 Signaler une erreur</a>` : ''}</div>`;
  }
  const plural = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`;
  function photoHTML(q, small) {
    if (!q.photo) return '';
    const c = CREDITS[q.photo] || {};
    return `<figure class="q-photo${small ? ' small' : ''}"><img src="img/photos/${esc(q.photo)}.jpg" alt="Photo de la situation" loading="lazy" data-zoom>
      ${small ? '' : `<figcaption>Photo : ${esc(c.author || 'Panoramax')} · <a href="${esc(c.url || 'https://panoramax.fr')}" target="_blank" rel="noopener">Panoramax</a> · CC BY-SA 4.0</figcaption>`}</figure>`;
  }

  function themeStats(key) {
    const qs = key ? QUESTIONS.filter((q) => q.theme === key) : QUESTIONS;
    let seen = 0, mastered = 0;
    for (const q of qs) {
      const r = store.data.q[q.id];
      if (r) { seen++; if (r.last === 1) mastered++; }
    }
    return { total: qs.length, seen, mastered };
  }
  const mistakes = () => QUESTIONS.filter((q) => store.data.q[q.id] && store.data.q[q.id].last === 0);

  function recordAnswer(q, ok) {
    store.record(q.id, ok);
    const st = themeStats(q.theme);
    if (st.total >= 10 && st.mastered / st.total >= 0.9) G.unlock('master');
  }

  // Priorise : jamais vues > ratées > les autres, avec un peu de hasard.
  function pickForTraining(pool, n) {
    const w = (q) => { const r = store.data.q[q.id]; if (!r) return 0; if (r.last === 0) return 1; return 2; };
    return shuffle(pool).sort((a, b) => w(a) - w(b)).slice(0, n);
  }

  // Examen : tirage proportionnel à la taille de chaque thème.
  function pickExam() {
    const total = QUESTIONS.length;
    if (total <= EXAM_SIZE) return shuffle(QUESTIONS);
    const quotas = THEMES.map((t) => {
      const pool = QUESTIONS.filter((q) => q.theme === t.key);
      const exact = (pool.length / total) * EXAM_SIZE;
      return { pool: shuffle(pool), n: Math.floor(exact), frac: exact - Math.floor(exact) };
    });
    let rest = EXAM_SIZE - quotas.reduce((s, x) => s + x.n, 0);
    quotas.slice().sort((a, b) => b.frac - a.frac).forEach((x) => { if (rest > 0) { x.n++; rest--; } });
    let picked = quotas.flatMap((x) => x.pool.slice(0, x.n));
    // Comme à l'examen réel, une partie des questions s'appuie sur une photo.
    const want = Math.min(EXAM_PHOTOS, PHOTO_QS.length);
    const have = picked.filter((q) => q.photo).length;
    if (have < want) {
      const ids = new Set(picked.map((q) => q.id));
      const extra = shuffle(PHOTO_QS.filter((q) => !ids.has(q.id))).slice(0, want - have);
      const removable = shuffle(picked.filter((q) => !q.photo)).slice(0, extra.length).map((q) => q.id);
      picked = picked.filter((q) => !removable.includes(q.id)).concat(extra);
    }
    return shuffle(picked);
  }

  // ---------- Effets : sons, toasts, confettis ----------
  const fx = (() => {
    let ctx = null;
    const tone = (freq, start, dur, type = 'sine', vol = 0.12) => {
      if (!G.state.sound) return;
      try {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator(), gn = ctx.createGain();
        o.type = type; o.frequency.value = freq;
        gn.gain.setValueAtTime(vol, ctx.currentTime + start);
        gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        o.connect(gn).connect(ctx.destination);
        o.start(ctx.currentTime + start); o.stop(ctx.currentTime + start + dur);
      } catch (e) { /* audio indisponible */ }
    };
    const vibrate = (p) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* ignore */ } };
    return {
      good() { tone(660, 0, 0.12); tone(990, 0.09, 0.18); },
      bad() { tone(180, 0, 0.25, 'square', 0.06); vibrate(80); },
      fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.25, 'triangle')); },
    };
  })();

  const toastBox = document.createElement('div');
  toastBox.className = 'toasts'; toastBox.setAttribute('aria-live', 'polite');
  document.body.appendChild(toastBox);
  function toast(html, kind = '') {
    const t = document.createElement('div');
    t.className = 'toast' + (kind ? ' t-' + kind : '');
    while (toastBox.children.length >= 3) toastBox.firstChild.remove(); t.innerHTML = html;
    toastBox.appendChild(t);
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3000);
  }

  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = document.createElement('canvas');
    c.className = 'confetti'; document.body.appendChild(c);
    const W = (c.width = innerWidth), H = (c.height = innerHeight), x = c.getContext('2d');
    const cols = ['#1f5fbf', '#c8102e', '#f5c400', '#14a44d', '#f39200', '#8b5cf6'];
    const P = Array.from({ length: 140 }, () => ({ x: W / 2 + (Math.random() - 0.5) * W * 0.4, y: H * 0.35, vx: (Math.random() - 0.5) * 12,
      vy: -Math.random() * 13 - 4, s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: cols[(Math.random() * cols.length) | 0] }));
    let f = 0;
    (function step() {
      x.clearRect(0, 0, W, H);
      for (const p of P) {
        p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vx *= 0.99;
        x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore();
      }
      if (++f < 150) requestAnimationFrame(step); else c.remove();
    })();
  }

  G.on((ev) => {
    if (ev.type === 'level') { toast(`<b>Niveau ${ev.level} !</b> Continue comme ça.`, 'level'); fx.fanfare(); confetti(); }
    else if (ev.type === 'goal') { toast(`🔥 <b>Objectif du jour atteint !</b> Série : ${plural(ev.streak, 'jour')}`, 'goal'); fx.fanfare(); confetti(); }
    else if (ev.type === 'badge') toast(`<span class="ti">${ev.badge.icon}</span> Badge débloqué : <b>${esc(ev.badge.name)}</b>`, 'badge');
    else if (ev.type === 'freezeEarned') toast('🧊 Tu gagnes un <b>gel de série</b> : il protège ta série si tu rates un jour.', 'badge');
    else if (ev.type === 'freeze') toast(`🧊 ${ev.used > 1 ? ev.used + ' gels de série utilisés' : 'Un gel de série a été utilisé'} : ta série est sauvée !`, 'badge');
    updateHeader();
  });

  function updateHeader() {
    const s = G.streak();
    const el = document.getElementById('hdrStreak');
    if (el) {
      el.innerHTML = `<span class="flame ${G.goalMet(G.dayKey()) ? 'lit' : ''}">🔥</span>${s}`;
      el.title = `Série de ${plural(s, 'jour')}`;
    }
    const xp = document.getElementById('hdrXP');
    if (xp) xp.innerHTML = `⭐ ${G.todayXP()}<small>/${G.state.goal}</small>`;
  }

  function floatXP(anchor, n) {
    if (!anchor || !n) return;
    const r = anchor.getBoundingClientRect();
    const f = document.createElement('div');
    f.className = 'float-xp'; f.textContent = `+${n} XP`;
    f.style.left = r.left + r.width / 2 + 'px'; f.style.top = r.top + window.scrollY + 'px';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 900);
  }

  // ---------- Session QCM (examen / entraînement) ----------
  let session = null;

  function startSession(mode, questions, title, back, extra = {}) {
    G.resetCombo();
    session = Object.assign({ mode, title, back, questions, i: 0, answers: [], selected: null, validated: false,
      start: Date.now(), xp: 0 }, extra);
    go('#/quiz');
  }

  function comboChip() {
    const c = G.state.combo;
    return c >= 2 ? `<span class="combo ${c >= 10 ? 'hot' : ''}">⚡ Combo ×${c}</span>` : '';
  }

  function viewQuiz() {
    if (!session || session.mode === 'swipe' || session.mode === 'chrono') return go('#/');
    const s = session;
    const q = s.questions[s.i];
    const n = s.questions.length;
    const isExam = s.mode === 'exam';
    const answered = s.validated;

    const choices = q.choices.map((c, k) => {
      let cls = 'choice';
      if (answered && !isExam) {
        if (k === q.answer) cls += ' correct';
        else if (k === s.selected) cls += ' wrong';
      } else if (k === s.selected) cls += ' selected';
      return `<button class="${cls}" data-choice="${k}" ${answered ? 'disabled' : ''}>
        <span class="k">${LETTERS[k]}</span><span>${esc(c)}</span></button>`;
    }).join('');

    let feedback = '';
    if (answered && !isExam) {
      const ok = s.selected === q.answer;
      feedback = `<div class="feedback ${ok ? 'ok' : 'bad'}" role="status">
        <b>${ok ? pickCheer() : 'Pas tout à fait'}</b>${!ok ? ` — la bonne réponse était <b>${LETTERS[q.answer]}</b>.` : ''}
        ${q.focus ? `<p class="focus">👀 ${esc(q.focus)}</p>` : ''}
        <p>${esc(q.explain)}</p>${refHTML(q.ref, reportURL(q, s.selected))}</div>`;
    }

    const action = isExam
      ? `<button class="btn primary" id="next" ${s.selected == null ? 'disabled' : ''}>${s.i + 1 < n ? 'Valider et continuer' : 'Valider et terminer'}</button>`
      : answered
        ? `<button class="btn primary" id="next">${s.i + 1 < n ? 'Continuer' : 'Voir le bilan'}</button>`
        : `<button class="btn primary" id="validate" ${s.selected == null ? 'disabled' : ''}>Valider</button>`;

    $app.innerHTML = `
      <div class="quiz-head">
        <button class="icon-btn small" id="quit" aria-label="Quitter">✕</button>
        <div class="progress"><i style="width:${pct(s.i + (answered ? 1 : 0), n)}%"></i></div>
        <span class="tag">${s.i + 1}/${n}</span>
      </div>
      <div class="quiz-sub"><span>${esc(s.title)}</span>${isExam ? '' : comboChip()}</div>
      <article class="card">
        ${q.grave && !isExam ? '<span class="grave-flag">Faute grave possible (−5 à l’examen)</span>' : ''}
        ${photoHTML(q)}
        ${q.sign ? `<div class="q-sign">${signHTML(q.sign)}</div>` : ''}
        <p class="q-text">${esc(q.q)}</p>
        <div class="choices">${choices}</div>
        ${feedback}
        <div class="btn-row">${action}</div>
      </article>`;

    $app.querySelectorAll('[data-choice]').forEach((b) => b.addEventListener('click', () => choose(+b.dataset.choice)));
    const v = document.getElementById('validate'); if (v) v.addEventListener('click', validate);
    const nx = document.getElementById('next'); if (nx) nx.addEventListener('click', next);
    document.getElementById('quit').addEventListener('click', quitSession);
  }

  const CHEERS = ['Bien joué !', 'Exact !', 'Parfait !', 'Bravo !', 'Excellent !', 'Tout juste !'];
  const pickCheer = () => CHEERS[(Math.random() * CHEERS.length) | 0];

  function quitSession() {
    const s = session;
    if (!s) return go('#/');
    const started = s.answers ? s.answers.length : s.results.length;
    if (started === 0 || confirm('Quitter cette partie ? L’XP et la progression déjà gagnées sont conservées.')) {
      stopChrono(); const back = s.back; session = null; go(back || '#/');
    }
  }

  function choose(k) {
    if (!session || session.validated) return;
    session.selected = k;
    viewQuiz();
  }
  function validate() {
    const s = session; if (!s || s.selected == null || s.validated) return;
    const q = s.questions[s.i];
    const ok = s.selected === q.answer;
    s.validated = true;
    s.answers.push(s.selected);
    recordAnswer(q, ok);
    if (s.mode !== 'exam') {
      const xp = G.answer(ok, { grave: q.grave });
      s.xp += xp;
      ok ? fx.good() : fx.bad();
      viewQuiz();
      if (ok) floatXP(document.querySelector('.choice.correct'), xp);
    } else {
      viewQuiz();
    }
  }
  function next() {
    const s = session; if (!s) return;
    if (s.mode === 'exam' && !s.validated) validate();
    if (s.selected == null) return;
    if (s.i + 1 >= s.questions.length) { finish(); return; }
    s.i++; s.selected = null; s.validated = false;
    viewQuiz();
    window.scrollTo(0, 0);
  }

  function reviewList(items) {
    return items.map((r) => `
      <div class="card review-item">
        ${r.q.sign ? `<div class="mini-sign">${signHTML(r.q.sign)}</div>` : ''}
        ${photoHTML(r.q, true)}
        ${r.q.grave ? '<span class="grave-flag">Faute grave</span>' : ''}
        <b>${esc(r.q.q)}</b>
        ${r.mine != null ? `<p class="ans bad">Ta réponse : ${esc(r.mine)}</p>` : ''}
        <p class="ans ok">Bonne réponse : ${esc(r.q.choices[r.q.answer])}</p>
        <p style="margin:6px 0 0">${esc(r.q.explain)}</p>
        ${refHTML(r.q.ref, reportURL(r.q, r.mineIdx))}
      </div>`).join('');
  }

  function finish() {
    const s = session;
    const res = s.questions.map((q, k) => ({ q, a: s.answers[k], ok: s.answers[k] === q.answer }));
    const wrong = res.filter((r) => !r.ok);
    const minutes = Math.max(1, Math.round((Date.now() - s.start) / 60000));
    let head, celebrate = false;
    if (s.mode === 'exam') {
      const graves = wrong.filter((r) => r.q.grave).length;
      const score = Math.max(0, EXAM_SIZE - (wrong.length - graves) - 5 * graves);
      const pass = score >= PASS_MARK;
      store.addExam({ d: Date.now(), score, pass });
      const xpBefore = G.state.xp;
      G.examResult(score, pass);
      s.xp += G.state.xp - xpBefore;
      celebrate = pass;
      head = `<div class="card score ${pass ? 'pass' : 'fail'}">
        <div class="big">${score}<small>/${EXAM_SIZE}</small></div>
        <div class="verdict">${pass ? 'Réussi 🎉' : 'Échoué'}</div>
        <p class="lead">${plural(wrong.length, 'erreur')}, dont ${plural(graves, 'faute grave')} (−5 chacune) · ${minutes} min<br>
        Seuil de réussite : ${PASS_MARK}/${EXAM_SIZE}</p>
        <div class="xp-earned">+${s.xp} XP</div></div>`;
    } else {
      const good = res.length - wrong.length;
      const perfect = wrong.length === 0;
      if (perfect && res.length >= 10) { G.addXP(20, 'perfect'); s.xp += 20; }
      celebrate = pct(good, res.length) >= 80;
      head = `<div class="card score ${celebrate ? 'pass' : 'fail'}">
        <div class="big">${good}<small>/${res.length}</small></div>
        <div class="verdict">${perfect ? 'Sans faute ! 🏆' : pct(good, res.length) + ' % de bonnes réponses'}</div>
        <p class="lead">${minutes} min${perfect && res.length >= 10 ? ' · bonus sans faute +20 XP' : ''}</p>
        <div class="xp-earned">+${s.xp} XP</div></div>`;
      if (s.reviewStart >= 10 && mistakes().length === 0) G.unlock('clean');
    }
    const mode = s.mode, back = s.back, title = s.title;
    session = null;
    $app.innerHTML = `
      <h1>Bilan — ${esc(title)}</h1>
      ${head}
      <div class="btn-row">
        <button class="btn" id="home">Accueil</button>
        ${wrong.length ? '<button class="btn" id="redo">Refaire mes erreurs</button>' : ''}
        <button class="btn primary" id="again">${mode === 'exam' ? 'Nouvel examen' : 'Nouvelle série'}</button>
      </div>
      ${wrong.length ? `<h2>Corrections (${wrong.length})</h2>${reviewList(wrong.map((r) => ({ q: r.q, mine: r.q.choices[r.a], mineIdx: r.a })))}` : ''}`;
    document.getElementById('home').onclick = () => go('#/');
    document.getElementById('again').onclick = () => {
      if (mode === 'exam') startExam();
      else if (back && back.startsWith('#/theme/')) startTheme(back.slice(8));
      else go(back || '#/');
    };
    const redo = document.getElementById('redo');
    if (redo) redo.onclick = () => startSession('train', shuffle(wrong.map((r) => r.q)), 'Mes erreurs', '#/');
    window.scrollTo(0, 0);
    if (celebrate) { fx.fanfare(); confetti(); }
  }

  const startExam = () => startSession('exam', pickExam(), 'Examen blanc', '#/');
  function startTheme(key) {
    store.data.themesPlayed[key] = true; store.save();
    if (THEMES.every((t) => store.data.themesPlayed[t.key])) G.unlock('allthemes');
    const pool = QUESTIONS.filter((q) => q.theme === key);
    startSession('train', pickForTraining(pool, TRAIN_SIZE), THEME_LABEL[key] || key, '#/theme/' + key);
  }
  function startReview() {
    const m = mistakes();
    if (m.length) startSession('train', shuffle(m), 'Mes erreurs', '#/', { reviewStart: m.length });
  }

  // ---------- Vrai ou Faux (swipe) & Défi chrono ----------
  // Chaque carte = une question + une réponse proposée (la bonne une fois sur deux).
  function makeCards(qs) {
    return qs.map((q) => {
      const isTrue = Math.random() < 0.5;
      const wrongs = q.choices.map((_, k) => k).filter((k) => k !== q.answer);
      const shown = isTrue ? q.answer : wrongs[(Math.random() * wrongs.length) | 0];
      return { q, shown, isTrue };
    });
  }

  let chronoTimer = null;
  const stopChrono = () => { if (chronoTimer) { clearInterval(chronoTimer); chronoTimer = null; } };

  function startSwipe(mode) {
    G.resetCombo();
    const chrono = mode === 'chrono';
    const qs = chrono ? shuffle(QUESTIONS) : pickForTraining(QUESTIONS, SWIPE_SIZE);
    session = { mode, title: chrono ? 'Défi chrono' : 'Vrai ou Faux', back: '#/', cards: makeCards(qs), i: 0, results: [],
      xp: 0, feedback: null, timeLeft: CHRONO_SECONDS, start: Date.now() };
    go('#/swipe');
    if (chrono) {
      chronoTimer = setInterval(() => {
        if (!session || session.mode !== 'chrono') return stopChrono();
        session.timeLeft--;
        const t = document.getElementById('chronoTime');
        if (t) { t.textContent = session.timeLeft + ' s'; t.classList.toggle('low', session.timeLeft <= 10); }
        if (session.timeLeft <= 0) { stopChrono(); finishSwipe(); }
      }, 1000);
    }
  }

  function viewSwipe() {
    const s = session;
    if (!s || (s.mode !== 'swipe' && s.mode !== 'chrono')) return go('#/');
    const chrono = s.mode === 'chrono';
    const card = s.cards[s.i];
    const head = chrono
      ? `<div class="quiz-head"><button class="icon-btn small" id="quit" aria-label="Quitter">✕</button>
           <div class="chrono-score">✓ ${s.results.filter((r) => r.ok).length}</div>
           <span class="tag chrono" id="chronoTime">${s.timeLeft} s</span></div>`
      : `<div class="quiz-head"><button class="icon-btn small" id="quit" aria-label="Quitter">✕</button>
           <div class="progress"><i style="width:${pct(s.i + (s.feedback ? 1 : 0), s.cards.length)}%"></i></div>
           <span class="tag">${s.i + 1}/${s.cards.length}</span></div>`;

    let fb = '';
    if (s.feedback) {
      const r = s.feedback;
      fb = `<div class="feedback ${r.ok ? 'ok' : 'bad'}" role="status">
        <b>${r.ok ? pickCheer() : 'Raté !'}</b> Cette réponse était <b>${r.card.isTrue ? 'VRAIE' : 'FAUSSE'}</b>.
        ${r.card.isTrue ? '' : `<p>Bonne réponse : <b>${esc(r.card.q.choices[r.card.q.answer])}</b></p>`}
        <p>${esc(r.card.q.explain)}</p>${refHTML(r.card.q.ref, reportURL(r.card.q))}</div>
        <div class="btn-row"><button class="btn primary" id="next">${s.i + 1 < s.cards.length ? 'Continuer' : 'Voir le bilan'}</button></div>`;
    }

    $app.innerHTML = `${head}
      <div class="quiz-sub"><span>${esc(s.title)}</span>${comboChip()}</div>
      <div class="swipe-zone">
        ${s.feedback ? '' : `<div class="swipe-card" id="card" tabindex="0" aria-label="Carte : glisse à droite pour Vrai, à gauche pour Faux">
          <span class="stamp yes">VRAI</span><span class="stamp no">FAUX</span>
          ${photoHTML(card.q, true)}
          ${card.q.sign ? `<div class="q-sign">${signHTML(card.q.sign)}</div>` : ''}
          <p class="q-text">${esc(card.q.q)}</p>
          <div class="proposal"><small>Réponse proposée</small>${esc(card.q.choices[card.shown])}</div>
        </div>`}
        ${fb}
      </div>
      ${s.feedback ? '' : `<div class="swipe-actions">
        <button class="round-btn no" id="btnNo" aria-label="Faux">✕<small>Faux</small></button>
        <button class="round-btn yes" id="btnYes" aria-label="Vrai">✓<small>Vrai</small></button>
      </div>
      <p class="hint">Glisse la carte → pour <b>Vrai</b>, ← pour <b>Faux</b> (ou flèches du clavier).</p>`}`;

    document.getElementById('quit').addEventListener('click', quitSession);
    const nx = document.getElementById('next'); if (nx) nx.addEventListener('click', nextSwipe);
    if (!s.feedback) {
      document.getElementById('btnYes').addEventListener('click', () => decide(true));
      document.getElementById('btnNo').addEventListener('click', () => decide(false));
      bindDrag(document.getElementById('card'));
    }
  }

  function bindDrag(el) {
    let x0 = null, y0 = 0, dx = 0, id = null;
    const yes = el.querySelector('.stamp.yes'), no = el.querySelector('.stamp.no');
    const paint = () => {
      el.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
      yes.style.opacity = Math.max(0, Math.min(1, dx / 90));
      no.style.opacity = Math.max(0, Math.min(1, -dx / 90));
    };
    el.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; dx = 0; id = e.pointerId; el.setPointerCapture(id); el.classList.add('dragging'); });
    el.addEventListener('pointermove', (e) => { if (x0 == null || e.pointerId !== id) return; dx = e.clientX - x0; if (Math.abs(dx) > Math.abs(e.clientY - y0) || Math.abs(dx) > 10) paint(); });
    const end = () => {
      if (x0 == null) return;
      x0 = null; el.classList.remove('dragging');
      if (Math.abs(dx) > 90) decide(dx > 0);
      else { dx = 0; paint(); }
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  function decide(saysTrue) {
    const s = session;
    if (!s || s.feedback || s.busy) return;
    const card = s.cards[s.i];
    const ok = saysTrue === card.isTrue;
    s.busy = true;
    const el = document.getElementById('card');
    if (el) {
      el.classList.add('fly', saysTrue ? 'right' : 'left', ok ? 'good' : 'badc');
    }
    // Progression : une erreur renvoie la question dans « Mes erreurs » ; une bonne réponse
    // ne compte comme maîtrisée que si la carte montrait la bonne réponse.
    if (!ok) recordAnswer(card.q, false);
    else if (card.isTrue) recordAnswer(card.q, true);
    const xp = G.answer(ok, { base: s.mode === 'chrono' ? 3 : 5 });
    s.xp += xp;
    s.results.push({ card, ok });
    ok ? fx.good() : fx.bad();
    setTimeout(() => {
      s.busy = false;
      if (session !== s) return;
      if (s.mode === 'chrono') { s.i++; if (s.i >= s.cards.length) { s.cards.push(...makeCards(shuffle(QUESTIONS))); } viewSwipe(); }
      else { s.feedback = { card, ok }; viewSwipe(); }
    }, s.mode === 'chrono' ? 230 : 280);
  }

  function nextSwipe() {
    const s = session; if (!s) return;
    s.feedback = null;
    if (s.i + 1 >= s.cards.length) return finishSwipe();
    s.i++; viewSwipe();
  }

  function finishSwipe() {
    const s = session; stopChrono();
    const good = s.results.filter((r) => r.ok).length;
    const wrong = s.results.filter((r) => !r.ok);
    let extra = '';
    if (s.mode === 'chrono') {
      const rec = G.chronoResult(good);
      extra = rec && good > 0 ? '<div class="record">🏅 Nouveau record !</div>' : `<p class="lead">Record : ${G.state.chronoBest}</p>`;
    } else if (good === s.results.length && s.results.length >= SWIPE_SIZE) {
      G.unlock('swipe20'); G.addXP(20, 'perfect'); s.xp += 20;
    }
    const celebrate = s.mode === 'chrono' ? good >= 10 : pct(good, s.results.length) >= 80;
    const mode = s.mode;
    session = null;
    $app.innerHTML = `<h1>Bilan — ${mode === 'chrono' ? 'Défi chrono' : 'Vrai ou Faux'}</h1>
      <div class="card score ${celebrate ? 'pass' : 'fail'}">
        <div class="big">${good}<small>${mode === 'chrono' ? ' en 60 s' : '/' + s.results.length}</small></div>
        <div class="verdict">${mode === 'chrono' ? `${good} bonne${good > 1 ? 's' : ''} réponse${good > 1 ? 's' : ''}` : pct(good, s.results.length) + ' % de bonnes réponses'}</div>
        ${extra}<div class="xp-earned">+${s.xp} XP</div></div>
      <div class="btn-row"><button class="btn" id="home">Accueil</button><button class="btn primary" id="again">Rejouer</button></div>
      ${wrong.length ? `<h2>À revoir (${wrong.length})</h2>${reviewList(wrong.map((r) => ({ q: r.q || r.card.q })))}` : ''}`;
    document.getElementById('home').onclick = () => go('#/');
    document.getElementById('again').onclick = () => startSwipe(mode);
    window.scrollTo(0, 0);
    if (celebrate) { fx.fanfare(); confetti(); }
  }

  // ---------- Cours ----------
  const lessonDone = (key) => !!(store.data.lessons || {})[key];
  let lessonPos = {};

  function viewLessons() {
    const rows = THEMES.filter((t) => LESSONS[t.key]).map((t) => {
      const L = LESSONS[t.key];
      return `<button class="card theme-row" data-lesson="${t.key}">
        <span class="t"><b>${esc(L.title)}</b><small>${L.sections.length} sections · ~${Math.max(3, Math.round(L.sections.length * 1.2))} min</small></span>
        <span class="pct">${lessonDone(t.key) ? '✅' : '📖'}</span></button>`;
    }).join('');
    const n = THEMES.filter((t) => lessonDone(t.key)).length;
    $app.innerHTML = `<h1>Cours</h1>
      <p class="lead">Lis le cours d’un thème, puis teste-toi. ${n}/${Object.keys(LESSONS).length} cours terminés · +30 XP par cours terminé.</p>
      <div class="theme-list">${rows}</div>`;
    $app.querySelectorAll('[data-lesson]').forEach((b) => b.addEventListener('click', () => go('#/cours/' + b.dataset.lesson)));
  }

  function viewLesson(key) {
    const L = LESSONS[key];
    if (!L) return go('#/cours');
    const total = L.sections.length + 1; // + écran « À retenir »
    const i = Math.min(lessonPos[key] || 0, total - 1);
    const last = i === total - 1;
    let body;
    if (!last) {
      const sec = L.sections[i];
      body = `${i === 0 ? `<p class="lesson-intro">${esc(L.intro)}</p>` : ''}
        <h2 class="lesson-h">${esc(sec.title)}</h2>
        ${sec.signs && sec.signs.length ? `<div class="lesson-signs">${sec.signs.map((c) => `<figure>${signHTML(c)}<figcaption>${esc(Signs.label(c))}</figcaption></figure>`).join('')}</div>` : ''}
        <div class="lesson-body">${sec.body}</div>
        ${sec.tip ? `<div class="tip">💡 ${esc(sec.tip)}</div>` : ''}
        ${refHTML(sec.ref, issueURL(`Erreur possible dans le cours : ${L.title}`, [`**Cours** : ${L.title}`, `**Section** : ${sec.title}`, `Référence : ${sec.ref || '—'}`]))}`;
    } else {
      body = `<h2 class="lesson-h">🧠 À retenir</h2>
        <ul class="keypoints">${L.keypoints.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>`;
    }
    $app.innerHTML = `
      <div class="quiz-head">
        <button class="icon-btn small" id="lquit" aria-label="Fermer le cours">✕</button>
        <div class="progress"><i style="width:${pct(i + 1, total)}%"></i></div>
        <span class="tag">${i + 1}/${total}</span>
      </div>
      <div class="quiz-sub"><span>📖 ${esc(L.title)}</span></div>
      <article class="card lesson">${body}
        <div class="btn-row">
          ${i > 0 ? '<button class="btn" id="lprev">Précédent</button>' : ''}
          ${last ? '<button class="btn primary" id="ltest">Tester ce chapitre</button>' : '<button class="btn primary" id="lnext">Suivant</button>'}
        </div>
      </article>`;
    document.getElementById('lquit').onclick = () => go('#/cours');
    const pv = document.getElementById('lprev'); if (pv) pv.onclick = () => { lessonPos[key] = i - 1; viewLesson(key); window.scrollTo(0, 0); };
    const nx = document.getElementById('lnext');
    if (nx) nx.onclick = () => { lessonPos[key] = i + 1; if (i + 1 === total - 1) completeLesson(key); viewLesson(key); window.scrollTo(0, 0); };
    const t = document.getElementById('ltest'); if (t) t.onclick = () => { lessonPos[key] = 0; startTheme(key); };
  }

  function completeLesson(key) {
    if (lessonDone(key)) return;
    store.data.lessons[key] = Date.now(); store.save();
    G.addXP(30, 'lesson');
    G.unlock('lesson1');
    toast(`📖 Cours terminé : <b>+30 XP</b>`, 'goal');
    if (Object.keys(LESSONS).every((k) => lessonDone(k))) G.unlock('scholar');
    fx.fanfare();
  }

  // ---------- Vues ----------
  function weekStrip() {
    const today = G.dayKey();
    const names = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    let html = '';
    for (let i = 6; i >= 0; i--) {
      const k = G.addDays(today, -i);
      const [y, m, d] = k.split('-').map(Number);
      const dow = new Date(y, m - 1, d).getDay();
      const st = G.state.frozen[k] ? 'frozen' : G.goalMet(k) ? 'done' : (G.state.days[k] ? 'partial' : '');
      html += `<div class="day ${st} ${k === today ? 'today' : ''}"><span>${names[dow]}</span><i>${st === 'done' ? '🔥' : st === 'frozen' ? '🧊' : ''}</i></div>`;
    }
    return `<div class="week">${html}</div>`;
  }

  function ring(value, max) {
    const r = 34, c = 2 * Math.PI * r, p = Math.min(1, value / max);
    return `<svg class="ring" viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="${r}" class="track"/>
      <circle cx="40" cy="40" r="${r}" class="val" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}"/></svg>`;
  }

  function viewHome() {
    const st = themeStats();
    const errs = mistakes().length;
    const last = store.data.exams[0];
    const lv = G.levelInfo();
    const s = G.streak();
    const today = G.todayXP(), goal = G.state.goal;
    const done = G.goalMet(G.dayKey());
    $app.innerHTML = `
      <section class="card hero">
        <div class="hero-top">
          <div class="streak-big ${done ? 'lit' : ''}"><span class="flame">🔥</span><b>${s}</b><small>${s > 1 ? 'jours de série' : 'jour de série'}</small></div>
          <div class="goal">${ring(today, goal)}<div class="goal-txt"><b>${Math.min(today, goal)}/${goal}</b><small>XP du jour</small></div></div>
        </div>
        ${weekStrip()}
        <p class="hero-msg">${done ? 'Objectif atteint, ta série est assurée pour aujourd’hui ! 💪' : s > 0 ? `Encore <b>${goal - today} XP</b> pour prolonger ta série !` : `Gagne <b>${goal} XP</b> aujourd’hui pour lancer ta série.`}
        ${G.state.freezes ? `<span class="freeze-chip" title="Gels de série disponibles">🧊 ×${G.state.freezes}</span>` : ''}</p>
        <div class="level"><span class="lvl-badge">Niv. ${lv.level}</span><div class="bar"><i style="width:${pct(lv.into, lv.need)}%"></i></div><small>${lv.into}/${lv.need} XP</small></div>
      </section>

      <h2>Modes de jeu</h2>
      <div class="modes">
        ${Object.keys(LESSONS).length ? `<button class="card mode m-cours" data-go="cours"><span class="mi">📖</span><strong>Cours</strong><span>${THEMES.filter((t) => lessonDone(t.key)).length}/${Object.keys(LESSONS).length} terminés · commence ici</span></button>` : ''}
        <button class="card mode m-exam" id="exam"><span class="mi">🎓</span><strong>Examen blanc</strong><span>50 questions · 41/50 pour réussir</span></button>
        <button class="card mode m-swipe" id="swipe"><span class="mi">👆</span><strong>Vrai ou Faux</strong><span>Swipe à gauche ou à droite</span></button>
        <button class="card mode m-chrono" id="chrono"><span class="mi">⏱️</span><strong>Défi chrono</strong><span>60 s · record ${G.state.chronoBest}</span></button>
        <button class="card mode m-train" data-go="themes"><span class="mi">📚</span><strong>Par thème</strong><span>${pct(st.mastered, st.total)} % maîtrisé</span></button>
        <button class="card mode m-err" id="review" ${errs ? '' : 'disabled'}><span class="mi">🩹</span><strong>Mes erreurs</strong><span>${errs ? plural(errs, 'question') + ' à revoir' : 'Rien à revoir'}</span></button>
        ${PHOTO_QS.length ? `<button class="card mode m-photo" id="photos"><span class="mi">📸</span><strong>Situations</strong><span>${PHOTO_QS.length} photos de vraies rues belges</span></button>` : ''}
        <button class="card mode m-signs" data-go="signs"><span class="mi">🚸</span><strong>Panneaux</strong><span>Galerie & devinettes</span></button>
      </div>

      <div class="grid2">
        <button class="card tile" data-go="badges"><strong>🏅 Badges</strong><span>${Object.keys(G.state.badges).length}/${G.BADGES.length} débloqués</span></button>
        <button class="card tile" data-go="memo"><strong>📝 Mémo</strong><span>Les chiffres clés</span></button>
        <button class="card tile" data-go="stats"><strong>📈 Statistiques</strong><span>${last ? 'Dernier examen : ' + last.score + '/50' : 'Progression par thème'}</span></button>
        <button class="card tile" data-go="settings"><strong>⚙️ Réglages</strong><span>Objectif : ${goal} XP/jour</span></button>
      </div>

      <div class="notice">Le 1<sup>er</sup> juin 2027, un nouveau <b>Code de la voie publique</b> remplacera le code de la route actuel.
      Les questions portent sur les règles <b>en vigueur aujourd’hui</b> (AR du 1<sup>er</sup> décembre 1975).</div>`;
    document.getElementById('exam').onclick = startExam;
    document.getElementById('swipe').onclick = () => startSwipe('swipe');
    document.getElementById('chrono').onclick = () => startSwipe('chrono');
    document.getElementById('review').onclick = startReview;
    const ph = document.getElementById('photos');
    if (ph) ph.onclick = () => startSession('train', pickForTraining(PHOTO_QS, 15), 'Situations en photo', '#/');
  }

  function viewThemes() {
    const rows = THEMES.map((t) => {
      const st = themeStats(t.key);
      const p = pct(st.mastered, st.total);
      const crown = p >= 90 ? '👑' : p >= 60 ? '🥈' : p >= 30 ? '🥉' : '';
      return `<div class="card theme-row">
        <span class="t"><b>${esc(t.label)} ${crown}</b><small>${esc(t.desc || '')} · ${st.total} questions · ${p} %</small>
          <span class="bar"><i style="width:${p}%"></i></span></span>
        <span class="row-actions">
          ${LESSONS[t.key] ? `<button class="btn small" data-lesson="${t.key}">${lessonDone(t.key) ? '✅' : '📖'} Cours</button>` : ''}
          <button class="btn small primary" data-theme="${t.key}">S’entraîner</button></span></div>`;
    }).join('');
    $app.innerHTML = `<h1>Entraînement par thème</h1>
      <p class="lead">Séries de ${TRAIN_SIZE} questions : les questions jamais vues et ratées passent en premier. 🥉 30 % · 🥈 60 % · 👑 90 % maîtrisé.</p>
      <div class="theme-list">${rows}</div>
      <div class="btn-row"><button class="btn" id="all">Série mélangée (tous thèmes)</button></div>`;
    $app.querySelectorAll('[data-theme]').forEach((b) => b.addEventListener('click', () => startTheme(b.dataset.theme)));
    $app.querySelectorAll('[data-lesson]').forEach((b) => b.addEventListener('click', () => go('#/cours/' + b.dataset.lesson)));
    document.getElementById('all').onclick = () => startSession('train', pickForTraining(QUESTIONS, TRAIN_SIZE), 'Tous thèmes', '#/themes');
  }

  let signQuiz = false;
  function viewSigns() {
    const cards = Signs.codes().map((c) => `
      <div class="card sign-card ${signQuiz ? 'hidden-label' : ''}" data-sign="${c}" tabindex="0">
        ${Signs.render(c)}
        <div class="code">${c.startsWith('FEU') ? 'Feu' : c}</div>
        <div class="lbl">${esc(Signs.label(c))}</div>
      </div>`).join('');
    $app.innerHTML = `<h1>Panneaux & feux</h1>
      <p class="lead">Dessins schématiques des principaux signaux. ${signQuiz ? 'Touche un panneau pour révéler sa signification.' : ''}</p>
      <div class="seg"><button data-mode="0" class="${signQuiz ? '' : 'on'}">Galerie</button><button data-mode="1" class="${signQuiz ? 'on' : ''}">Devine</button></div>
      <div class="sign-grid">${cards}</div>
      <p class="ref">Liste complète et officielle des signaux : articles 65 à 71 de l’AR du 1<sup>er</sup> décembre 1975.</p>`;
    $app.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { signQuiz = b.dataset.mode === '1'; viewSigns(); }));
    if (signQuiz) $app.querySelectorAll('.sign-card').forEach((el) => {
      const flip = () => el.classList.toggle('hidden-label');
      el.addEventListener('click', flip);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
    });
  }

  function viewMemo() {
    const sections = MEMO.map((m) => `<section class="card"><h3>${esc(m.title)}</h3><ul>${m.items.map((i) => `<li>${i}</li>`).join('')}</ul>
      ${m.ref ? refHTML(m.ref, issueURL(`Erreur possible dans le mémo : ${m.title}`, [`**Mémo** : ${m.title}`])) : ''}</section>`).join('');
    $app.innerHTML = `<div class="memo"><h1>Mémo</h1><p class="lead">Les règles et chiffres les plus demandés.</p>${sections}</div>`;
  }

  function viewBadges() {
    const got = G.state.badges;
    const items = G.BADGES.map((b) => `<div class="card badge ${got[b.id] ? 'got' : ''}">
      <span class="bi">${b.icon}</span><b>${esc(b.name)}</b><small>${esc(b.desc)}</small>
      ${got[b.id] ? `<em>${new Date(got[b.id]).toLocaleDateString('fr-BE')}</em>` : ''}</div>`).join('');
    $app.innerHTML = `<h1>Badges</h1><p class="lead">${Object.keys(got).length} sur ${G.BADGES.length} débloqués.</p><div class="badges">${items}</div>`;
  }

  function viewStats() {
    const g = G.state;
    const lv = G.levelInfo();
    const exams = store.data.exams;
    const passRate = exams.length ? pct(exams.filter((e) => e.pass).length, exams.length) : 0;
    // Activité des 28 derniers jours
    const today = G.dayKey();
    let cal = '';
    for (let i = 27; i >= 0; i--) {
      const k = G.addDays(today, -i), v = g.days[k] || 0;
      const lvl = v === 0 ? 0 : v < g.goal / 2 ? 1 : v < g.goal ? 2 : 3;
      cal += `<i class="c${lvl}" title="${k} : ${v} XP"></i>`;
    }
    const rows = THEMES.map((t) => {
      const st = themeStats(t.key);
      return `<div class="srow"><span>${esc(t.label)}</span><div class="bar"><i style="width:${pct(st.mastered, st.total)}%"></i></div><b>${st.mastered}/${st.total}</b></div>`;
    }).join('');
    $app.innerHTML = `<h1>Statistiques</h1>
      <div class="stats">
        <div class="stat"><b>${g.xp}</b><small>XP au total · niv. ${lv.level}</small></div>
        <div class="stat"><b>${g.best}</b><small>meilleure série (jours)</small></div>
        <div class="stat"><b>${g.bestCombo}</b><small>meilleur combo</small></div>
        <div class="stat"><b>${exams.length}</b><small>examens blancs</small></div>
        <div class="stat"><b>${passRate} %</b><small>examens réussis</small></div>
        <div class="stat"><b>${g.chronoBest}</b><small>record chrono</small></div>
      </div>
      <h2>Activité (4 semaines)</h2><div class="card"><div class="cal">${cal}</div></div>
      <h2>Maîtrise par thème</h2><div class="card">${rows}</div>
      ${exams.length ? `<h2>Derniers examens</h2><div class="card exams">${exams.slice(0, 10).map((e) => `<div class="srow"><span>${new Date(e.d).toLocaleDateString('fr-BE')}</span><b class="${e.pass ? 'okc' : 'badc'}">${e.score}/50 ${e.pass ? '✓' : '✗'}</b></div>`).join('')}</div>` : ''}`;
  }

  function viewSettings() {
    const g = G.state;
    $app.innerHTML = `<h1>Réglages</h1>
      <div class="card">
        <h3 style="margin-top:0">Objectif quotidien</h3>
        <div class="goals">${GOALS.map(([n, l]) => `<button class="goal-opt ${g.goal === n ? 'on' : ''}" data-goal="${n}"><b>${l}</b><small>${n} XP / jour</small></button>`).join('')}</div>
        <p class="ref">Une bonne réponse rapporte 10 XP (15 si c’est une faute grave), 5 XP en Vrai ou Faux et 3 XP au défi chrono. Les combos et les sans-faute donnent des bonus.</p>
      </div>
      <div class="card" style="margin-top:12px">
        <label class="switch"><input type="checkbox" id="snd" ${g.sound ? 'checked' : ''}> Sons</label>
        <div class="seg" style="margin:12px 0 0"><button data-th="">Auto</button><button data-th="light">Clair</button><button data-th="dark">Sombre</button></div>
      </div>
      <div class="card" style="margin-top:12px">
        <p style="margin-top:0">Ta progression est enregistrée uniquement dans ce navigateur.</p>
        <button class="btn" id="reset">Tout effacer</button>
      </div>`;
    $app.querySelectorAll('[data-goal]').forEach((b) => b.addEventListener('click', () => { G.setGoal(+b.dataset.goal); updateHeader(); viewSettings(); }));
    document.getElementById('snd').onchange = (e) => G.setSound(e.target.checked);
    const cur = store.get('permi.theme') || '';
    $app.querySelectorAll('[data-th]').forEach((b) => {
      if (b.dataset.th === cur) b.classList.add('on');
      b.addEventListener('click', () => { applyTheme(b.dataset.th); store.set('permi.theme', b.dataset.th); viewSettings(); });
    });
    document.getElementById('reset').onclick = () => {
      if (confirm('Effacer toute ta progression, ton XP, ta série et tes badges ?')) { store.reset(); G.reset(); updateHeader(); go('#/'); }
    };
  }

  function viewAbout() {
    $app.innerHTML = `<h1>À propos & sources</h1>
      <div class="card">
        <p><b>Sources.</b> Toutes les questions ont été rédigées pour cette application à partir du texte officiel de
        l’<a href="https://www.codedelaroute.be/fr/reglementation/1975120109~hra8v386pu" target="_blank" rel="noopener">arrêté royal du 1<sup>er</sup> décembre 1975</a>
        (règlement général sur la police de la circulation routière), publié sur codedelaroute.be, et, pour l’alcool et le permis, de la loi du 16 mars 1968, de l’AR du 23 mars 1998 et de l’AR du 10 juillet 2006 (permis B).
        Chaque question renvoie à l’article concerné. Aucune question n’est copiée d’une banque de questions commerciale.</p>
        <p><b>Photos.</b> Les photos de situation proviennent de <a href="https://panoramax.fr" target="_blank" rel="noopener">Panoramax</a>,
        une base libre d’images prises au niveau de la rue, sous licence <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr" target="_blank" rel="noopener">CC BY-SA 4.0</a>.
        L’auteur est cité sous chaque photo ; les vues à 360° ont été recadrées en vue « conducteur ». Les plaques et visages sont floutés par Panoramax.</p>
        <p><b>Format de l’examen.</b> 50 questions à choix multiple ; une erreur coûte 1 point, une faute grave 5 points ; il faut au moins 41/50.
        Les modalités exactes (durée, centre, prix) dépendent de ta région : renseigne-toi auprès de ton centre d’examen.</p>
        <p><b>Fiabilité.</b> Chaque question a été rédigée à partir du texte de loi, relue par un second relecteur, puis soumise à un
        <b>audit à l’aveugle</b> : des relecteurs ont répondu à toutes les questions sans connaître la réponse attendue, uniquement avec le texte officiel ;
        chaque désaccord a été réexaminé. Sous chaque explication, « 📜 Lire l’article officiel » ouvre l’article cité sur codedelaroute.be,
        et « 🚩 Signaler une erreur » permet de signaler un problème (compte GitHub requis).</p>
        <p><b>Limites.</b> Outil d’entraînement non officiel : les panneaux sont des dessins simplifiés et une erreur reste possible.
        En cas de doute, le texte officiel fait foi. Un nouveau Code de la voie publique entre en vigueur le 1<sup>er</sup> juin 2027.</p>
      </div>`;
  }

  // ---------- Routeur ----------
  function render() {
    const h = location.hash.replace(/^#\/?/, '');
    const [page, arg] = h.split('/');
    if (page !== 'quiz' && page !== 'swipe' && session) { stopChrono(); session = null; }
    updateHeader();
    switch (page) {
      case 'quiz': return viewQuiz();
      case 'swipe': return viewSwipe();
      case 'themes': return viewThemes();
      case 'cours': return arg ? viewLesson(arg) : viewLessons();
      case 'theme': return THEME_LABEL[arg] ? startTheme(arg) : go('#/themes');
      case 'signs': return viewSigns();
      case 'memo': return viewMemo();
      case 'badges': return viewBadges();
      case 'stats': return viewStats();
      case 'settings': return viewSettings();
      case 'about': return viewAbout();
      default: return viewHome();
    }
  }

  document.addEventListener('click', (e) => {
    const z = e.target.closest('[data-zoom]');
    if (z && !e.target.closest('.swipe-card')) {
      const o = document.createElement('div');
      o.className = 'lightbox'; o.innerHTML = `<img src="${z.getAttribute('src')}" alt="Photo agrandie">`;
      o.onclick = () => o.remove(); document.body.appendChild(o); return;
    }
    const t = e.target.closest('[data-go]');
    if (t) { e.preventDefault(); go('#/' + (t.dataset.go === 'home' ? '' : t.dataset.go)); }
  });
  document.addEventListener('keydown', (e) => {
    if (!session || e.target.closest('input,textarea')) return;
    if (session.mode === 'swipe' || session.mode === 'chrono') {
      if (session.feedback) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nextSwipe(); } return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); decide(true); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); decide(false); }
      return;
    }
    const q = session.questions[session.i];
    const k = { 1: 0, 2: 1, 3: 2, a: 0, b: 1, c: 2 }[e.key.toLowerCase()];
    if (k != null && k < q.choices.length) choose(k);
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (session.mode !== 'exam' && !session.validated) validate(); else next();
    }
  });
  window.addEventListener('hashchange', () => { render(); $app.focus({ preventScroll: true }); });

  // Thème clair / sombre
  function applyTheme(t) { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }
  applyTheme(store.get('permi.theme'));

  render();
})();
