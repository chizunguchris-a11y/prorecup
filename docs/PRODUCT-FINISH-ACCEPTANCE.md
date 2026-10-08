# Recette technique interne — Product Finish

Cette checklist décrit des contrôles techniques. Elle ne remplace pas une recette humaine ni un test sur données réelles.

## Contrôles automatisés confirmés

- PASS — API racine et middleware d'authentification.
- PASS — récupération : réponse publique neutre, usage unique, expiration, révocation et `auth_epoch`.
- PASS — invitations : RBAC Admin/Manager, hash du jeton, activation unique, annulation/renouvellement.
- PASS — onboarding public neutre et absence de création automatique d'un rôle interne.
- PASS — Manager vers Administrateur interdit.
- PASS — fermeture globale des sessions avec incrément de `auth_epoch`.
- PASS — contrats PWA/queue/pesée/QR/traçabilité couverts par la suite existante.

## Contrôles nécessitant une base dédiée

- PENDING — authentification réelle, clients, agents, missions, sites, stocks, tricycles et fixtures associées.
- PENDING — migration/rollback et concurrence PostgreSQL de la traçabilité.

## Contrôles UI à exécuter après déploiement

- Porte d'entrée : Back-office, Portail Client, Agent, devenir client, aide d'accès.
- Activation : lien valide, invalide, expiré, consommé.
- Vérification e-mail : lien valide, invalide, expiré, consommé.
- Sécurité : état e-mail/téléphone, sessions, fermeture autres/toutes, changement de mot de passe.
- Responsive : desktop et environ 390 px, sans overflow horizontal.
- Navigateur : aucune erreur console, aucun 404, aucun bouton sans action.
- PWA Agent : shell, manifest, service worker, IndexedDB, queue et reprise après interruption.

Ne marquer ces contrôles UI `PASS` qu'après vérification effective sur le déploiement correspondant au HEAD.
