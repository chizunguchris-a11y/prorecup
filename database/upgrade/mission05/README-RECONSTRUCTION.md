# Mission 05 — reconstruction partielle, non déployable

Ce contenu est reconstruit depuis `ProRecup-M05-base.zip` (commit de départ
`1c6b451`) et les rapports d'audit Mission 05. **Il ne s'agit PAS du correctif
original de 34 fichiers.** Les 21 migrations historiques et le schéma ne sont
pas réécrits ici. Aucun SQL contenu dans ce dossier ne réalise de mutation.

## Rétabli et testé localement (simulations Node, sans PostgreSQL)

- Middleware auth : vérifie en base l'utilisateur, le rôle courant, son état et
  sa portée globale ; refuse le rôle du token différent du rôle courant.
- Login : impossible de sélectionner arbitrairement l'un de deux comptes ayant
  le même email ; conflit bloquant, y compris lors de l'inscription.
- Recovery : email/téléphone ambigus refusés, sans confondre un email avec un
  numéro de téléphone. Le contrôleur doit préserver sa réponse publique neutre.
- Création d'espace client : une adresse occupée ne sélectionne pas un compte
  historique ; la création est refusée comme doublon.
- Décrémentation des lots : `$3::numeric` protège le binding d'une vente à
  quantité fractionnaire (vérification syntaxique et mock ; SQL réel à tester).

## Tests disponibles

`node --test backend/tests/mission05.reconstruction.local.mjs`

En complément, **relancer toutes les suites M01–M04 et les tests E2E historiques**
avant tout commit. Aucun test PostgreSQL ni régression globale ne peut être
certifié par ces seules simulations.

## Blocages avant livraison intégrale et Alpha

- Construire et **exécuter sur deux bases PostgreSQL locales neuves** le schéma
  canonique à partir du runtime et des 21 migrations, sans fondation de fixture.
- Tester vrais rôles / epochs et sessions, contraintes tenant, transaction de
  vente fractionnaire, FIFO, doublons, provenance, droits SQL, bootstrap et
  redémarrage. Les rapports précédents sont des objectifs de comparaison.
- Les rôles locaux existants ne sont PAS convertis ici. Le middleware renforcé
  refusera les rôles dont `organisation_id` n'est pas `NULL`. Ne pas déployer
  avant examen/mapping humain du schéma cible et des sessions.
- Ne pas déployer sur une base existante sans inspection : ancien schéma utilisateur,
  double emails, `photo_profil` / `photo_url`, `mot_de_passe_hash` /
  `mot_de_passe`, `prenom`, UUID et défauts, masses, stock hérité et migrations.
- Résoudre séparément le lien public de récupération Alpha en cas d'échec email,
  TLS avec vérification désactivée, permissions PostgreSQL et stockage des preuves.
- Tester sur Android/iPhone, Storage, connexion réelle et restauration sauvegarde.

`inspect-readonly.sql` répertorie les objets SQL et ne lit aucun mot de passe
ou donnée de compte. L'utiliser seulement après validation de la cible.

Ne pas exécuter de SQL de migration, ne pas modifier `develop-v2`, et ne pas
pousser/merger/déployer les corrections tant que les tests et décisions critiques
ne sont pas validés.
