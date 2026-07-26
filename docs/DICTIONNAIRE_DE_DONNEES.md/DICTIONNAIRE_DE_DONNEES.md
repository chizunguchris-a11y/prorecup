# Dictionnaire de données - Pro Récup

## Champs communs

### id
Identifiant unique (UUID).

### cree_le
Date et heure de création de l'enregistrement.

### modifie_le
Date et heure de la dernière modification.

### supprime_le
Date de suppression logique (soft delete).
Si la valeur est vide, l'enregistrement est considéré comme actif.

### actif
Indique si l'enregistrement est actif.

- TRUE : actif
- FALSE : inactif

### organisation_id
Identifiant de l'organisation propriétaire des données.

### role_id
Identifiant du rôle associé à un utilisateur.