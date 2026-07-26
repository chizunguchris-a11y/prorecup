# Architecture de Pro Récup

## Vue d'ensemble

Le backend est développé avec Node.js et Express.

L'application suit une architecture en couches afin de séparer les responsabilités.

```
Client
    │
    ▼
Routes
    │
    ▼
Middlewares
    │
    ▼
Controllers
    │
    ▼
Services
    │
    ▼
Repositories
    │
    ▼
PostgreSQL (Supabase)
```

---

## Dossiers principaux

### config

Connexion à PostgreSQL.

### controllers

Réception des requêtes HTTP.

Les contrôleurs :

- appellent les services
- utilisent ApiResponse
- utilisent asyncHandler

### services

Contiennent toute la logique métier.

Les services :

- valident les règles métier
- utilisent ApiError
- appellent les repositories

### repositories

Accès à la base de données.

Aucun traitement métier n'y est réalisé.

### middlewares

- authMiddleware
- roleMiddleware
- validationMiddleware
- asyncHandler
- errorHandler

### validators

Validation des données entrantes avec express-validator.

### docs

Documentation Swagger.

### utils

- ApiResponse
- ApiError
- logger

---

## Principes

- Une route appelle un contrôleur.
- Le contrôleur appelle un service.
- Le service appelle un repository.
- Le repository dialogue avec PostgreSQL.
- Toutes les erreurs passent par errorHandler.