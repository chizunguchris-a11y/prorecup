# LA BIBLE DE PRO RÉCUP

## DOCUMENT 10

# Chapitre 2

# Table : roles

## Objectif

Cette table contient les différents rôles pouvant être attribués aux utilisateurs de la plateforme.

Un rôle détermine les droits généraux d'un utilisateur.

---

## Nom de la table

roles

---

## Clé primaire

id

Type : UUID

---

## Champs

| Champ | Type | Obligatoire | Description |
|--------|------|-------------|-------------|
| id | UUID | Oui | Identifiant unique |
| organisation_id | UUID | Oui | Organisation propriétaire du rôle |
| nom | VARCHAR(100) | Oui | Nom du rôle |
| description | TEXT | Non | Description du rôle |
| actif | BOOLEAN | Oui | Rôle actif ou non |
| cree_le | TIMESTAMP | Oui | Date de création |
| modifie_le | TIMESTAMP | Oui | Dernière modification |
| supprime_le | TIMESTAMP | Non | Suppression logique |

---

## Relations

Une organisation possède plusieurs rôles.

Un rôle peut être attribué à plusieurs utilisateurs.

Organisation

1 -------- N Rôles

Rôle

1 -------- N Utilisateurs

---

## Contraintes

- Le nom du rôle est obligatoire.
- Deux rôles d'une même organisation ne peuvent pas avoir le même nom.
- Un rôle désactivé ne peut plus être attribué.

---

## Index recommandés

- organisation_id
- nom
- actif