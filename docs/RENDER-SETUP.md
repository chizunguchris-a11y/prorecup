# Configuration Render — Pro Récup

## Backend

Service : `https://prorecup-backend.onrender.com`

Commande de démarrage attendue depuis `backend/` :

```text
npm start
```

Variables obligatoires au fonctionnement général :

- `NODE_ENV=production`
- `DATABASE_URL`
- `JWT_SECRET`
- `PRORECUP_FRONTEND_URL=https://prorecup-frontend.onrender.com`
- `FRONTEND_URL=https://prorecup-frontend.onrender.com`

Variables des fonctions administratives et transactionnelles :

- `PRORECUP_INTERNAL_ORGANISATION_ID`
- `RESEND_API_KEY`
- `PRORECUP_EMAIL_FROM=Pro Récup <no-reply@prorecup.com>`
- `PRORECUP_SUPPORT_EMAIL=support@prorecup.com`

`PRORECUP_INTERNAL_ORGANISATION_ID` reste fail-closed : sans cette variable, la gestion des demandes client répond `503` et aucune organisation n'est implicitement autorisée.

## Organisation interne observée le 8 octobre 2026

La lecture Supabase montre une seule organisation possédant un Administrateur :

- nom : `Pro Récup RDC`
- UUID à utiliser : `04fbfede-8cf8-47fc-a9b2-599b766229e2`
- éléments de contrôle : 10 utilisateurs, 1 Administrateur, 8 adresses `@prorecup.com`

Avant toute modification future de la variable Render, revalider cette valeur dans Supabase. Le domaine e-mail seul ne confère jamais un rôle ni l'autorité plateforme.

## Contrôles après déploiement

1. `GET /` doit répondre `200` avec `status: operational`.
2. `GET /api/identity` doit répondre `200` sans donnée de compte.
3. `POST /api/onboarding/client` avec un corps invalide doit répondre `400`, sans mutation.
4. Une route administrative sans JWT doit répondre `401`.
5. Vérifier les logs de démarrage : port écouté, connexion PostgreSQL réussie, aucune clé ou jeton affiché.

La page HTML « Application loading » est l'interstitiel de cold start Render. Le diagnostic doit être confirmé par une requête HTTP directe avant de conclure à une panne applicative.
