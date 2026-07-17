# LA BIBLE DE PRO RÉCUP

## DOCUMENT 09

# Chapitre 2

# Table : organisations

## Objectif

Cette table représente les entreprises qui utilisent la plateforme Pro Récup.

Chaque organisation est totalement indépendante des autres.

Toutes les données du logiciel sont rattachées à une organisation.

---

## Nom de la table

organisations

---

## Clé primaire

id

Type : UUID

---

## Champs

| Champ | Type | Obligatoire | Description |
|--------|------|-------------|-------------|
| id | UUID | Oui | Identifiant unique |
| nom | VARCHAR(150) | Oui | Nom officiel de l'organisation |
| slug | VARCHAR(150) | Oui | Identifiant unique lisible de l'organisation |
| nom_court | VARCHAR(50) | Non | Nom affiché dans l'application |
| email | VARCHAR(255) | Non | Adresse e-mail principale |
| telephone | VARCHAR(30) | Non | Téléphone principal |
| adresse | TEXT | Non | Adresse physique |
| ville | VARCHAR(100) | Non | Ville |
| pays | VARCHAR(100) | Oui | Pays |
| devise | VARCHAR(10) | Oui | Devise principale |
| fuseau_horaire | VARCHAR(100) | Oui | Fuseau horaire |
| logo | TEXT | Non | URL du logo |
| actif | BOOLEAN | Oui | Organisation active |
| cree_le | TIMESTAMP | Oui | Date de création |
| modifie_le | TIMESTAMP | Oui | Dernière modification |
| supprime_le | TIMESTAMP | Non | Suppression logique |

---

## Relations

Une organisation possède plusieurs :

- utilisateurs
- clients
- tournées
- collectes
- stocks
- ventes
- rapports

---

## Contraintes

- Le nom est obligatoire.
- Le slug est unique.
- Une organisation désactivée ne peut plus utiliser la plateforme.
- Les suppressions sont logiques (soft delete).

---

## Index recommandés

- nom
- slug
- pays
- actif