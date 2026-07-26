# Base de données de Pro Récup

## Système utilisé

La base de données utilise PostgreSQL, hébergé sur Supabase.

Les identifiants principaux sont généralement des UUID.

---

## Principales tables

### organisations

Représente les organisations utilisant Pro Récup.

Champs principaux :

- id
- nom

---

### utilisateurs

Contient les utilisateurs de l’application.

Champs principaux :

- id
- nom
- email
- mot_de_passe
- organisation_id
- role_id
- cree_le
- modifie_le

Relations :

- organisation_id → organisations.id
- role_id → roles.id

---

### roles

Contient les rôles disponibles.

Exemples :

- admin
- manager
- agent_valorisation_carbone

---

### permissions

Contient les permissions pouvant être attribuées aux rôles.

---

### role_permissions

Table de liaison entre les rôles et les permissions.

---

### clients

Contient les clients rattachés à une organisation.

Champs principaux :

- id
- nom
- type_client
- contact_email
- contact_telephone
- adresse_siege
- organisation_id

Relation :

- organisation_id → organisations.id

---

### sites_de_collecte

Contient les sites de collecte.

Champs principaux :

- id
- nom
- adresse
- zone_geographique
- responsable_nom
- organisation_id

Relation :

- organisation_id → organisations.id

---

### types_dechets

Contient les types de déchets ou matières gérées.

Exemple :

- PET

Champs principaux :

- id
- nom

---

### collectes

Contient les collectes enregistrées par les agents.

Champs principaux :

- id
- site_id
- client_id
- agent_id
- type_dechet_id
- poids_estime
- statut

Relations :

- site_id → sites_de_collecte.id
- client_id → clients.id
- agent_id → utilisateurs.id
- type_dechet_id → types_dechets.id

Statuts principaux :

- en_attente
- valide

---

### lots

Contient les lots créés à partir des collectes validées.

Champs principaux :

- id
- collecte_id
- poids_reel
- type_dechet_id
- statut_lot
- date_creation

Relations :

- collecte_id → collectes.id
- type_dechet_id → types_dechets.id

Règle importante :

Une collecte ne peut produire qu’un seul lot.

---

### stocks

Contient les quantités disponibles par organisation et par type de déchet.

Champs principaux :

- id
- organisation_id
- type_dechet_id
- quantite
- unite
- date_mise_a_jour

Relations :

- organisation_id → organisations.id
- type_dechet_id → types_dechets.id

Règle importante :

Une organisation possède au maximum un stock par type de déchet.

---

### mouvements_stock

Conserve l’historique des entrées et sorties de stock.

Champs principaux :

- id
- stock_id
- lot_id
- vente_id
- type_mouvement
- quantite
- date_mouvement

Relations :

- stock_id → stocks.id
- lot_id → lots.id
- vente_id → ventes.id

Types de mouvement :

- ENTREE
- SORTIE

---

### ventes

Contient les ventes de matières.

Champs principaux :

- id
- organisation_id
- stock_id
- quantite
- prix_unitaire
- montant_total
- acheteur_nom
- reference_vente
- statut
- cree_par
- date_vente

Relations :

- organisation_id → organisations.id
- stock_id → stocks.id
- cree_par → utilisateurs.id

---

### facteurs_carbone

Contient les facteurs utilisés pour calculer l’impact carbone estimé.

Champs principaux :

- id
- type_dechet_id
- facteur_kg_co2e_par_kg
- source
- version_source
- zone_geographique
- date_debut_validite
- date_fin_validite
- statut
- date_creation

Relation :

- type_dechet_id → types_dechets.id

Statuts possibles :

- provisoire
- valide
- archive

---

### impacts_carbone

Conserve le résultat du calcul carbone associé à une vente.

Champs principaux :

- id
- vente_id
- facteur_carbone_id
- quantite_kg
- facteur_utilise
- co2e_estime_kg
- date_calcul

Relations :

- vente_id → ventes.id
- facteur_carbone_id → facteurs_carbone.id

Règle importante :

Une vente ne peut produire qu’un seul impact carbone.

---

## Flux principal des données

```text
Organisation
    ↓
Client
    ↓
Site de collecte
    ↓
Collecte
    ↓
Validation
    ↓
Lot
    ↓
Stock
    ↓
Vente
    ↓
Mouvement de stock
    ↓
Impact carbone estimé




Ce document résume la structure actuelle du MVP. Certaines colonnes secondaires peuvent être ajoutées plus tard, mais les principales relations métier sont déjà décrites.