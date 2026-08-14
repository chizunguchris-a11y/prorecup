import pool from "../config/db.js";

class TricycleRepository {

    async creer(
        tricycle,
        connexion = pool
    ) {

        const requete = `
            INSERT INTO tricycles
            (
                organisation_id,
                numero_interne,
                plaque_identification,
                marque,
                modele,
                capacite_kg,
                statut,
                etat,
                date_mise_en_service,
                observations
            )
            VALUES
            (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9, $10
            )
            RETURNING *;
        `;

        const valeurs = [
            tricycle.organisation_id,
            tricycle.numero_interne,
            tricycle.plaque_identification || null,
            tricycle.marque || null,
            tricycle.modele || null,
            tricycle.capacite_kg,
            tricycle.statut || "disponible",
            tricycle.etat || "bon",
            tricycle.date_mise_en_service || null,
            tricycle.observations || null
        ];

        const resultat =
            await connexion.query(
                requete,
                valeurs
            );

        return resultat.rows[0];

    }

    async listerParOrganisation(
        organisationId,
        connexion = pool
    ) {

        const requete = `
            SELECT
                id,
                organisation_id,
                numero_interne,
                plaque_identification,
                marque,
                modele,
                capacite_kg,
                statut,
                etat,
                date_mise_en_service,
                observations,
                cree_le,
                modifie_le
            FROM tricycles
            WHERE organisation_id = $1
            ORDER BY numero_interne ASC;
        `;

        const resultat =
            await connexion.query(
                requete,
                [organisationId]
            );

        return resultat.rows;

    }

    async trouverParIdPourOrganisation(
        id,
        organisationId,
        connexion = pool
    ) {

        const requete = `
            SELECT
                id,
                organisation_id,
                numero_interne,
                plaque_identification,
                marque,
                modele,
                capacite_kg,
                statut,
                etat,
                date_mise_en_service,
                observations,
                cree_le,
                modifie_le
            FROM tricycles
            WHERE id = $1
              AND organisation_id = $2;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    id,
                    organisationId
                ]
            );

        return resultat.rows[0];

    }

    async trouverParNumeroInterne(
        numeroInterne,
        organisationId,
        connexion = pool
    ) {

        const requete = `
            SELECT *
            FROM tricycles
            WHERE numero_interne = $1
              AND organisation_id = $2;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    numeroInterne,
                    organisationId
                ]
            );

        return resultat.rows[0];

    }

    async trouverParPlaque(
        plaqueIdentification,
        organisationId,
        connexion = pool
    ) {

        const requete = `
            SELECT *
            FROM tricycles
            WHERE plaque_identification = $1
              AND organisation_id = $2;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    plaqueIdentification,
                    organisationId
                ]
            );

        return resultat.rows[0];

    }

    async modifier(
        id,
        organisationId,
        tricycle,
        connexion = pool
    ) {

        const requete = `
            UPDATE tricycles
            SET
                numero_interne = $1,
                plaque_identification = $2,
                marque = $3,
                modele = $4,
                capacite_kg = $5,
                etat = $6,
                date_mise_en_service = $7,
                observations = $8,
                modifie_le = CURRENT_TIMESTAMP
            WHERE id = $9
              AND organisation_id = $10
            RETURNING *;
        `;

        const valeurs = [
            tricycle.numero_interne,
            tricycle.plaque_identification || null,
            tricycle.marque || null,
            tricycle.modele || null,
            tricycle.capacite_kg,
            tricycle.etat,
            tricycle.date_mise_en_service || null,
            tricycle.observations || null,
            id,
            organisationId
        ];

        const resultat =
            await connexion.query(
                requete,
                valeurs
            );

        return resultat.rows[0];

    }

    async modifierStatut(
        id,
        organisationId,
        statut,
        connexion = pool
    ) {

        const requete = `
            UPDATE tricycles
            SET
                statut = $1,
                modifie_le = CURRENT_TIMESTAMP
            WHERE id = $2
              AND organisation_id = $3
            RETURNING *;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    statut,
                    id,
                    organisationId
                ]
            );

        return resultat.rows[0];

    }

}

export default new TricycleRepository();
