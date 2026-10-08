# Base PostgreSQL dédiée aux tests

Les tests d'intégration historiques modifient des fixtures. Ils ne doivent jamais utiliser `DATABASE_URL` ni une copie contenant des données de production.

## Variables

- `INTEGRATION_TEST_DATABASE_URL` : base isolée et réinitialisable pour les tests API généraux.
- `INTEGRATION_TEST_EMAIL` et `INTEGRATION_TEST_PASSWORD` : compte fixture présent uniquement dans cette base.
- `TRACEABILITY_TEST_DATABASE_URL` : base PostgreSQL locale dédiée aux cycles migration/rollback et aux tests de concurrence de traçabilité.

Avant toute exécution, comparer les URLs normalisées et interrompre si une URL de test est identique à `DATABASE_URL`. Le fichier `backend/tests/test-environment.js` n'active l'intégration que si `RUN_LIVE_INTEGRATION=1` et si les trois variables d'intégration sont présentes.

## Préparation recommandée

1. Créer une base PostgreSQL vide, sans donnée réelle.
2. Appliquer dans l'ordre les migrations de `database/migrations/`.
3. Charger des fixtures explicitement dédiées aux tests.
4. Définir les variables dans `backend/.env.test`, fichier ignoré par Git.
5. Lancer `npm test` depuis `backend/`.

Sans base dédiée, les scénarios concernés restent volontairement `pending`. Ils ne doivent pas être remplacés par des mocks uniquement pour réduire ce compteur.
