# Pro Récup — système de marque

Aucun logo officiel approuvé n'est présent. L'icône Terrain historique et le favicon PR sont des identifiants provisoires, pas le logo officiel. Le fallback est le nom « Pro Récup ». Aucun suffixe juridique dans l'interface.

## Point de remplacement

`frontend/brand/brand.js` centralise les variantes et applique la marque aux éléments `data-brand`. Les trois points d'entrée chargent ce composant. Les fichiers attendus sont relatifs à `frontend/brand/` :

| Asset attendu | Format / taille |
| --- | --- |
| logo-horizontal.svg | SVG, viewBox, fond transparent, ratio ≈ 4:1 |
| logo-light.svg / logo-dark.svg | SVG adapté au fond sombre / clair |
| logo-monochrome.svg | SVG une seule couleur |
| symbol.svg | SVG carré |
| favicon.svg / favicon.ico | SVG + ICO 16/32/48 px |
| icon-192.png / icon-512.png | PNG sRGB, carrés opaques |
| apple-touch-icon.png | PNG 180×180 |
| icon-maskable-512.png | PNG 512×512, contenu central dans les 80 % |

Ces assets officiels restent à produire après validation humaine. Les chemins non configurés ne sont jamais chargés : aucun asset absent ne provoque un lien cassé.

## Usage

Palette : #176B4D, #0E4F38, #EAF5EF, #F6F8F7, #FFFFFF, #17211C, #66736D, #DFE7E3. Police Inter / Segoe UI / Roboto / Helvetica / Arial / sans-serif. Préserver une marge autour du logo d'au moins la hauteur de sa capitale P divisée par deux. Hauteur minimale 24 px dans les interfaces. Ne pas étirer, recolorer arbitrairement ou ajouter une ombre. Texte courant : contraste minimum 4,5:1 ; contrôles : 3:1.

Le remplacement inclut la mise à jour des manifests avec les PNG approuvés, l'ajout Apple Touch Icon et une vérification sur fond clair/sombre. Le manifest frontend est séparé de la PWA Terrain : ne pas changer son scope, son start_url ou sa queue offline. Lors d'un changement de fichiers précachés Terrain, augmenter la version de cache et vérifier la mise à jour sans perte IndexedDB.

Direction à explorer seulement : technologie, industrie, matière, flux, traçabilité et preuve/data. P/R géométriques est une piste non approuvée. Éviter feuille, poubelle, planète et trois flèches de recyclage.
