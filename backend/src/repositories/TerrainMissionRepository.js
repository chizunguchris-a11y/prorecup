import pool
    from "../config/db.js";


class TerrainMissionRepository {

    async trouverMissionPourDemarrage(
        missionId,
        agentId,
        organisationId,
        connexion = pool
    ) {

        const requete = `
            SELECT
                m.*,

                a.statut
                    AS agent_statut,

                a.disponible
                    AS agent_disponible,

                t.statut
                    AS tricycle_statut,

                t.etat
                    AS tricycle_etat,

                t.numero_interne
                    AS tricycle_numero

            FROM missions m

            JOIN agents a
                ON a.id = m.agent_id

            JOIN tricycles t
                ON t.id = m.tricycle_id

            WHERE m.id = $1
              AND m.agent_id = $2
              AND m.organisation_id = $3

            FOR UPDATE OF m, a, t;
        `;


        const resultat =
            await connexion.query(
                requete,
                [
                    missionId,
                    agentId,
                    organisationId
                ]
            );


        return resultat.rows[0] || null;

    }


    async compterCollectesMission(
        missionId,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                SELECT
                    COUNT(*)::integer
                        AS nombre

                FROM missions_collectes

                WHERE mission_id = $1;
                `,
                [
                    missionId
                ]
            );


        return Number(
            resultat.rows[0]
                ?.nombre || 0
        );

    }


    async trouverOperation(
        operationId,
        organisationId,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                SELECT
                    me.*

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


    async rendreAgentIndisponible(
        agentId,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                UPDATE agents

                SET
                    disponible = false,
                    modifie_le =
                        CURRENT_TIMESTAMP

                WHERE id = $1

                RETURNING *;
                `,
                [
                    agentId
                ]
            );


        return resultat.rows[0] || null;

    }


    async mettreTricycleEnMission(
        tricycleId,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                UPDATE tricycles

                SET
                    statut = 'en_mission',
                    modifie_le =
                        CURRENT_TIMESTAMP

                WHERE id = $1

                RETURNING *;
                `,
                [
                    tricycleId
                ]
            );


        return resultat.rows[0] || null;

    }


    async demarrerMission(
        missionId,
        organisationId,
        survenuLe,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                UPDATE missions

                SET
                    statut = 'en_cours',

                    heure_depart_reelle =
                        COALESCE(
                            heure_depart_reelle,
                            $3::timestamptz
                        ),

                    modifie_le =
                        CURRENT_TIMESTAMP

                WHERE id = $1
                  AND organisation_id = $2

                RETURNING *;
                `,
                [
                    missionId,
                    organisationId,
                    survenuLe
                ]
            );


        return resultat.rows[0] || null;

    }


    async creerEvenementDemarrage(
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
                    NULL,
                    'mission_demarree',
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8::timestamptz,
                    CURRENT_TIMESTAMP,
                    $9::jsonb
                )

                RETURNING *;
                `,
                [
                    donnees.mission_id,

                    donnees.latitude ??
                        null,

                    donnees.longitude ??
                        null,

                    donnees.precision_gps ??
                        null,

                    donnees.observations ||
                        "Mission démarrée depuis l'application Terrain.",

                    donnees.cree_par,

                    donnees.operation_id,

                    donnees.survenu_le,

                    JSON.stringify(
                        donnees.contexte ||
                        {}
                    )
                ]
            );


        return resultat.rows[0];

    }

    async trouverMissionPourFin(
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

                    a.statut
                        AS agent_statut,

                    a.disponible
                        AS agent_disponible,

                    t.statut
                        AS tricycle_statut,

                    t.etat
                        AS tricycle_etat,

                    t.numero_interne
                        AS tricycle_numero

                FROM missions m

                JOIN agents a
                    ON a.id = m.agent_id

                JOIN utilisateurs u
                    ON u.id = a.utilisateur_id
                   AND u.organisation_id =
                       m.organisation_id

                JOIN tricycles t
                    ON t.id = m.tricycle_id

                WHERE m.id = $1
                  AND m.agent_id = $2
                  AND m.organisation_id = $3

                FOR UPDATE OF m, a, t;
                `,
                [
                    missionId,
                    agentId,
                    organisationId
                ]
            );


        return resultat.rows[0] || null;

    }


    async compterCollectesNonTerminees(
        missionId,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                SELECT
                    COUNT(*)::integer
                        AS nombre

                FROM missions_collectes mc

                WHERE mc.mission_id = $1

                  AND NOT EXISTS
                  (
                      SELECT 1

                      FROM mission_evenements me

                      WHERE me.mission_id =
                            mc.mission_id

                        AND me.collecte_id =
                            mc.collecte_id

                        AND me.type_evenement =
                            'collecte_terminee'
                  );
                `,
                [
                    missionId
                ]
            );


        return Number(
            resultat.rows[0]
                ?.nombre || 0
        );

    }


    async rendreAgentDisponible(
        agentId,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                UPDATE agents

                SET
                    disponible = true,
                    modifie_le =
                        CURRENT_TIMESTAMP

                WHERE id = $1
                  AND statut = 'actif'

                RETURNING *;
                `,
                [
                    agentId
                ]
            );


        return resultat.rows[0] || null;

    }


    async libererTricycle(
        tricycleId,
        etatTricycle,
        connexion = pool
    ) {

        const nouveauStatut =
            etatTricycle === "mauvais"
                ? "en_panne"
                : "disponible";


        const resultat =
            await connexion.query(
                `
                UPDATE tricycles

                SET
                    statut = $1,
                    modifie_le =
                        CURRENT_TIMESTAMP

                WHERE id = $2

                RETURNING *;
                `,
                [
                    nouveauStatut,
                    tricycleId
                ]
            );


        return resultat.rows[0] || null;

    }


    async terminerMission(
        missionId,
        organisationId,
        survenuLe,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                UPDATE missions

                SET
                    statut = 'terminee',

                    heure_retour_reelle =
                        COALESCE(
                            heure_retour_reelle,
                            $3::timestamptz
                        ),

                    modifie_le =
                        CURRENT_TIMESTAMP

                WHERE id = $1
                  AND organisation_id = $2

                RETURNING *;
                `,
                [
                    missionId,
                    organisationId,
                    survenuLe
                ]
            );


        return resultat.rows[0] || null;

    }


    async creerEvenementFinMission(
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
                    NULL,
                    'mission_terminee',
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8::timestamptz,
                    CURRENT_TIMESTAMP,
                    $9::jsonb
                )

                ON CONFLICT (operation_id)
                WHERE operation_id IS NOT NULL
                DO NOTHING

                RETURNING *;
                `,
                [
                    donnees.mission_id,

                    donnees.latitude ??
                        null,

                    donnees.longitude ??
                        null,

                    donnees.precision_gps ??
                        null,

                    donnees.observations ||
                        "Mission terminée depuis l'application Terrain.",

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


export default new TerrainMissionRepository();