# Permis B Belgique – entraînement à l'examen théorique

Petite web app gratuite et hors ligne pour réviser le **code de la route belge** :

- **Examen blanc** : 50 questions avec le barème de l'examen (une erreur = −1, une faute grave = −5, réussite à 41/50).
- **Vrai ou Faux** : une question et une réponse proposée ; swipe à droite si c'est vrai, à gauche si c'est faux.
- **Défi chrono** : un maximum de Vrai/Faux en 60 secondes, pour battre ton record.
- **Entraînement par thème** : correction immédiate, explication et article de loi (🥉 🥈 👑 selon ta maîtrise).
- **Mes erreurs** : les questions ratées reviennent jusqu'à ce que tu les réussisses.
- **Situations** : questions sur des photos de vraies rues belges, comme à l'examen (environ 12 photos par examen blanc).
- **Panneaux** (galerie + devinettes) et **mémo** des chiffres clés.

Gamification façon Duolingo : XP, objectif quotidien réglable, série de jours 🔥 avec gels de série 🧊, niveaux, combos, 19 badges, confettis, sons et statistiques.

La progression est enregistrée dans le navigateur (`localStorage`). L'app n'a pas de compte ni de serveur.

## Lancer l'app

Ouvre `index.html` dans un navigateur. Rien à installer.

Pour l'avoir sur ton téléphone, publie le dépôt avec **GitHub Pages** (Settings → Pages → branche `main`, dossier `/`). Ouvre ensuite l'URL et choisis « Ajouter à l'écran d'accueil ».

## Sources

Les questions ont été **rédigées pour ce projet**. Aucune n'est copiée d'une banque de questions commerciale. Chaque réponse a été vérifiée dans les textes officiels :

- [AR du 1er décembre 1975](https://www.codedelaroute.be/fr/reglementation/1975120109~hra8v386pu) : règlement général sur la police de la circulation routière, appelé « code de la route ».
- [Loi du 16 mars 1968](https://www.codedelaroute.be/fr/reglementation/1968031601~invynqx4tj) relative à la police de la circulation routière (alcool, drogues).
- AR du 23 mars 1998 et AR du 10 juillet 2006 sur le permis de conduire.
- Photos de situation : [Panoramax](https://panoramax.fr), licence [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.fr). Auteurs dans `data/photo_credits.json` et sous chaque photo ; les vues à 360° sont recadrées en vue conducteur, ces images restent donc sous CC BY-SA 4.0.

⚠️ Le **1er juin 2027**, un nouveau *Code de la voie publique* (fédéral, bruxellois, flamand, wallon) remplacera l'AR de 1975. L'app couvre les règles en vigueur aujourd'hui.

Les panneaux sont des dessins SVG simplifiés (`js/signs.js`). Il s'agit d'un outil d'entraînement **non officiel** : en cas de doute, le texte légal fait foi.

## Ajouter ou corriger des questions

Les questions sont dans `data/raw/<thème>.json` :

```json
{
  "id": "VIT-001",
  "theme": "vitesse",
  "q": "Texte de la question",
  "choices": ["Réponse A", "Réponse B", "Réponse C"],
  "answer": 0,
  "grave": false,
  "sign": "C43-50",
  "explain": "Explication",
  "ref": "Art. 11.1 AR 01/12/1975"
}
```

Après une modification, régénère `data/questions.js` (le script valide aussi les données) :

```sh
python3 tools/build.py
```
