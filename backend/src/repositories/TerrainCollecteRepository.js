import pool
    from "../config/db.js";


class TerrainCollecteRepository {

    async trouverContexteArrivee(
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
                    m.id AS mission_id,
                    m.statut AS mission_statut,
                    m.agent_id,
                    m.organisation_id,

                    mc.collecte_id,
                    mc.ordre_collecte,

                    c.statut AS collecte_statut,
                    c.site_id,
                    c.client_id,
                    c.type_dechet_id,
                    c.poids_estime,
                    c.poids_reel,

                    s.nom AS site_nom,
                    s.adresse AS site_adresse,
                    s.zone_geographique AS site_zone,

                    s.latitude
                        AS site_latitude,

                    s.longitude
                        AS site_longitude,

                    s.precision_gps_reference
                        AS site_precision_gps_reference,

                    s.rayon_validation_m
                        AS site_rayon_validation_m

                FROM missions m

                JOIN missions_collectes mc
                    ON mc.mission_id = m.id

                JOIN collectes c
                    ON c.id = mc.collecte_id

                LEFT JOIN sites_de_collecte s
                    ON s.id = c.site_id

                WHERE m.id = $1
                  AND mc.collecte_id = $2
                  AND m.agent_id = $3
                  AND m.organisation_id = $4

                FOR UPDATE OF m, mc;
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


    async trouverArriveeExistante(
        missionId,
        collecteId,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                SELECT *

                FROM mission_evenements

                WHERE mission_id = $1
                  AND collecte_id = $2
                  AND type_evenement =
                    'arrivee_site'

                LIMIT 1;
                `,
                [
                    missionId,
                    collecteId
                ]
            );


        return resultat.rows[0] || null;

    }


    async creerArrivee(
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
                    'arrivee_site',
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
                    donnees.collecte_id,
                    donnees.latitude,
                    donnees.longitude,
                    donnees.precision_gps ??
                        null,
                    donnees.observations ||
                        null,
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

    async trouverEvenementCollecte(
        missionId,
        collecteId,
        typeEvenement,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                SELECT *

                FROM mission_evenements

                WHERE mission_id = $1
                  AND collecte_id = $2
                  AND type_evenement = $3

                LIMIT 1;
                `,
                [
                    missionId,
                    collecteId,
                    typeEvenement
                ]
            );


        return resultat.rows[0] || null;

    }


    async trouverCollectePrecedenteNonTerminee(
        missionId,
        collecteId,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                WITH collectes_ordonnees AS
                (
                    SELECT
                        mc.collecte_id,

                        ROW_NUMBER() OVER
                        (
                            ORDER BY
                                mc.ordre_collecte ASC
                                    NULLS LAST,

                                mc.cree_le ASC,

                                mc.collecte_id ASC
                        ) AS position

                    FROM missions_collectes mc

                    WHERE mc.mission_id = $1
                ),

                collecte_cible AS
                (
                    SELECT position

                    FROM collectes_ordonnees

                    WHERE collecte_id = $2
                )

                SELECT
                    precedente.collecte_id,
                    precedente.position

                FROM collectes_ordonnees precedente

                CROSS JOIN collecte_cible cible

                WHERE precedente.position <
                    cible.position

                  AND NOT EXISTS
                  (
                      SELECT 1

                      FROM mission_evenements me

                      WHERE me.mission_id = $1

                        AND me.collecte_id =
                            precedente.collecte_id

                        AND me.type_evenement =
                            'collecte_terminee'
                  )

                ORDER BY
                    precedente.position ASC

                LIMIT 1;
                `,
                [
                    missionId,
                    collecteId
                ]
            );


        return resultat.rows[0] || null;

    }


    async trouverAutreCollecteActive(
        missionId,
        collecteId,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                SELECT
                    debut.collecte_id

                FROM mission_evenements debut

                WHERE debut.mission_id = $1

                  AND debut.collecte_id
                        IS NOT NULL

                  AND debut.collecte_id <> $2

                  AND debut.type_evenement =
                        'collecte_demarree'

                  AND NOT EXISTS
                  (
                      SELECT 1

                      FROM mission_evenements fin

                      WHERE fin.mission_id =
                            debut.mission_id

                        AND fin.collecte_id =
                            debut.collecte_id

                        AND fin.type_evenement =
                            'collecte_terminee'
                  )

                LIMIT 1;
                `,
                [
                    missionId,
                    collecteId
                ]
            );


        return resultat.rows[0] || null;

    }


    async creerDemarrageCollecte(
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
                    'collecte_demarree',
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
                    donnees.collecte_id,

                    donnees.latitude ??
                        null,

                    donnees.longitude ??
                        null,

                    donnees.precision_gps ??
                        null,

                    donnees.observations ||
                        null,

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

    async enregistrerResultatTerrain(
        collecteId,
        poidsReel,
        resultatTerrain,
        motifTerrain,
        utilisateurId,
        survenuLe,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                UPDATE collectes

                SET
                    poids_reel = $1,

                    poids_reel_saisi_le =
                        $2::timestamptz,

                    poids_reel_saisi_par =
                        $3,

                    resultat_terrain =
                        $4,

                    motif_terrain =
                        $5

                WHERE id = $6

                RETURNING *;
                `,
                [
                    poidsReel,
                    survenuLe,
                    utilisateurId,
                    resultatTerrain,
                    motifTerrain || null,
                    collecteId
                ]
            );


        return resultat.rows[0] || null;

    }


    async creerFinCollecte(
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
                    'collecte_terminee',
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
                    donnees.collecte_id,

                    donnees.latitude ??
                        null,

                    donnees.longitude ??
                        null,

                    donnees.precision_gps ??
                        null,

                    donnees.observations ||
                        null,

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


export default new TerrainCollecteRepository();