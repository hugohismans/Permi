# Fiabilité du contenu : méthode et résultats

L'app a été entièrement rédigée et vérifiée par des agents d'IA (Claude). Aucun moniteur ni juriste ne l'a relue. Ce document explique ce qui a été fait pour limiter les erreurs et ce qui reste fragile.

## Source de vérité

- **Code de la route** : [AR du 1er décembre 1975](https://www.codedelaroute.be/fr/reglementation/1975120109~hra8v386pu), téléchargé en entier sur codedelaroute.be (version consolidée en vigueur en octobre 2026).
- **Alcool et drogues** : [loi du 16 mars 1968](https://www.codedelaroute.be/fr/reglementation/1968031601~invynqx4tj).
- **Permis provisoire et remorque** : AR du 10 juillet 2006 et AR du 23 mars 1998 (codedelaroute.be).

Chaque question et chaque section de cours cite son article. Dans l'app, le lien « 📜 Lire l'article officiel » ouvre directement l'article cité.

## Les 4 étapes de contrôle

1. **Rédaction à partir du texte.** Chaque réponse devait être retrouvée dans le texte officiel, sinon la question était écartée. Les rédacteurs en ont écarté beaucoup par prudence : panneaux illisibles, règles régionales incertaines, marquages non définis dans l'AR…
2. **Relecture par un second agent**, avec le texte officiel. Pour les questions sur photo, la photo était ouverte (et recadrée si besoin) pour vérifier que l'énoncé décrit bien ce qu'on voit.
   - Questions classiques : environ 30 doublons supprimés et quelques références corrigées.
   - Questions photo : environ 80 énoncés corrigés, surtout des détails affirmés mais pas assez visibles, reformulés en « Si… ». S'y ajoutent une vingtaine de questions supprimées et quelques erreurs de lecture corrigées (un B21 pris pour un F19, des triangles au sol qui visaient la rue d'en face, un E5 pris pour un E1).
3. **Audit à l'aveugle (octobre 2026).** Neuf agents ont répondu aux **557 questions sans voir la réponse attendue**, avec seulement le texte de loi, et la photo pour les questions photo. Leurs réponses ont ensuite été comparées à celles de l'app :

   | Résultat | Questions |
   |---|---|
   | Même réponse, confiance haute, aucune remarque | 533 |
   | Même réponse, avec une remarque | 24 |
   | Réponse différente | **0** |

   Les remarques ont été examinées une par une. Sept questions ont été reformulées pour lever une ambiguïté :
   - **DEP-018** : précision « en agglomération » ; 1,5 m hors agglomération.
   - **SEC-044** : préciser qu'il ne s'agit pas d'une pièce indivisible.
   - **SEC-051** : reprendre les termes exacts de l'AR de 2006.
   - **USR-030** : préciser de quelle « première ligne » d'arrêt il s'agit.
   - **PHE-004** : la photo montre un E3, pas un E1.
   - **PHE-018** : décrire la flèche telle qu'elle apparaît sur la photo.
   - **PHG-020** : formulation de la bonne réponse.
4. **Vérification des cours** par des agents qui ne les avaient pas écrits, affirmation par affirmation. Une dizaine d'imprécisions ont été corrigées, surtout dans les descriptions de formes et de couleurs de panneaux, la portée des interdictions de dépasser et les conseils sur le feu orange.

## Limites connues

- **Même famille de modèles.** Rédacteurs, relecteurs et auditeurs sont tous des modèles d'IA de la même famille. Leurs erreurs peuvent donc aller dans le même sens. L'absence de désaccord lors de l'audit est rassurante, mais elle ne remplace pas une relecture humaine.
- **Questions photo.** Lire une photo reste plus fragile que lire un texte, surtout avec de petits panneaux. C'est sur les photos que les relecteurs ont trouvé le plus d'erreurs.
- **Panneaux dessinés.** Ce sont des schémas simplifiés, pas les modèles officiels.
- **Format de l'examen.** Les chiffres « 50 questions, 41/50, faute grave −5 » viennent d'une source secondaire, qui cite Bruxelles-Mobilité.
- **Nouveau code au 1er juin 2027.** Le nouveau *Code de la voie publique* remplacera l'AR de 1975 : le contenu devra alors être revu.

## Signaler une erreur

Sous chaque explication et chaque section de cours, le lien « 🚩 Signaler une erreur » ouvre une issue GitHub pré-remplie. En cas de doute, c'est le texte officiel qui fait foi.
