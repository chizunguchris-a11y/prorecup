# Recette humaine Alpha — mode d'emploi

## Statut des liens

Les noms ci-dessous sont préparés dans `render.alpha.yaml`, mais les services Render doivent encore être créés. Ne transmettez aucun lien aux testeurs avant que le backend Alpha confirme qu'il utilise bien la base TEST.

- Porte d'entrée : `https://prorecup-alpha.onrender.com/accueil.html`
- Back-office : `https://prorecup-alpha.onrender.com/index.html`
- Portail Client : `https://prorecup-alpha.onrender.com/portail-client/index.html`
- Application Agent : `https://prorecup-alpha.onrender.com/agent-app/index.html`

## Les six rôles

1. Administrateur : compte préparé par le coordinateur, puis connexion Back-office.
2. Manager : invitation interne, activation, puis connexion Back-office.
3. Agent de valorisation carbone A : invitation, activation, puis Application Agent.
4. Agent de valorisation carbone B : invitation, activation, puis Application Agent.
5. Client principal : demande « Devenir client », validation/provisionnement par l'Administrateur, puis activation.
6. Client secondaire : invitation depuis l'organisation cliente, activation, puis Portail Client.

Aucun mot de passe, jeton ou secret ne doit être ajouté à ce document. Le coordinateur collecte séparément les six adresses e-mail, déclenche les invitations et transmet les accès par un canal privé.

La préparation technique crée déjà six comptes synthétiques sur TEST (un Admin, un Manager, deux Agents et deux Clients). Avant remise à des personnes réelles, le coordinateur remplace les adresses synthétiques par les adresses des testeurs et impose des accès individuels transmis hors Git.

## Relais conseillé

Administrateur → Manager → Client principal → Client secondaire → Agent A → Agent B. Chaque personne vérifie connexion, navigation, compte/sécurité, action métier principale et déconnexion. Les Agents testent ensuite une action hors ligne, ferment l'application, la rouvrent, rétablissent le réseau et confirment une seule synchronisation.

Résultat attendu : aucun accès croisé, aucune donnée perdue ou dupliquée, aucun 404, et les changements sensibles invalident l'ancienne session.

## Préparer ou remettre à zéro

Depuis un poste autorisé, charger uniquement les variables TEST, définir un mot de passe temporaire hors Git dans `INTEGRATION_TEST_PASSWORD`, puis exécuter depuis `backend/` :

```text
node scripts/prepare-test-database.js
```

Le script refuse une URL TEST égale à `DATABASE_URL`, ne supprime pas le schéma et ne journalise aucun secret. Pour un nouveau round humain, supprimer manuellement uniquement les demandes et opérations portant le préfixe convenu `ALPHA-`, puis rejouer le script. L'automatisation complète de ce nettoyage ciblé reste à fournir avant le second round.

## Limites connues

- déploiement Render Alpha encore externe ;
- clé Resend de recette actuellement refusée par l'API, donc invitations à valider après correction de la configuration ;
- domaine e-mail officiel, logo vectoriel final, SMS, MFA/passkeys et stores hors périmètre Alpha.
