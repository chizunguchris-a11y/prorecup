import pool
    from "../config/db.js";


class TerrainJourneeRepository {

    async listerMissions(
        agentId,
        organisationId,
        dateJour,
        connexion = pool
    ) {

        const resultat =
    await connexion.query(
        `
        SELECT
            m.id,
            m.organisation_id,
            m.agent_id,
            m.tricycle_id,

            m.date_prevue,
            m.heure_depart_prevue,
            m.heure_retour_prevue,

            m.heure_depart_reelle,
            m.heure_retour_reelle,

            m.statut,
            m.observations,
            m.cree_le,
            m.modifie_le,

            t.numero_interne
                AS tricycle_numero,

            t.plaque_identification
                AS tricycle_plaque,

            t.marque
                AS tricycle_marque,

            t.modele
                AS tricycle_modele,

            t.capacite_kg
                AS tricycle_capacite_kg,

            t.statut
                AS tricycle_statut,

            t.etat
                AS tricycle_etat

        FROM missions m

        JOIN tricycles t
            ON t.id =
                m.tricycle_id

        WHERE m.agent_id = $1
          AND m.organisation_id = $2
          AND m.statut <> 'annulee'

          AND
          (
              m.statut = 'en_cours'

              OR

              m.date_prevue = $3::date
          )

        ORDER BY

            CASE
                WHEN m.statut = 'en_cours'
                    THEN 0
                ELSE 1
            END ASC,

            m.date_prevue ASC,

            m.heure_depart_prevue ASC
                NULLS LAST,

            m.cree_le ASC;
        `,
        [
            agentId,
            organisationId,
            dateJour
        ]
    );


        return resultat.rows;

    }


    async listerCollectes(
        missionId,
        organisationId,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                SELECT
                    c.id,
                    c.site_id,
                    c.client_id,
                    c.type_dechet_id,

                    c.date_collecte,

                    c.poids_estime,
                    c.poids_reel,
                    c.poids_reel_saisi_le,

                    c.statut
                        AS statut_administratif,

                    c.resultat_terrain,
                    c.motif_terrain,

                    mc.ordre_collecte,

                    s.nom
                        AS site_nom,

                    s.adresse
                        AS site_adresse,

                    s.zone_geographique
                        AS site_zone_geographique,

                    s.responsable_nom
                        AS site_responsable_nom,

                    s.latitude
                        AS site_latitude,

                    s.longitude
                        AS site_longitude,

                    s.precision_gps_reference
                        AS site_precision_gps_reference,

                    s.rayon_validation_m
                        AS site_rayon_validation_m,

                    /*
                     * On ne suppose pas ici les
                     * colonnes exactes de clients
                     * et types_dechets.
                     *
                     * PostgreSQL nous renvoie
                     * l'objet existant tel quel.
                     */
                    to_jsonb(cl)
                        AS client,

                    to_jsonb(td)
                        AS type_dechet,

                    /*
                     * Historique opérationnel
                     * de CETTE collecte.
                     */
                    COALESCE(
                        (
                            SELECT
                                jsonb_agg(
                                    jsonb_build_object(
                                        'id',
                                            me.id,

                                        'type',
                                            me.type_evenement,

                                        'survenu_le',
                                            me.survenu_le,

                                        'recu_le',
                                            me.recu_le,

                                        'latitude',
                                            me.latitude,

                                        'longitude',
                                            me.longitude,

                                        'precision_gps',
                                            me.precision_gps,

                                        'observations',
                                            me.observations,

                                        'contexte',
                                            me.contexte
                                    )

                                    ORDER BY
                                        me.survenu_le ASC,
                                        me.cree_le ASC
                                )

                            FROM mission_evenements me

                            WHERE me.mission_id =
                                    mc.mission_id

                              AND me.collecte_id =
                                    c.id
                        ),
                        '[]'::jsonb
                    ) AS evenements,

                    /*
                     * Preuves déjà synchronisées.
                     * Pas d'URL signée ici :
                     * elle sera générée seulement
                     * quand l'utilisateur ouvre
                     * réellement une preuve.
                     */
                    COALESCE(
                        (
                            SELECT
                                jsonb_agg(
                                    jsonb_build_object(
                                        'id',
                                            p.id,

                                        'type_preuve',
                                            p.type_preuve,

                                        'mime_type',
                                            p.mime_type,

                                        'taille_octets',
                                            p.taille_octets,

                                        'hash_sha256',
                                            p.hash_sha256,

                                        'latitude',
                                            p.latitude,

                                        'longitude',
                                            p.longitude,

                                        'precision_gps',
                                            p.precision_gps,

                                        'pris_le',
                                            p.pris_le,

                                        'recu_le',
                                            p.recu_le,

                                        'cree_le',
                                            p.cree_le
                                    )

                                    ORDER BY
                                        p.pris_le ASC,
                                        p.cree_le ASC
                                )

                            FROM preuves_collecte p

                            WHERE p.organisation_id =
                                    $2

                              AND p.mission_id =
                                    mc.mission_id

                              AND p.collecte_id =
                                    c.id
                        ),
                        '[]'::jsonb
                    ) AS preuves,

                    COALESCE(
                        (
                            SELECT jsonb_agg(jsonb_build_object(
                                'id', p.id,
                                'type', p.type,
                                'poids_brut', p.poids_brut,
                                'tare', p.tare,
                                'poids_net', p.poids_net,
                                'date_heure', p.date_heure,
                                'balance_id', p.balance_id,
                                'remplace_pesee_id', p.remplace_pesee_id,
                                'est_courante', p.id = (
                                    SELECT px.id FROM pesees px
                                    WHERE px.collecte_id = p.collecte_id
                                      AND px.organisation_id = p.organisation_id
                                      AND px.type = p.type
                                    ORDER BY px.date_heure DESC, px.cree_le DESC, px.id DESC
                                    LIMIT 1
                                )
                            ) ORDER BY p.date_heure ASC, p.cree_le ASC)
                            FROM pesees p
                            WHERE p.organisation_id = $2
                              AND p.mission_id = mc.mission_id
                              AND p.collecte_id = c.id
                        ),
                        '[]'::jsonb
                    ) AS pesees

                FROM missions_collectes mc

                JOIN missions m
                    ON m.id =
                        mc.mission_id

                JOIN collectes c
                    ON c.id =
                        mc.collecte_id

                JOIN sites_de_collecte s
                    ON s.id =
                        c.site_id

                LEFT JOIN clients cl
                    ON cl.id =
                        c.client_id

                LEFT JOIN types_dechets td
                    ON td.id =
                        c.type_dechet_id

                WHERE mc.mission_id = $1
                  AND m.organisation_id = $2

                ORDER BY
                    mc.ordre_collecte ASC;
                `,
                [
                    missionId,
                    organisationId
                ]
            );


        return resultat.rows;

    }


    async listerIncidentsMission(
        missionId,
        organisationId,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                SELECT
                    me.id,
                    me.collecte_id,
                    me.latitude,
                    me.longitude,
                    me.precision_gps,
                    me.observations,
                    me.survenu_le,
                    me.recu_le,
                    me.contexte

                FROM mission_evenements me

                JOIN missions m
                    ON m.id =
                        me.mission_id

                WHERE me.mission_id = $1
                  AND m.organisation_id = $2
                  AND me.type_evenement =
                        'incident_signale'

                ORDER BY
                    me.survenu_le DESC;
                `,
                [
                    missionId,
                    organisationId
                ]
            );


        return resultat.rows;

    }

    async listerBalances(
        organisationId,
        connexion = pool
    ) {
        const resultat = await connexion.query(`
            SELECT id, numero_interne, type, capacite_max_kg, precision_kg,
                   statut, date_calibrage, prochain_calibrage, tricycle_id, site_id
            FROM balances
            WHERE organisation_id = $1 AND statut = 'active'
            ORDER BY numero_interne;
        `, [organisationId]);
        return resultat.rows;
    }

}


export default new TerrainJourneeRepository();
