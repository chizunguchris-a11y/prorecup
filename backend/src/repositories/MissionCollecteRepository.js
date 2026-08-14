import pool from "../config/db.js";

class MissionCollecteRepository {

    async trouverMissionParIdPourOrganisation(
        missionId,
        organisationId,
        connexion = pool
    ) {

        const requete = `
            SELECT *
            FROM missions
            WHERE id = $1
              AND organisation_id = $2;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    missionId,
                    organisationId
                ]
            );

        return resultat.rows[0];

    }

    async trouverCollectePourOrganisation(
        collecteId,
        organisationId,
        connexion = pool
    ) {

        const requete = `
            SELECT
                c.*,
                cl.organisation_id
            FROM collectes c

            JOIN clients cl
                ON cl.id = c.client_id

            JOIN sites_de_collecte s
                ON s.id = c.site_id

            WHERE c.id = $1
              AND cl.organisation_id = $2
              AND s.organisation_id = $2;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    collecteId,
                    organisationId
                ]
            );

        return resultat.rows[0];

    }

    async trouverAffectationActiveParCollecte(
        collecteId,
        connexion = pool
    ) {

        const requete = `
            SELECT
                mc.mission_id,
                mc.collecte_id,
                m.statut AS mission_statut
            FROM missions_collectes mc

            JOIN missions m
                ON m.id = mc.mission_id

            WHERE mc.collecte_id = $1
              AND m.statut IN (
                  'planifiee',
                  'en_cours'
              )

            LIMIT 1;
        `;

        const resultat =
            await connexion.query(
                requete,
                [collecteId]
            );

        return resultat.rows[0];

    }

    async trouverAssociation(
        missionId,
        collecteId,
        connexion = pool
    ) {

        const requete = `
            SELECT *
            FROM missions_collectes
            WHERE mission_id = $1
              AND collecte_id = $2;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    missionId,
                    collecteId
                ]
            );

        return resultat.rows[0];

    }

    async ajouter(
        missionId,
        collecteId,
        ordreCollecte,
        connexion = pool
    ) {

        const requete = `
            INSERT INTO missions_collectes
            (
                mission_id,
                collecte_id,
                ordre_collecte
            )
            VALUES ($1, $2, $3)
            RETURNING *;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    missionId,
                    collecteId,
                    ordreCollecte
                ]
            );

        return resultat.rows[0];

    }

    async listerParMission(
        missionId,
        organisationId,
        connexion = pool
    ) {

        const requete = `
            SELECT
                mc.mission_id,
                mc.collecte_id,
                mc.ordre_collecte,
                mc.cree_le,

                c.statut AS statut_collecte,
                c.poids_estime,
                c.type_dechet_id,

                cl.nom AS client_nom,

                s.nom AS site_nom,
                s.adresse AS site_adresse,
                s.zone_geographique,

                td.nom AS type_dechet

            FROM missions_collectes mc

            JOIN missions m
                ON m.id = mc.mission_id

            JOIN collectes c
                ON c.id = mc.collecte_id

            JOIN clients cl
                ON cl.id = c.client_id

            JOIN sites_de_collecte s
                ON s.id = c.site_id

            JOIN types_dechets td
                ON td.id = c.type_dechet_id

            WHERE mc.mission_id = $1
              AND m.organisation_id = $2
              AND cl.organisation_id = $2
              AND s.organisation_id = $2

            ORDER BY
                mc.ordre_collecte ASC NULLS LAST,
                mc.cree_le ASC;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    missionId,
                    organisationId
                ]
            );

        return resultat.rows;

    }

    async modifierOrdre(
        missionId,
        collecteId,
        ordreCollecte,
        connexion = pool
    ) {

        const requete = `
            UPDATE missions_collectes
            SET ordre_collecte = $1
            WHERE mission_id = $2
              AND collecte_id = $3
            RETURNING *;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    ordreCollecte,
                    missionId,
                    collecteId
                ]
            );

        return resultat.rows[0];

    }

    async retirer(
        missionId,
        collecteId,
        connexion = pool
    ) {

        const requete = `
            DELETE FROM missions_collectes
            WHERE mission_id = $1
              AND collecte_id = $2
            RETURNING *;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    missionId,
                    collecteId
                ]
            );

        return resultat.rows[0];

    }

}

export default new MissionCollecteRepository();