# API de Pro Récup

## Adresse locale

```text
http://localhost:5000

Documentation Swagger :

http://localhost:5000/api/docs

Authentification

L’API utilise des tokens JWT.



Après connexion, le token doit être envoyé dans l’en-tête :



Authorization: Bearer VOTRE_TOKEN

Routes principales


Authentification


Inscription


POST /api/auth/register


Connexion


POST /api/auth/login



Exemple de corps :



{
  "email": "christian2@prorecup.com",
  "motDePasse": "ProRecup2026!"
}

Clients


Créer un client


POST /api/clients



Route protégée par JWT.



Le champ organisation_id est récupéré automatiquement depuis le token.



Exemple :

{
  "nom": "Hôpital Central",
  "type_client": "Hôpital",
  "contact_email": "contact@hopital.cd",
  "contact_telephone": "+243900000000",
  "adresse_siege": "Kinshasa"
}

Sites de collecte


Créer un site


POST /api/sites



Route protégée par JWT.



Le champ organisation_id est récupéré automatiquement depuis le token.



Exemple :

{
  "nom": "Centre de collecte Gombe",
  "adresse": "Boulevard du 30 Juin",
  "zone_geographique": "Gombe",
  "responsable_nom": "Jean Mukendi"
}

Collectes


Créer une collecte


POST /api/collectes



Route protégée par JWT.



L’identifiant de l’agent est récupéré automatiquement depuis le token.



Exemple :

{
  "site_id": "781d4e3f-903d-4779-9137-304202e99767",
  "client_id": "33fa1670-2318-45cb-9097-2b6dba9f4ad7",
  "type_dechet_id": "aca1e84d-bc23-45e2-b218-42e6b24aad98",
  "poids_estime": 40
}

Valider une collecte


PATCH /api/collectes/{id}/valider



Rôles autorisés :



admin

manager


Lots


Créer un lot


POST /api/lots



Rôles autorisés :



admin

manager



Exemple :

{
  "collecte_id": "e2b083ea-e8f7-414c-b227-7ca8b95c5df3",
  "type_dechet_id": "aca1e84d-bc23-45e2-b218-42e6b24aad98",
  "poids_reel": 38.5,
  "statut_lot": "en_stock"
}


Règles métier :



la collecte doit exister ;

elle doit être validée ;

le type de déchet doit correspondre ;

une collecte ne peut produire qu’un seul lot ;

le stock est mis à jour automatiquement ;

un mouvement ENTREE est créé.

Stocks


Consulter les stocks


GET /api/stocks



Route protégée par JWT.



L’utilisateur ne voit que les stocks de son organisation.



Ajouter manuellement au stock


POST /api/stocks



Rôles autorisés :



admin

manager



Cette route est surtout destinée aux opérations exceptionnelles.

Ventes


Créer une vente


POST /api/ventes



Rôles autorisés :



admin

manager



Exemple :

{
  "stock_id": "c51e4918-9457-4d9e-9ea7-86fe60823224",
  "quantite": 5,
  "prix_unitaire": 450,
  "acheteur_nom": "Eco Plast RDC",
  "reference_vente": "VTE-2026-003"
}

La transaction effectue automatiquement :

Création de la vente
→ Diminution du stock
→ Mouvement SORTIE
→ Calcul de l’impact carbone

Tableau de bord


Consulter le résumé


GET /api/dashboard



Route protégée par JWT.



Exemple de réponse :

{
  "success": true,
  "message": "Tableau de bord récupéré avec succès.",
  "data": {
    "stocks": {
      "nombre_types": 1,
      "quantite_totale": 18.5
    },
    "ventes": {
      "nombre": 3,
      "chiffre_affaires_total": 9000
    },
    "carbone": {
      "co2e_estime_total": 21.5
    }
  }
}


Codes HTTP principaux

200 OK
201 Created
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
500 Internal Server Error

Format des réponses de succès

{
  "success": true,
  "message": "Message de succès.",
  "data": {}
}

Format des erreurs

{
  "success": false,
  "error": "Message d’erreur."
}

Validation



Les requêtes sont validées avec express-validator.



Les principaux validateurs sont :



clientValidator

siteValidator

collecteValidator

lotValidator

venteValidator