# LA BIBLE DE PRO RÉCUP

## DOCUMENT 12

# CRUD Utilisateurs

## Objectif

Le module Utilisateurs permet de gérer les comptes des personnes utilisant la plateforme.

---

## Fonctionnalités

### 1. Créer un utilisateur

L'administrateur peut créer un nouvel utilisateur.

Champs :

- Organisation
- Rôle
- Nom
- Prénom
- Sexe
- Téléphone
- Email
- Langue
- Mot de passe

---

### 2. Consulter les utilisateurs

Afficher la liste des utilisateurs de l'organisation.

Possibilité de rechercher par :

- nom
- prénom
- téléphone
- email
- rôle

---

### 3. Modifier un utilisateur

Les informations peuvent être mises à jour.

Le mot de passe est modifié séparément.

---

### 4. Désactiver un utilisateur

L'utilisateur n'est pas supprimé.

Le champ actif passe à FALSE.

L'historique est conservé.

---

### 5. Réactiver un utilisateur

L'utilisateur peut être réactivé.

---

## Contraintes

- Nom obligatoire
- Prénom obligatoire
- Téléphone obligatoire
- Organisation obligatoire
- Rôle obligatoire
- Le mot de passe est toujours haché.
- Deux utilisateurs d'une même organisation ne peuvent pas partager le même e-mail.

---

## Statut

En cours de développement.