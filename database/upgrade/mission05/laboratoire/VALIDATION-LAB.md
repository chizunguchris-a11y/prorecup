# Pro Recup - Mission 05 - Laboratoire PostgreSQL

STATUT : EXPERIMENTAL. NE PAS DEPLOYER SUR RENDER.

Branche de depart : fd10d50
Version PostgreSQL : 18.6
Base de validation : m05_probe_fondations_02

## Resultats observes

- 21/21 migrations historiques executees.
- Lot 02 : 9 scenarios d'integrite reussis.
- Lot 03 V2 : 30 FK organisationnelles validees.
- Lot 03 V2 : 20 contraintes numeriques validees.
- Contraintes PostgreSQL non validees : 0.
- Tests negatifs : references inter-organisations et NaN refuses.
- Tests positifs : quantites fractionnaires acceptees.
- Donnees synthetiques de test annulees.

## Limites

Ces scripts ciblent une instance PostgreSQL locale precise.
Ils ne sont PAS des migrations de production.
Les tables de jonction, les permissions runtime, les tests
de concurrence et les parcours E2E restent a valider.

Ne jamais executer automatiquement ces scripts sur Alpha,
Production ou une base contenant des donnees reelles.
