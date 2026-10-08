# Permis B Belgique – entraînement à l'examen théorique

Petite web app gratuite et hors ligne pour réviser le **code de la route belge** :

- **Examen blanc** : 50 questions tirées dans tous les thèmes, avec le barème de l'examen (une erreur = −1, une faute grave = −5, réussite à 41/50), puis la correction détaillée.
- **Entraînement par thème** : séries de 20 questions corrigées tout de suite, avec une explication et l'article de loi.
- **Mes erreurs** : les questions ratées reviennent jusqu'à ce que tu les réussisses.
- **Panneaux** : une galerie et un mode « devine ».
- **Mémo** : les chiffres clés à connaître (vitesses, distances, alcool…).

La progression est enregistrée dans le navigateur (`localStorage`). L'app n'a pas de compte ni de serveur.

## Lancer l'app

Ouvre `index.html` dans un navigateur. Rien à installer.

Pour l'avoir sur ton téléphone, publie le dépôt avec **GitHub Pages** (Settings → Pages → branche `main`, dossier `/`). Ouvre ensuite l'URL et choisis « Ajouter à l'écran d'accueil ».

## Sources

Les questions ont été **rédigées pour ce projet**. Aucune n'est copiée d'une banque de questions commerciale. Chaque réponse a été vérifiée dans les textes officiels :

- [AR du 1er décembre 1975](https://www.codedelaroute.be/fr/reglementation/1975120109~hra8v386pu) : règlement général sur la police de la circulation routière, appelé « code de la route ».
- [Loi du 16 mars 1968](https://www.codedelaroute.be/fr/reglementation/1968031601~invynqx4tj) relative à la police de la circulation routière (alcool, drogues).
- AR du 23 mars 1998 et AR du 10 juillet 2006 sur le permis de conduire.

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
