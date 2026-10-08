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
- PASS — migrations 17, 18, 19 et 20 présentes dans le dépôt et observées dans Supabase.
- PASS — démarrage local en mode production, connexion Supabase et `GET /` à 200.
- PASS — backend Render : `GET /` à 200 après cold start.
- PASS — frontend et application Agent servis par Render.

## Contrôles nécessitant une base dédiée

- PENDING — authentification réelle, clients, agents, missions, sites, stocks, tricycles et fixtures associées.
- PENDING — migration/rollback et concurrence PostgreSQL de la traçabilité.

## Contrôles UI confirmés sans compte de recette

- PASS — porte d'entrée : Back-office, Portail Client, Agent, devenir client, aide d'accès.
- PASS — états publics d'activation et de vérification e-mail invalides.
- PASS — responsive desktop et 390 px sur les pages publiques, sans overflow horizontal.
- PASS — aucun 404 ni erreur console sur les routes publiques contrôlées.
- PASS — shell Agent et manifest PWA accessibles sur Render.
- LIMITÉ — le navigateur de recette ne fournit pas l'API Service Worker ; l'enregistrement actif n'est pas observable dans cet environnement.

## Contrôles nécessitant un environnement externe

- PENDING — cycle e-mail réel : clé Resend, domaine SPF/DKIM validé et adresse de recette.
- PENDING — écrans authentifiés et recette A→Z : base dédiée et comptes fixtures.
- PENDING — Service Worker/IndexedDB/offline en navigateur compatible PWA.

Ne marquer ces contrôles UI `PASS` qu'après vérification effective sur le déploiement correspondant au HEAD.
