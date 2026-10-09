# Pro Récup — système de marque

La marque publique officielle est « Pro Récup », toujours avec une espace. La direction visuelle validée associe PR, boucle circulaire et élément végétal. Le fichier vectoriel maître n'est pas encore présent : l'icône Terrain historique et le favicon PR restent provisoires, et le fallback est le nom « Pro Récup ». Aucun suffixe juridique dans l'interface et aucun slogan n'est obligatoire dans le logo.

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

Palette officielle : vert interface `#176B4D`, vert profond `#0E4F38`, accent marque `#39B54A`, fond doux `#EAF5EF`, texte `#17211C` et fond `#F6F8F7`. Montserrat est réservée à la marque et à la communication ; le produit utilise Inter, Segoe UI, Roboto ou Arial. La signature facultative est « Collecte · Preuve · Traçabilité ». Préserver une marge autour du logo d'au moins la hauteur de sa capitale P divisée par deux. Hauteur minimale 24 px dans les interfaces. Ne pas étirer, recolorer arbitrairement ou ajouter une ombre. Texte courant : contraste minimum 4,5:1 ; contrôles : 3:1.

Le remplacement inclut la mise à jour des manifests avec les PNG approuvés, l'ajout Apple Touch Icon et une vérification sur fond clair/sombre. Le manifest frontend est séparé de la PWA Terrain : ne pas changer son scope, son start_url ou sa queue offline. Lors d'un changement de fichiers précachés Terrain, augmenter la version de cache et vérifier la mise à jour sans perte IndexedDB.

Ne pas redessiner ni approximer le symbole validé avant réception du fichier maître. Le pack définitif remplacera les assets provisoires sans changer les parcours Alpha.
