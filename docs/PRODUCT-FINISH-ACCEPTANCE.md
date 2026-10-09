# Product Finish — preuves au 9 octobre 2026

Cette checklist distingue les validations réellement exécutées des étapes externes encore nécessaires.

| Catégorie | État | Preuve / limite |
| --- | --- | --- |
| AUTH | PASS | Connexions réelles Admin, Manager, Agent et Client sur la base TEST. |
| RBAC | PASS | Manager→Admin, Agent→Admin, Client→Admin et Public→Admin refusés. |
| RECOVERY | PASS | Forgot/reset, expiration, usage unique et révocation des anciens JWT validés. |
| INVITATION | PASS | Invitation, renouvellement, annulation et états expiré/utilisé couverts. |
| ACTIVATION | PASS | Activation réelle et refus du second usage sur TEST. |
| ONBOARDING | PASS | Demande publique, doublon neutre et validation Admin exécutés. |
| CLIENT PROVISIONING | PASS | Provisionnement, retry/double clic et premier utilisateur exécutés. |
| EMAIL VERIFICATION | PASS | Valide, invalide, expiré, utilisé, renvoi et compte suspendu sur TEST. |
| SESSIONS | PASS | Session courante, sessions multiples, fermeture, changement/reset et `auth_epoch`. |
| BACK-OFFICE | PASS | APIs et RBAC Admin/Manager réels ; familles métier live sans échec. |
| PORTAIL CLIENT | PASS | Authentification via `utilisateurs` + `client_utilisateurs`, compte et sécurité. |
| AGENT TERRAIN | PASS | Auth, tournée, queue, preuves, reprise et synchronisation validées. |
| PWA | PASS | Edge headless réel : manifest, Service Worker, shell offline, IndexedDB, reload et retour réseau. |
| DATABASE TEST | PASS | Base distincte de production, migrations 1–20, rollback et concurrence PostgreSQL. |
| RESPONSIVE | PASS | Admin, Manager, Client et Agent validés dans Edge en 1440 px puis 390 px, sans overflow. |
| NAVIGATION | PASS | Connexions et redirections des quatre rôles sans 404 ni erreur console ; smoke public Alpha à rejouer après déploiement. |
| ERROR STATES | PASS | Doublons, tokens invalides/expirés/utilisés, suspension et refus RBAC couverts. |
| DEPLOYMENT | BLOCKED | Le Blueprint Alpha est prêt, mais les deux services Render Alpha ne sont pas encore créés. |
| HUMAN ALPHA READINESS | BLOCKED | URLs publiques Alpha et coordonnées des six testeurs non configurées ; ne pas utiliser la production. |

## Transport e-mail

- PARTIAL — les liens HTTPS, sujets, expéditeur logique, expiration et usage unique sont validés par capture TEST.
- BLOCKED — l'appel Resend de recette retourne une erreur de validation avec la clé actuellement enregistrée ; aucune réception humaine n'est déclarée.

## Compteurs

- Socle consolidé avant cette reprise : **182 passing, 0 pending, 0 failing**.
- Scénarios Product Finish ajoutés : **3 passing**.
- Agent hors suite Mocha : **15 groupes frontend + 5 tests retry + 2 tests navigateur/PWA**, tous réussis.

Ne marquer `DEPLOYMENT` ou `HUMAN ALPHA READINESS` comme `PASS` qu'après création des services décrits dans `render.alpha.yaml` et smoke test de leurs URLs.
