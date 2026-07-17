| Champ                | Type         | Obligatoire | Description                       |
| -------------------- | ------------ | ----------- | --------------------------------- |
| id                   | UUID         | Oui         | Identifiant unique                |
| organisation_id      | UUID         | Oui         | Organisation de l'utilisateur     |
| role_id              | UUID         | Oui         | Rôle principal                    |
| nom                  | VARCHAR(100) | Oui         | Nom                               |
| prenom               | VARCHAR(100) | Oui         | Prénom                            |
| sexe                 | ENUM         | Non         | Homme, Femme, Autre               |
| telephone            | VARCHAR(30)  | Oui         | Téléphone                         |
| telephone_verifie_le | TIMESTAMP    | Non         | Date de vérification du téléphone |
| email                | VARCHAR(255) | Non         | Adresse e-mail                    |
| email_verifie_le     | TIMESTAMP    | Non         | Date de vérification de l'e-mail  |
| mot_de_passe_hash    | TEXT         | Oui         | Mot de passe haché                |
| photo_profil         | TEXT         | Non         | URL de la photo                   |
| langue               | VARCHAR(10)  | Oui         | fr, en...                         |
| actif                | BOOLEAN      | Oui         | Compte actif                      |
| derniere_connexion   | TIMESTAMP    | Non         | Dernière connexion                |
| derniere_activite_le | TIMESTAMP    | Non         | Dernière activité                 |
| cree_le              | TIMESTAMP    | Oui         | Création                          |
| modifie_le           | TIMESTAMP    | Oui         | Modification                      |
| supprime_le          | TIMESTAMP    | Non         | Suppression logique               |
