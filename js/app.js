/* Permis B Belgique — application d'entraînement (vanilla JS, sans dépendances). */
(function () {
  'use strict';

  const QUESTIONS = window.QUESTIONS || [];
  const THEMES = window.THEMES || [];
  const MEMO = window.MEMO || [];
  const BY_ID = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
  const THEME_LABEL = Object.fromEntries(THEMES.map((t) => [t.key, t.label]));

  const EXAM_SIZE = 50;
  const PASS_MARK = 41;
  const TRAIN_SIZE = 20;
  const LETTERS = ['A', 'B', 'C', 'D'];

  // ---------- Stockage (navigateur uniquement) ----------
  const STORE_KEY = 'permi.v1';
  const store = (() => {
    let data = { q: {}, exams: [] };
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) data = Object.assign(data, JSON.parse(raw));
    } catch (e) { /* stockage indisponible : on continue en mémoire */ }
    const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ } };
    return {
      data,
      record(id, ok) {
        const r = data.q[id] || { s: 0, c: 0, last: null };
        r.s += 1; if (ok) r.c += 1; r.last = ok ? 1 : 0; r.t = Date.now();
        data.q[id] = r; save();
      },
      addExam(e) { data.exams.unshift(e); data.exams = data.exams.slice(0, 30); save(); },
      reset() { data.q = {}; data.exams = []; save(); },
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

  // Priorise : jamais vues > ratées > les autres, avec un peu de hasard.
  function pickForTraining(pool, n) {
    const w = (q) => { const r = store.data.q[q.id]; if (!r) return 0; if (r.last === 0) return 1; return 2; };
    return shuffle(pool).sort((a, b) => w(a) - w(b)).slice(0, n);
  }

  // Examen : tirage proportionnel à la taille de chaque thème.
  function pickExam() {
    const total = QUESTIONS.length;
    if (total <= EXAM_SIZE) return shuffle(QUESTIONS);
    const picked = [];
    const quotas = THEMES.map((t) => {
      const pool = QUESTIONS.filter((q) => q.theme === t.key);
      const exact = (pool.length / total) * EXAM_SIZE;
      return { pool: shuffle(pool), n: Math.floor(exact), frac: exact - Math.floor(exact) };
    });
    let rest = EXAM_SIZE - quotas.reduce((s, x) => s + x.n, 0);
    quotas.slice().sort((a, b) => b.frac - a.frac).forEach((x) => { if (rest > 0) { x.n++; rest--; } });
    quotas.forEach((x) => picked.push(...x.pool.slice(0, x.n)));
    return shuffle(picked);
  }

  // ---------- Session de questions ----------
  let session = null;

  function startSession(mode, questions, title, back) {
    session = { mode, title, back, questions, i: 0, answers: [], selected: null, validated: false, start: Date.now() };
    go('#/quiz');
  }

  function viewQuiz() {
    if (!session) return go('#/');
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
        <b>${ok ? 'Bonne réponse' : 'Mauvaise réponse'}</b>${!ok ? ` — la bonne réponse était <b>${LETTERS[q.answer]}</b>.` : ''}
        <p>${esc(q.explain)}</p><div class="ref">${esc(q.ref || '')}</div></div>`;
    }

    const action = isExam
      ? `<button class="btn primary" id="next" ${s.selected == null ? 'disabled' : ''}>${s.i + 1 < n ? 'Valider et continuer' : "Valider et terminer"}</button>`
      : answered
        ? `<button class="btn primary" id="next">${s.i + 1 < n ? 'Question suivante' : 'Voir le bilan'}</button>`
        : `<button class="btn primary" id="validate" ${s.selected == null ? 'disabled' : ''}>Valider</button>`;

    $app.innerHTML = `
      <div class="quiz-head">
        <span>${esc(s.title)}</span>
        <span class="tag">${s.i + 1} / ${n}</span>
      </div>
      <div class="progress"><i style="width:${pct(s.i, n)}%"></i></div>
      <article class="card">
        ${q.grave && !isExam ? '<span class="grave-flag">Faute grave possible (−5 à l’examen)</span>' : ''}
        ${q.sign ? `<div class="q-sign">${signHTML(q.sign)}</div>` : ''}
        <p class="q-text">${esc(q.q)}</p>
        <div class="choices">${choices}</div>
        ${feedback}
        <div class="btn-row">
          <button class="btn" id="quit">Quitter</button>
          ${action}
        </div>
      </article>
      <p class="lead" style="margin-top:12px;font-size:13px">Astuce : touches 1, 2, 3 pour répondre, Entrée pour valider.</p>`;

    $app.querySelectorAll('[data-choice]').forEach((b) => b.addEventListener('click', () => choose(+b.dataset.choice)));
    const v = document.getElementById('validate'); if (v) v.addEventListener('click', validate);
    const nx = document.getElementById('next'); if (nx) nx.addEventListener('click', next);
    document.getElementById('quit').addEventListener('click', () => {
      if (s.answers.length === 0 || confirm('Quitter cette série ? Ta progression sur les questions déjà répondues est conservée.')) {
        const back = s.back; session = null; go(back || '#/');
      }
    });
  }

  function choose(k) {
    if (!session || session.validated) return;
    session.selected = k;
    viewQuiz();
  }
  function validate() {
    const s = session; if (!s || s.selected == null || s.validated) return;
    const q = s.questions[s.i];
    s.validated = true;
    s.answers.push(s.selected);
    store.record(q.id, s.selected === q.answer);
    viewQuiz();
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

  function finish() {
    const s = session;
    const res = s.questions.map((q, k) => ({ q, a: s.answers[k], ok: s.answers[k] === q.answer }));
    const wrong = res.filter((r) => !r.ok);
    const minutes = Math.max(1, Math.round((Date.now() - s.start) / 60000));
    let head;
    if (s.mode === 'exam') {
      const graves = wrong.filter((r) => r.q.grave).length;
      const score = Math.max(0, EXAM_SIZE - (wrong.length - graves) - 5 * graves);
      const pass = score >= PASS_MARK;
      store.addExam({ d: Date.now(), score, pass });
      head = `<div class="card score ${pass ? 'pass' : 'fail'}">
        <div class="big">${score}<small style="font-size:22px">/${EXAM_SIZE}</small></div>
        <div class="verdict">${pass ? 'Réussi' : 'Échoué'}</div>
        <p class="lead" style="margin:8px 0 0">${wrong.length} erreur(s), dont ${graves} faute(s) grave(s) (−5 chacune) · ${minutes} min<br>
        Seuil de réussite : ${PASS_MARK}/${EXAM_SIZE}</p></div>`;
    } else {
      const good = res.length - wrong.length;
      head = `<div class="card score ${pct(good, res.length) >= 82 ? 'pass' : 'fail'}">
        <div class="big">${good}<small style="font-size:22px">/${res.length}</small></div>
        <div class="verdict">${pct(good, res.length)} % de bonnes réponses</div>
        <p class="lead" style="margin:8px 0 0">${minutes} min</p></div>`;
    }
    const review = wrong.map((r) => `
      <div class="card review-item">
        ${r.q.sign ? `<div class="mini-sign">${signHTML(r.q.sign)}</div>` : ''}
        ${r.q.grave ? '<span class="grave-flag">Faute grave</span>' : ''}
        <b>${esc(r.q.q)}</b>
        <p class="ans bad">Ta réponse : ${esc(r.q.choices[r.a])}</p>
        <p class="ans ok">Bonne réponse : ${esc(r.q.choices[r.q.answer])}</p>
        <p style="margin:6px 0 0">${esc(r.q.explain)}</p>
        <div class="ref">${esc(r.q.ref || '')}</div>
      </div>`).join('');
    const mode = s.mode, back = s.back, title = s.title, qs = s.questions;
    session = null;
    $app.innerHTML = `
      <h1>Bilan — ${esc(title)}</h1>
      ${head}
      <div class="btn-row">
        <button class="btn" id="home">Accueil</button>
        ${wrong.length ? '<button class="btn" id="redo">Refaire mes erreurs</button>' : ''}
        <button class="btn primary" id="again">${mode === 'exam' ? 'Nouvel examen' : 'Nouvelle série'}</button>
      </div>
      ${wrong.length ? `<h2>Corrections (${wrong.length})</h2>${review}` : '<h2>Aucune erreur, bravo !</h2>'}`;
    document.getElementById('home').onclick = () => go('#/');
    document.getElementById('again').onclick = () => {
      if (mode === 'exam') startExam();
      else if (back && back.startsWith('#/theme/')) startTheme(back.slice(8));
      else go(back || '#/');
    };
    const redo = document.getElementById('redo');
    if (redo) redo.onclick = () => startSession('train', shuffle(wrong.map((r) => r.q)), 'Mes erreurs', '#/');
    window.scrollTo(0, 0);
  }

  const startExam = () => startSession('exam', pickExam(), 'Examen blanc', '#/');
  const startTheme = (key) => {
    const pool = QUESTIONS.filter((q) => q.theme === key);
    startSession('train', pickForTraining(pool, TRAIN_SIZE), THEME_LABEL[key] || key, '#/theme/' + key);
  };

  // ---------- Vues ----------
  function viewHome() {
    const st = themeStats();
    const errs = mistakes().length;
    const last = store.data.exams[0];
    const passed = store.data.exams.slice(0, 5).filter((e) => e.pass).length;
    $app.innerHTML = `
      <h1>Prépare ton examen théorique</h1>
      <p class="lead">${QUESTIONS.length} questions sur le code de la route belge, avec explications et références aux articles officiels.</p>
      <div class="stats">
        <div class="stat"><b>${pct(st.seen, st.total)} %</b><small>questions vues</small></div>
        <div class="stat"><b>${st.mastered}</b><small>réussies (dernier essai)</small></div>
        <div class="stat"><b>${last ? last.score + '/50' : '—'}</b><small>dernier examen${store.data.exams.length ? ` · ${passed}/${Math.min(5, store.data.exams.length)} réussis` : ''}</small></div>
      </div>
      <div class="grid">
        <button class="card tile primary" id="exam"><strong>Examen blanc</strong><span>50 questions, conditions d'examen : 41/50 pour réussir, faute grave = −5.</span></button>
        <button class="card tile" data-go="themes"><strong>Entraînement par thème</strong><span>Correction immédiate et explication après chaque question.</span></button>
        <button class="card tile" id="review" ${errs ? '' : 'disabled'}><strong>Mes erreurs (${errs})</strong><span>${errs ? 'Retravaille les questions ratées jusqu’à les réussir.' : 'Aucune erreur à revoir pour l’instant.'}</span></button>
        <button class="card tile" data-go="signs"><strong>Panneaux</strong><span>Galerie et mode « devine la signification ».</span></button>
        <button class="card tile" data-go="memo"><strong>Mémo</strong><span>Chiffres et règles clés à connaître par cœur.</span></button>
      </div>
      <div class="notice" style="margin-top:18px">Le 1<sup>er</sup> juin 2027, un nouveau <b>Code de la voie publique</b> remplacera le code de la route actuel.
      Les questions portent sur les règles <b>en vigueur aujourd’hui</b> (AR du 1<sup>er</sup> décembre 1975). Si ton examen a lieu après cette date, vérifie les nouveautés.</div>`;
    document.getElementById('exam').onclick = startExam;
    const rv = document.getElementById('review');
    rv.onclick = () => { const m = mistakes(); if (m.length) startSession('train', shuffle(m), 'Mes erreurs', '#/'); };
  }

  function viewThemes() {
    const rows = THEMES.map((t) => {
      const st = themeStats(t.key);
      return `<button class="card theme-row" data-theme="${t.key}">
        <span class="t"><b>${esc(t.label)}</b><small>${esc(t.desc || '')} · ${st.total} questions</small>
          <span class="bar"><i style="width:${pct(st.mastered, st.total)}%"></i></span></span>
        <span class="pct">${pct(st.mastered, st.total)}%</span></button>`;
    }).join('');
    $app.innerHTML = `<h1>Entraînement par thème</h1>
      <p class="lead">Séries de ${TRAIN_SIZE} questions. Les questions jamais vues et ratées passent en premier.</p>
      <div class="theme-list">${rows}</div>
      <div class="btn-row"><button class="btn" id="all">Série mélangée (tous thèmes)</button></div>`;
    $app.querySelectorAll('[data-theme]').forEach((b) => b.addEventListener('click', () => startTheme(b.dataset.theme)));
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
      ${m.ref ? `<div class="ref">${esc(m.ref)}</div>` : ''}</section>`).join('');
    $app.innerHTML = `<div class="memo"><h1>Mémo</h1><p class="lead">Les règles et chiffres les plus demandés.</p>${sections}</div>`;
  }

  function viewTheme(key) {
    if (!THEME_LABEL[key]) return go('#/themes');
    startTheme(key);
  }

  function viewAbout() {
    $app.innerHTML = `<h1>À propos & sources</h1>
      <div class="card">
        <p><b>Sources.</b> Toutes les questions ont été rédigées pour cette application à partir du texte officiel de
        l’<a href="https://www.codedelaroute.be/fr/reglementation/1975120109~hra8v386pu" target="_blank" rel="noopener">arrêté royal du 1<sup>er</sup> décembre 1975</a>
        (règlement général sur la police de la circulation routière), publié sur codedelaroute.be, et, pour l’alcool et le permis, de la loi du 16 mars 1968, de l’AR du 23 mars 1998 et de l’AR du 10 juillet 2006 (permis B).
        Chaque question renvoie à l’article concerné. Aucune question n’est copiée d’une banque de questions commerciale.</p>
        <p><b>Format de l’examen.</b> 50 questions à choix multiple ; une erreur coûte 1 point, une faute grave 5 points ; il faut au moins 41/50.
        Les modalités exactes (durée, centre, prix) dépendent de ta région : renseigne-toi auprès de ton centre d’examen.</p>
        <p><b>Limites.</b> Outil d’entraînement non officiel : les panneaux sont des dessins simplifiés et une erreur reste possible.
        En cas de doute, le texte officiel fait foi. Un nouveau Code de la voie publique entre en vigueur le 1<sup>er</sup> juin 2027.</p>
        <p><b>Données.</b> Ta progression est enregistrée uniquement dans ton navigateur.</p>
        <div class="btn-row"><button class="btn" id="reset">Effacer ma progression</button></div>
      </div>`;
    document.getElementById('reset').onclick = () => { if (confirm('Effacer toute ta progression ?')) { store.reset(); go('#/'); } };
  }

  // ---------- Routeur ----------
  function render() {
    const h = location.hash.replace(/^#\/?/, '');
    const [page, arg] = h.split('/');
    if (page !== 'quiz' && session) session = null;
    switch (page) {
      case 'quiz': return viewQuiz();
      case 'themes': return viewThemes();
      case 'theme': return viewTheme(arg);
      case 'signs': return viewSigns();
      case 'memo': return viewMemo();
      case 'about': return viewAbout();
      default: return viewHome();
    }
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-go]');
    if (t) { e.preventDefault(); go('#/' + (t.dataset.go === 'home' ? '' : t.dataset.go)); }
  });
  document.addEventListener('keydown', (e) => {
    if (!session || e.target.closest('input,textarea')) return;
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
  const applyTheme = (t) => { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; };
  applyTheme(store.get('permi.theme'));
  document.getElementById('themeToggle').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    const t = dark ? 'light' : 'dark';
    applyTheme(t); store.set('permi.theme', t);
  });

  render();
})();
