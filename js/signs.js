/*
 * Rendu SVG simplifié des panneaux belges (AR 1er décembre 1975).
 * Dessins schématiques faits main : formes et couleurs officielles,
 * pictogrammes simplifiés. viewBox 0 0 100 100.
 */
(function () {
  const RED = '#c8102e', BLUE = '#1f5fbf', YEL = '#f5c400', BLK = '#111', WHT = '#fff';

  const svg = (inner, label) =>
    `<svg viewBox="0 0 100 100" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

  // --- Formes de base -------------------------------------------------------
  const triUp = (g) =>
    `<polygon points="50,6 96,88 4,88" fill="${RED}" stroke="${RED}" stroke-width="6" stroke-linejoin="round"/>
     <polygon points="50,24 81,79 19,79" fill="${WHT}"/>${g}`;
  const triDown =
    `<polygon points="4,10 96,10 50,92" fill="${RED}" stroke="${RED}" stroke-width="6" stroke-linejoin="round"/>
     <polygon points="21,19 79,19 50,72" fill="${WHT}"/>`;
  const ringRed = (g) =>
    `<circle cx="50" cy="50" r="46" fill="${RED}"/><circle cx="50" cy="50" r="35" fill="${WHT}"/>${g}`;
  const discBlue = (g) =>
    `<circle cx="50" cy="50" r="46" fill="${BLUE}" stroke="${WHT}" stroke-width="2"/>${g}`;
  const sqBlue = (g) =>
    `<rect x="6" y="6" width="88" height="88" rx="8" fill="${BLUE}" stroke="${WHT}" stroke-width="3"/>${g}`;
  const banRed = `<line x1="25" y1="25" x2="75" y2="75" stroke="${RED}" stroke-width="8"/>`;

  // Flèche droite pointant vers le haut, centrée en (cx, cy), tournée de rot degrés.
  const arrow = (color, rot = 0, cx = 50, cy = 50, s = 1) =>
    `<g transform="translate(${cx} ${cy}) rotate(${rot}) scale(${s})">
       <rect x="-5" y="-8" width="10" height="34" fill="${color}"/>
       <polygon points="0,-28 -15,-6 15,-6" fill="${color}"/>
     </g>`;

  const car = (x, color) =>
    `<g fill="${color}">
       <rect x="${x}" y="48" width="22" height="13" rx="3"/>
       <path d="M${x + 4} 48 L${x + 7} 39 H${x + 15} L${x + 18} 48 Z"/>
       <rect x="${x + 1}" y="60" width="5" height="5"/><rect x="${x + 16}" y="60" width="5" height="5"/>
     </g>`;

  const speed = (n) =>
    ringRed(`<text x="50" y="${n >= 100 ? 61 : 63}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif"
       font-weight="700" font-size="${n >= 100 ? 30 : 38}" fill="${BLK}">${n}</text>`);

  const endSpeed = (n) =>
    `<circle cx="50" cy="50" r="46" fill="${WHT}" stroke="#555" stroke-width="2"/>
     <text x="50" y="63" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700"
       font-size="38" fill="#888">${n}</text>
     <g stroke="${BLK}" stroke-width="3">
       <line x1="70" y1="16" x2="16" y2="70"/><line x1="76" y1="22" x2="22" y2="76"/>
       <line x1="82" y1="28" x2="28" y2="82"/></g>`;

  const light = (on, blink) => {
    const c = { rouge: RED, orange: '#f39200', vert: '#14a44d' };
    const dim = { rouge: '#4a1c1c', orange: '#4a3a1c', vert: '#1c4a2c' };
    const lamp = (k, y) => `<circle cx="50" cy="${y}" r="11" fill="${on === k ? c[k] : dim[k]}"/>`;
    const rays = blink
      ? `<g stroke="#f39200" stroke-width="3" stroke-linecap="round">
           <line x1="22" y1="50" x2="30" y2="50"/><line x1="70" y1="50" x2="78" y2="50"/>
           <line x1="25" y1="38" x2="31" y2="42"/><line x1="75" y1="38" x2="69" y2="42"/>
           <line x1="25" y1="62" x2="31" y2="58"/><line x1="75" y1="62" x2="69" y2="58"/></g>`
      : '';
    return `<rect x="33" y="10" width="34" height="80" rx="6" fill="#222"/>
            ${lamp('rouge', 26)}${lamp('orange', 50)}${lamp('vert', 74)}${rays}`;
  };

  const placeName = (bar) =>
    `<rect x="4" y="26" width="92" height="48" rx="4" fill="${WHT}" stroke="${BLK}" stroke-width="3"/>
     <text x="50" y="58" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700"
       font-size="20" fill="${BLK}">NAMUR</text>
     ${bar ? `<line x1="12" y1="70" x2="88" y2="30" stroke="${RED}" stroke-width="6"/>` : ''}`;

  const zone30 = (end) =>
    `<rect x="12" y="4" width="76" height="92" rx="4" fill="${WHT}" stroke="${BLK}" stroke-width="2"/>
     <g opacity="${end ? 0.45 : 1}">
       <circle cx="50" cy="38" r="24" fill="${RED}"/><circle cx="50" cy="38" r="18" fill="${WHT}"/>
       <text x="50" y="47" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700"
         font-size="24" fill="${BLK}">30</text>
       <text x="50" y="84" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700"
         font-size="18" fill="${BLK}">ZONE</text></g>
     ${end ? `<line x1="20" y1="88" x2="80" y2="12" stroke="${BLK}" stroke-width="5"/>` : ''}`;

  const motorway = (end) =>
    sqBlue(`<path d="M22 86 L44 34 H48 L40 86 Z M78 86 L56 34 H52 L60 86 Z" fill="${WHT}"/>
            <rect x="16" y="26" width="68" height="9" fill="${WHT}"/>
            ${end ? `<line x1="14" y1="86" x2="86" y2="14" stroke="${RED}" stroke-width="7"/>` : ''}`);

  // --- Catalogue ------------------------------------------------------------
  const S = {
    A1a: ['Virage à gauche', triUp(`<path d="M56 74 V58 Q56 46 42 42" fill="none" stroke="${BLK}" stroke-width="7"/>
           <polygon points="34,39 46,33 46,50" fill="${BLK}"/>`)],
    A1b: ['Virage à droite', triUp(`<path d="M44 74 V58 Q44 46 58 42" fill="none" stroke="${BLK}" stroke-width="7"/>
           <polygon points="66,39 54,33 54,50" fill="${BLK}"/>`)],
    A7a: ['Chaussée rétrécie', triUp(`<path d="M38 76 V62 L44 52 V40 M62 76 V62 L56 52 V40" fill="none"
           stroke="${BLK}" stroke-width="5"/>`)],
    A33: ['Signaux lumineux de circulation', triUp(`<rect x="42" y="38" width="16" height="38" rx="3" fill="${BLK}"/>
           <circle cx="50" cy="45" r="4.5" fill="${RED}"/><circle cx="50" cy="57" r="4.5" fill="#f39200"/>
           <circle cx="50" cy="69" r="4.5" fill="#14a44d"/>`)],
    A51: ['Danger autre', triUp(`<rect x="45" y="38" width="10" height="26" rx="2" fill="${BLK}"/>
           <circle cx="50" cy="72" r="5" fill="${BLK}"/>`)],

    B1: ['Cédez le passage', triDown],
    B5: ['Stop', `<polygon points="30,4 70,4 96,30 96,70 70,96 30,96 4,70 4,30" fill="${RED}" stroke="${WHT}" stroke-width="3"/>
          <text x="50" y="61" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700"
          font-size="28" fill="${WHT}">STOP</text>`],
    B9: ['Route prioritaire', `<polygon points="50,4 96,50 50,96 4,50" fill="${WHT}" stroke="#999" stroke-width="1"/>
          <polygon points="50,18 82,50 50,82 18,50" fill="${YEL}"/>`],
    B11: ['Fin de route prioritaire', `<polygon points="50,4 96,50 50,96 4,50" fill="${WHT}" stroke="#999" stroke-width="1"/>
          <polygon points="50,18 82,50 50,82 18,50" fill="${YEL}"/>
          <line x1="26" y1="74" x2="74" y2="26" stroke="${BLK}" stroke-width="7"/>`],
    B15: ['Priorité au prochain carrefour', triUp(`<rect x="45" y="36" width="10" height="40" fill="${BLK}"/>
          <rect x="34" y="51" width="32" height="6" fill="${BLK}"/>`)],
    B17: ['Carrefour : priorité de droite', triUp(`<g stroke="${BLK}" stroke-width="7">
          <line x1="38" y1="44" x2="62" y2="72"/><line x1="62" y1="44" x2="38" y2="72"/></g>`)],
    B19: ['Priorité aux conducteurs venant en sens inverse', ringRed(
          arrow(BLK, 180, 40, 50, 0.95) + arrow(RED, 0, 61, 52, 0.7))],
    B21: ['Priorité par rapport aux conducteurs venant en sens inverse', sqBlue(
          arrow(WHT, 0, 61, 50, 1.05) + arrow(RED, 180, 38, 52, 0.7))],

    C1: ['Sens interdit', `<circle cx="50" cy="50" r="46" fill="${RED}"/><rect x="18" y="42" width="64" height="16" fill="${WHT}"/>`],
    C3: ['Accès interdit dans les deux sens', ringRed('')],
    C31a: ['Interdiction de tourner à gauche', ringRed(`<path d="M58 78 V50 H38" fill="none" stroke="${BLK}" stroke-width="8"/>
          <polygon points="26,50 40,38 40,62" fill="${BLK}"/>${banRed}`)],
    C31b: ['Interdiction de tourner à droite', ringRed(`<path d="M42 78 V50 H62" fill="none" stroke="${BLK}" stroke-width="8"/>
          <polygon points="74,50 60,38 60,62" fill="${BLK}"/>${banRed}`)],
    C33: ['Demi-tour interdit', ringRed(`<path d="M60 78 V44 A10 10 0 0 0 40 44 V62" fill="none" stroke="${BLK}" stroke-width="7"/>
          <polygon points="40,74 30,58 50,58" fill="${BLK}"/>${banRed}`)],
    C35: ['Interdiction de dépasser', ringRed(car(25, RED) + car(53, BLK))],
    C46: ['Fin de toutes les interdictions locales', `<circle cx="50" cy="50" r="46" fill="${WHT}" stroke="#555" stroke-width="2"/>
          <g stroke="${BLK}" stroke-width="3"><line x1="70" y1="16" x2="16" y2="70"/><line x1="76" y1="22" x2="22" y2="76"/>
          <line x1="82" y1="28" x2="28" y2="82"/><line x1="64" y1="12" x2="12" y2="64"/><line x1="88" y1="36" x2="36" y2="88"/></g>`],

    'D1-up': ['Obligation de suivre la direction (tout droit)', discBlue(arrow(WHT, 0))],
    'D1-left': ['Obligation de tourner à gauche', discBlue(arrow(WHT, -90))],
    'D1-right': ['Obligation de tourner à droite', discBlue(arrow(WHT, 90))],
    'D1-downright': ['Contournement obligatoire par la droite', discBlue(arrow(WHT, 135))],
    'D1-downleft': ['Contournement obligatoire par la gauche', discBlue(arrow(WHT, -135))],
    D5: ['Sens giratoire obligatoire', discBlue(`<g fill="none" stroke="${WHT}" stroke-width="7">
          <path d="M30 40 A22 22 0 0 1 60 28"/><path d="M72 46 A22 22 0 0 1 58 72"/><path d="M42 74 A22 22 0 0 1 28 52"/></g>
          <g fill="${WHT}"><polygon points="20,40 34,30 36,46"/><polygon points="68,34 76,48 64,48" transform="rotate(120 50 50)"/>
          <polygon points="68,34 76,48 64,48" transform="rotate(240 50 50)"/></g>`)],

    E1: ['Stationnement interdit', `<circle cx="50" cy="50" r="46" fill="${RED}"/><circle cx="50" cy="50" r="36" fill="${BLUE}"/>
          <line x1="25" y1="25" x2="75" y2="75" stroke="${RED}" stroke-width="9"/>`],
    E3: ['Arrêt et stationnement interdits', `<circle cx="50" cy="50" r="46" fill="${RED}"/><circle cx="50" cy="50" r="36" fill="${BLUE}"/>
          <g stroke="${RED}" stroke-width="9"><line x1="25" y1="25" x2="75" y2="75"/><line x1="75" y1="25" x2="25" y2="75"/></g>`],
    E9a: ['Stationnement autorisé', sqBlue(`<text x="50" y="72" text-anchor="middle" font-family="Arial,Helvetica,sans-serif"
          font-weight="700" font-size="62" fill="${WHT}">P</text>`)],

    F1a: ["Début d'agglomération", placeName(false)],
    F3a: ["Fin d'agglomération", placeName(true)],
    F4a: ['Début de zone 30', zone30(false)],
    F4b: ['Fin de zone 30', zone30(true)],
    F5: ['Autoroute', motorway(false)],
    F7: ["Fin d'autoroute", motorway(true)],
    F9: ['Route pour automobiles', sqBlue(`<g fill="${WHT}"><path d="M16 58 Q18 48 30 46 L38 36 H62 L72 46 Q84 48 84 58 V64 H16 Z"/>
          <circle cx="30" cy="66" r="8" stroke="${BLUE}" stroke-width="3"/><circle cx="70" cy="66" r="8" stroke="${BLUE}" stroke-width="3"/></g>`)],
    F19: ['Sens unique', sqBlue(arrow(WHT, 0, 50, 50, 1.2))],
    F45: ['Impasse', sqBlue(`<rect x="43" y="34" width="14" height="52" fill="${WHT}"/><rect x="26" y="18" width="48" height="14" fill="${RED}"/>`)],

    'FEU-vert': ['Feu vert', light('vert')],
    'FEU-orange': ['Feu orange fixe', light('orange')],
    'FEU-rouge': ['Feu rouge', light('rouge')],
    'FEU-orange-cligno': ['Feu orange clignotant', light('orange', true)],
  };
  for (const n of [30, 50, 70, 90, 120]) S['C43-' + n] = [`Vitesse maximale ${n} km/h`, speed(n)];
  for (const n of [50, 70]) S['C45-' + n] = [`Fin de la limitation à ${n} km/h`, endSpeed(n)];

  window.Signs = {
    has: (code) => code in S,
    label: (code) => (S[code] ? S[code][0] : code),
    render: (code) => (S[code] ? svg(S[code][1], S[code][0]) : ''),
    codes: () => Object.keys(S),
  };
})();
