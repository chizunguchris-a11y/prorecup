import pool
    from "../config/db.js";


class TerrainIncidentRepository {

    async trouverMission(
        missionId,
        agentId,
        organisationId,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                SELECT
                    m.*,

                    t.numero_interne
                        AS tricycle_numero,

                    t.statut
                        AS tricycle_statut,

                    t.etat
                        AS tricycle_etat

                FROM missions m

                JOIN tricycles t
                    ON t.id = m.tricycle_id

                WHERE m.id = $1
                  AND m.agent_id = $2
                  AND m.organisation_id = $3

                FOR UPDATE OF m;
                `,
                [
                    missionId,
                    agentId,
                    organisationId
                ]
            );


        return resultat.rows[0] || null;

    }


    async trouverCollecteMission(
        missionId,
        collecteId,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                SELECT
                    mc.collecte_id,
                    mc.ordre_collecte

                FROM missions_collectes mc

                WHERE mc.mission_id = $1
                  AND mc.collecte_id = $2

                LIMIT 1;
                `,
                [
                    missionId,
                    collecteId
                ]
            );


        return resultat.rows[0] || null;

    }


    async trouverOperation(
        operationId,
        organisationId,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                SELECT me.*

                FROM mission_evenements me

                JOIN missions m
                    ON m.id =
                        me.mission_id

                WHERE me.operation_id = $1
                  AND m.organisation_id = $2

                LIMIT 1;
                `,
                [
                    operationId,
                    organisationId
                ]
            );


        return resultat.rows[0] || null;

    }


    async creerIncident(
        donnees,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                INSERT INTO mission_evenements
                (
                    mission_id,
                    collecte_id,
                    type_evenement,
                    latitude,
                    longitude,
                    precision_gps,
                    observations,
                    cree_par,
                    operation_id,
                    survenu_le,
                    recu_le,
                    contexte
                )

                VALUES
                (
                    $1,
                    $2,
                    'incident_signale',
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8,
                    $9::timestamptz,
                    CURRENT_TIMESTAMP,
                    $10::jsonb
                )

                ON CONFLICT (operation_id)
                WHERE operation_id IS NOT NULL
                DO NOTHING

                RETURNING *;
                `,
                [
                    donnees.mission_id,

                    donnees.collecte_id ||
                        null,

                    donnees.latitude ??
                        null,

                    donnees.longitude ??
                        null,

                    donnees.precision_gps ??
                        null,

                    donnees.description,

                    donnees.cree_par,

                    donnees.operation_id,

                    donnees.survenu_le,

                    JSON.stringify(
                        donnees.contexte ||
                        {}
                    )
                ]
            );


        return resultat.rows[0] || null;

    }

}


export default new TerrainIncidentRepository();