# E-mail transactionnel Pro Récup

Le backend utilise Resend pour les invitations, la récupération de mot de passe et la vérification d'adresse. Aucun secret ne doit être commité ni affiché dans les logs.

## Mise en production

1. Ajouter `prorecup.com` dans Resend.
2. Copier les enregistrements DNS fournis par Resend chez le gestionnaire DNS du domaine.
3. Vérifier les enregistrements SPF et DKIM, puis attendre la validation du domaine.
4. Définir sur Render :
   - `RESEND_API_KEY` ;
   - `PRORECUP_EMAIL_FROM=Pro Récup <no-reply@prorecup.com>` ;
   - `PRORECUP_SUPPORT_EMAIL=support@prorecup.com` ;
   - `PRORECUP_FRONTEND_URL=https://prorecup-frontend.onrender.com`.
5. Redéployer le backend sans enregistrer la valeur de `RESEND_API_KEY` dans les journaux.
6. Tester une invitation, une récupération et une vérification e-mail sur une adresse de recette.
7. Contrôler l'arrivée, le dossier indésirable, les liens HTTPS, le From, le Reply-To et les résultats SPF/DKIM.

Quand le fournisseur n'est pas configuré, l'API renvoie `EMAIL_PROVIDER_NOT_CONFIGURED`. Elle ne prétend jamais qu'un message a été envoyé et n'expose pas le lien personnel brut dans l'interface d'administration.
