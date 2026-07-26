# Tests de Pro Récup

## Objectif

Les tests automatisés permettent de vérifier que les principales fonctionnalités de l'API continuent de fonctionner après chaque modification du code.

Les tests sont réalisés avec :

- Mocha
- Supertest

---

## Lancement des tests

Depuis le dossier backend :

```bash
npm test
```

---

## Tests disponibles

### Serveur

Vérifie que l'application Express démarre correctement.

Route testée :

```
GET /
```

Résultat attendu :

```
200 OK
```

---

### Authentification

Connexion avec un utilisateur valide.

Route :

```
POST /api/auth/login
```

Vérifications :

- succès de la connexion
- présence du JWT
- utilisateur retourné

---

Connexion avec un mauvais mot de passe.

Résultat attendu :

```
400 Bad Request
```

---

### Tableau de bord

Route :

```
GET /api/dashboard
```

Vérifications :

- accès avec JWT
- refus sans JWT
- présence des indicateurs

---

### Stocks

Route :

```
GET /api/stocks
```

Vérifications :

- accès avec JWT
- refus sans JWT
- liste des stocks

---

### Clients

Route :

```
POST /api/clients
```

Vérifications :

- création d'un client
- refus sans JWT

---

### Sites

Route :

```
POST /api/sites
```

Vérifications :

- création d'un site
- refus sans JWT

---

## Nombre actuel

11 tests automatisés.

---

## Bonnes pratiques

Avant chaque modification importante :

```
npm test
```

Tous les tests doivent réussir.

---

## Evolutions prévues

Ajouter des tests pour :

- Collectes
- Validation des collectes
- Lots
- Ventes
- Dashboard détaillé
- Impact carbone
- Gestion des rôles
- Permissions