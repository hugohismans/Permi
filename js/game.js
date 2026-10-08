/* Gamification : XP, niveaux, objectif quotidien, série de jours, gels de série, badges. */
(function () {
  'use strict';

  const KEY = 'permi.game.v1';
  const FREEZE_EVERY = 7;   // un gel de série offert tous les 7 jours de série
  const FREEZE_MAX = 2;

  const dayKey = (d = new Date()) => {
    const z = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  };
  const addDays = (key, n) => { const [y, m, d] = key.split('-').map(Number); return dayKey(new Date(y, m - 1, d + n)); };

  let g = { xp: 0, goal: 50, days: {}, frozen: {}, freezes: 0, best: 0, badges: {}, combo: 0, bestCombo: 0,
    chronoBest: 0, examsPassed: 0, sound: true, lastFreezeAt: 0 };
  try { const raw = localStorage.getItem(KEY); if (raw) g = Object.assign(g, JSON.parse(raw)); } catch (e) { /* mémoire seule */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(g)); } catch (e) { /* ignore */ } };

  const listeners = [];
  const emit = (ev) => listeners.forEach((f) => f(ev));

  // --- Niveaux : il faut 100 XP pour le niveau 2, puis +50 XP de plus à chaque niveau.
  const xpForLevel = (lvl) => 25 * (lvl - 1) * (lvl + 2);
  function levelInfo(xp = g.xp) {
    let lvl = 1;
    while (xp >= xpForLevel(lvl + 1)) lvl++;
    const from = xpForLevel(lvl), to = xpForLevel(lvl + 1);
    return { level: lvl, into: xp - from, need: to - from };
  }

  // --- Série de jours
  const goalMet = (k) => (g.days[k] || 0) >= g.goal || !!g.frozen[k];
  function streak() {
    const today = dayKey();
    let k = goalMet(today) ? today : addDays(today, -1);
    let n = 0;
    while (goalMet(k)) { n++; k = addDays(k, -1); }
    return n;
  }
  // Au lancement : si des jours ont été manqués, on consomme des gels pour sauver la série.
  function applyFreezes() {
    const today = dayKey();
    const yesterday = addDays(today, -1);
    if (goalMet(yesterday) || g.freezes <= 0) return;
    // Cherche le dernier jour validé dans les FREEZE_MAX+1 derniers jours.
    const missed = [];
    let k = yesterday;
    for (let i = 0; i <= FREEZE_MAX; i++) {
      if (goalMet(k)) break;
      missed.push(k); k = addDays(k, -1);
    }
    if (!goalMet(k) || missed.length > g.freezes) return;
    missed.forEach((m) => { g.frozen[m] = true; });
    g.freezes -= missed.length;
    save();
    emit({ type: 'freeze', used: missed.length });
  }

  // --- Badges
  const BADGES = [
    { id: 'first', icon: '🚗', name: 'Premier tour de roue', desc: 'Répondre à ta première question' },
    { id: 'lesson1', icon: '📖', name: 'Bon élève', desc: 'Terminer ton premier cours' },
    { id: 'scholar', icon: '📚', name: 'Studieux', desc: 'Terminer tous les cours' },
    { id: 'goal', icon: '🎯', name: 'Objectif atteint', desc: 'Atteindre ton objectif quotidien' },
    { id: 'streak3', icon: '🔥', name: 'Ça chauffe', desc: 'Série de 3 jours' },
    { id: 'streak7', icon: '🔥', name: 'Une semaine', desc: 'Série de 7 jours' },
    { id: 'streak30', icon: '🌋', name: 'Inarrêtable', desc: 'Série de 30 jours' },
    { id: 'combo10', icon: '⚡', name: 'Combo ×10', desc: '10 bonnes réponses d’affilée' },
    { id: 'combo25', icon: '🌩️', name: 'Combo ×25', desc: '25 bonnes réponses d’affilée' },
    { id: 'exam1', icon: '🎓', name: 'Reçu !', desc: 'Réussir un examen blanc' },
    { id: 'exam5', icon: '🏆', name: 'Prêt pour le jour J', desc: 'Réussir 5 examens blancs' },
    { id: 'exam50', icon: '💎', name: 'Sans faute', desc: 'Obtenir 50/50 à un examen blanc' },
    { id: 'swipe20', icon: '👆', name: 'Swipe parfait', desc: '20/20 en Vrai ou Faux' },
    { id: 'chrono15', icon: '⏱️', name: 'Réflexes', desc: '15 bonnes réponses au défi chrono' },
    { id: 'chrono25', icon: '🚀', name: 'Pilote', desc: '25 bonnes réponses au défi chrono' },
    { id: 'xp1000', icon: '⭐', name: '1 000 XP', desc: 'Cumuler 1 000 XP' },
    { id: 'xp5000', icon: '🌟', name: '5 000 XP', desc: 'Cumuler 5 000 XP' },
    { id: 'level10', icon: '🏁', name: 'Niveau 10', desc: 'Atteindre le niveau 10' },
    { id: 'clean', icon: '🧹', name: 'Ardoise propre', desc: 'Vider la liste « Mes erreurs » après 10 erreurs ou plus' },
    { id: 'master', icon: '👑', name: 'Maître d’un thème', desc: 'Réussir 90 % des questions d’un thème' },
    { id: 'allthemes', icon: '🗺️', name: 'Tour de Belgique', desc: 'Faire au moins une série dans chaque thème' },
  ];
  function unlock(id) {
    if (g.badges[id]) return;
    g.badges[id] = Date.now(); save();
    const b = BADGES.find((x) => x.id === id);
    if (b) emit({ type: 'badge', badge: b });
  }

  // --- Gains d'XP
  function addXP(n, reason) {
    if (n <= 0) return;
    const before = levelInfo().level;
    const today = dayKey();
    const wasMet = goalMet(today);
    g.xp += n;
    g.days[today] = (g.days[today] || 0) + n;
    save();
    emit({ type: 'xp', amount: n, reason });
    const after = levelInfo().level;
    if (after > before) emit({ type: 'level', level: after });
    if (!wasMet && goalMet(today)) {
      const s = streak();
      if (s > g.best) g.best = s;
      if (s > 0 && s % FREEZE_EVERY === 0 && g.lastFreezeAt !== s && g.freezes < FREEZE_MAX) {
        g.freezes++; g.lastFreezeAt = s; emit({ type: 'freezeEarned' });
      }
      save();
      emit({ type: 'goal', streak: s });
      unlock('goal');
      if (s >= 3) unlock('streak3');
      if (s >= 7) unlock('streak7');
      if (s >= 30) unlock('streak30');
    }
    if (g.xp >= 1000) unlock('xp1000');
    if (g.xp >= 5000) unlock('xp5000');
    if (after >= 10) unlock('level10');
  }

  // Réponse à une question. Retourne l'XP gagnée.
  function answer(ok, opts = {}) {
    unlock('first');
    if (!ok) { g.combo = 0; save(); return 0; }
    g.combo++;
    if (g.combo > g.bestCombo) g.bestCombo = g.combo;
    if (g.combo >= 10) unlock('combo10');
    if (g.combo >= 25) unlock('combo25');
    let xp = opts.base != null ? opts.base : 10;
    if (opts.grave) xp += 5;
    if (g.combo % 5 === 0) xp += 5; // bonus de combo
    addXP(xp, 'answer');
    return xp;
  }

  const api = {
    BADGES,
    on: (f) => listeners.push(f),
    dayKey, addDays,
    get state() { return g; },
    levelInfo, streak, goalMet,
    todayXP: () => g.days[dayKey()] || 0,
    answer, addXP, unlock,
    resetCombo() { g.combo = 0; save(); },
    setGoal(n) { g.goal = n; save(); },
    setSound(v) { g.sound = !!v; save(); },
    examResult(score, pass) {
      addXP(20, 'exam');
      if (pass) { g.examsPassed++; addXP(30, 'pass'); unlock('exam1'); if (g.examsPassed >= 5) unlock('exam5'); }
      if (score === 50) unlock('exam50');
      save();
    },
    chronoResult(n) { const rec = n > g.chronoBest; if (rec) { g.chronoBest = n; save(); } if (n >= 15) unlock('chrono15'); if (n >= 25) unlock('chrono25'); return rec; },
    reset() {
      const keep = { goal: g.goal, sound: g.sound };
      g = Object.assign({ xp: 0, days: {}, frozen: {}, freezes: 0, best: 0, badges: {}, combo: 0, bestCombo: 0,
        chronoBest: 0, examsPassed: 0, lastFreezeAt: 0 }, keep);
      save();
    },
  };
  applyFreezes();
  window.Game = api;
})();
