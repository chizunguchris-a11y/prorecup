import pool
    from "../config/db.js";


class TerrainPreuveRepository {

    async trouverContexte(
        missionId,
        collecteId,
        agentId,
        organisationId,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                SELECT
                    m.id
                        AS mission_id,

                    m.statut
                        AS mission_statut,

                    m.heure_depart_reelle,
                    m.heure_retour_reelle,

                    m.agent_id,
                    m.organisation_id,

                    mc.collecte_id,
                    mc.ordre_collecte,

                    c.site_id,
                    c.type_dechet_id

                FROM missions m

                JOIN missions_collectes mc
                    ON mc.mission_id =
                        m.id

                JOIN collectes c
                    ON c.id =
                        mc.collecte_id

                WHERE m.id = $1
                  AND mc.collecte_id = $2
                  AND m.agent_id = $3
                  AND m.organisation_id = $4

                LIMIT 1;
                `,
                [
                    missionId,
                    collecteId,
                    agentId,
                    organisationId
                ]
            );


        return resultat.rows[0] || null;

    }


    async trouverParOperation(
        operationId,
        organisationId,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                SELECT *

                FROM preuves_collecte

                WHERE operation_id = $1
                  AND organisation_id = $2

                LIMIT 1;
                `,
                [
                    operationId,
                    organisationId
                ]
            );


        return resultat.rows[0] || null;

    }


    async creer(
        donnees,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                INSERT INTO preuves_collecte
                (
                    organisation_id,
                    mission_id,
                    collecte_id,
                    type_preuve,

                    storage_bucket,
                    storage_path,

                    mime_type,
                    taille_octets,
                    hash_sha256,

                    latitude,
                    longitude,
                    precision_gps,

                    pris_le,
                    recu_le,

                    cree_par,
                    operation_id
                )

                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,

                    $5,
                    $6,

                    $7,
                    $8,
                    $9,

                    $10,
                    $11,
                    $12,

                    $13::timestamptz,
                    CURRENT_TIMESTAMP,

                    $14,
                    $15
                )

                ON CONFLICT (operation_id)
                DO NOTHING

                RETURNING *;
                `,
                [
                    donnees.organisation_id,
                    donnees.mission_id,
                    donnees.collecte_id,
                    donnees.type_preuve,

                    donnees.storage_bucket,
                    donnees.storage_path,

                    donnees.mime_type,
                    donnees.taille_octets,
                    donnees.hash_sha256,

                    donnees.latitude,
                    donnees.longitude,
                    donnees.precision_gps,

                    donnees.pris_le,

                    donnees.cree_par,
                    donnees.operation_id
                ]
            );


        return resultat.rows[0] || null;

    }

    async trouverPourAgent(
        preuveId,
        missionId,
        collecteId,
        agentId,
        organisationId,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                SELECT
                    p.*

                FROM preuves_collecte p

                JOIN missions m
                    ON m.id =
                        p.mission_id

                WHERE p.id = $1
                  AND p.mission_id = $2
                  AND p.collecte_id = $3
                  AND p.organisation_id = $4
                  AND m.agent_id = $5

                LIMIT 1;
                `,
                [
                    preuveId,
                    missionId,
                    collecteId,
                    organisationId,
                    agentId
                ]
            );


        return resultat.rows[0] || null;

    }

}


export default new TerrainPreuveRepository();