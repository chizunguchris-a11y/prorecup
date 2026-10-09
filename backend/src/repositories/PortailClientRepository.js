import pool
    from "../config/db.js";

class PortailClientRepository {

    async trouverUtilisateur(
        utilisateurId,
        organisationId,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                    SELECT
                        u.id AS utilisateur_id,
                        u.nom AS utilisateur_nom,
                        u.email AS utilisateur_email,
                        u.telephone
                            AS utilisateur_telephone,
                        u.photo_url
                            AS utilisateur_photo_url,
                        u.organisation_id,
                        u.actif
                            AS utilisateur_actif,

                        r.id AS role_id,
                        r.nom AS role_nom,
                        r.actif AS role_actif

                    FROM utilisateurs u

                    JOIN roles r
                      ON r.id = u.role_id

                    WHERE u.id = $1
                      AND u.organisation_id = $2

                    LIMIT 1;
                `,
                [
                    utilisateurId,
                    organisationId
                ]
            );

        return resultat.rows[0];

    }


    async listerClientsAutorises(
        utilisateurId,
        organisationId,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                    SELECT
                        cu.id AS liaison_id,
                        cu.actif AS liaison_active,

                        c.id AS client_id,
                        c.nom AS client_nom,
                        c.type_client,
                        c.secteur_activite,
                        c.contact_email,
                        c.contact_telephone,
                        c.adresse_siege,
                        c.organisation_id

                    FROM client_utilisateurs cu

                    JOIN clients c
                      ON c.id = cu.client_id
                     AND c.organisation_id =
                         cu.organisation_id

                    WHERE cu.utilisateur_id = $1
                      AND cu.organisation_id = $2
                      AND cu.actif = TRUE

                    ORDER BY
                        c.nom ASC,
                        c.id ASC;
                `,
                [
                    utilisateurId,
                    organisationId
                ]
            );

        return resultat.rows;

    }


    async listerSitesAutorises(
        utilisateurId,
        organisationId,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                    SELECT
                        s.id AS site_id,
                        s.nom AS site_nom,
                        s.adresse,
                        s.zone_geographique,
                        s.responsable_nom,
                        s.cree_le AS date_creation,
                        s.latitude,
                        s.longitude,
                        s.precision_gps_reference,
                        s.rayon_validation_m,
                        s.organisation_id,

                        jsonb_agg(
                            jsonb_build_object(
                                'client_id',
                                c.id,
                                'client_nom',
                                c.nom,
                                'type_client',
                                c.type_client
                            )
                            ORDER BY
                                c.nom ASC,
                                c.id ASC
                        ) AS clients_autorises

                    FROM client_utilisateurs cu

                    JOIN clients c
                      ON c.id = cu.client_id
                     AND c.organisation_id =
                         cu.organisation_id

                    JOIN client_sites cs
                      ON cs.client_id = c.id
                     AND cs.organisation_id =
                         cu.organisation_id
                     AND cs.actif = TRUE

                    JOIN sites_de_collecte s
                      ON s.id = cs.site_id
                     AND s.organisation_id =
                         cs.organisation_id

                    WHERE cu.utilisateur_id = $1
                      AND cu.organisation_id = $2
                      AND cu.actif = TRUE

                    GROUP BY
                        s.id,
                        s.nom,
                        s.adresse,
                        s.zone_geographique,
                        s.responsable_nom,
                        s.cree_le,
                        s.latitude,
                        s.longitude,
                        s.precision_gps_reference,
                        s.rayon_validation_m,
                        s.organisation_id

                    ORDER BY
                        s.nom ASC,
                        s.id ASC;
                `,
                [
                    utilisateurId,
                    organisationId
                ]
            );

        return resultat.rows;

    }

    async listerCollectesAutorisees(
        utilisateurId,
        organisationId,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                    SELECT
                        co.id AS collecte_id,
                        co.client_id,
                        c.nom AS client_nom,
                        c.type_client,

                        co.site_id,
                        s.nom AS site_nom,
                        s.adresse AS site_adresse,
                        s.zone_geographique,

                        co.type_dechet_id,
                        td.nom AS type_dechet,

                        co.agent_id,
                        u.nom AS agent_nom,

                        co.date_collecte,
                        co.poids_estime,
                        co.poids_reel,
                        co.statut,
                        co.resultat_terrain,
                        co.motif_terrain,

                        COUNT(
                            DISTINCT pc.id
                        )::integer
                            AS nombre_preuves

                    FROM client_utilisateurs cu

                    JOIN clients c
                      ON c.id = cu.client_id
                     AND c.organisation_id =
                         cu.organisation_id

                    JOIN collectes co
                      ON co.client_id = c.id

                    JOIN sites_de_collecte s
                      ON s.id = co.site_id
                     AND s.organisation_id =
                         cu.organisation_id

                    LEFT JOIN types_dechets td
                      ON td.id = co.type_dechet_id

                    LEFT JOIN utilisateurs u
                      ON u.id = co.agent_id

                    LEFT JOIN preuves_collecte pc
                      ON pc.collecte_id = co.id
                     AND pc.organisation_id =
                         cu.organisation_id

                    WHERE cu.utilisateur_id = $1
                      AND cu.organisation_id = $2
                      AND cu.actif = TRUE

                    GROUP BY
                        co.id,
                        co.client_id,
                        c.nom,
                        c.type_client,
                        co.site_id,
                        s.nom,
                        s.adresse,
                        s.zone_geographique,
                        co.type_dechet_id,
                        td.nom,
                        co.agent_id,
                        u.nom,
                        co.date_collecte,
                        co.poids_estime,
                        co.poids_reel,
                        co.statut,
                        co.resultat_terrain,
                        co.motif_terrain

                    ORDER BY
                        co.date_collecte DESC,
                        co.id DESC;
                `,
                [
                    utilisateurId,
                    organisationId
                ]
            );

        return resultat.rows;

    }

    async obtenirImpactAutorise(
        utilisateurId,
        organisationId,
        connexion = pool
    ) {

        const requete = [

            "WITH clients_autorises AS (",

            "    SELECT DISTINCT",
            "        c.id AS client_id,",
            "        c.nom AS client_nom,",
            "        c.type_client,",
            "        c.organisation_id",

            "    FROM client_utilisateurs cu",

            "    JOIN clients c",
            "      ON c.id = cu.client_id",
            "     AND c.organisation_id = cu.organisation_id",

            "    WHERE cu.utilisateur_id = $1",
            "      AND cu.organisation_id = $2",
            "      AND cu.actif = TRUE",

            "),",

            "collectes_autorisees AS (",

            "    SELECT",
            "        co.id AS collecte_id,",
            "        ca.client_id,",
            "        ca.client_nom,",
            "        ca.type_client,",
            "        s.id AS site_id,",
            "        s.nom AS site_nom,",
            "        co.type_dechet_id,",
            "        COALESCE(td.nom, 'Non renseigne') AS type_dechet,",
            "        co.date_collecte,",
            "        co.poids_reel,",
            "        co.statut,",
            "        co.resultat_terrain,",

            "        EXISTS (",
            "            SELECT 1",
            "            FROM preuves_collecte pc",
            "            WHERE pc.collecte_id = co.id",
            "              AND pc.organisation_id = ca.organisation_id",
            "        ) AS documentee",

            "    FROM clients_autorises ca",

            "    JOIN collectes co",
            "      ON co.client_id = ca.client_id",

            "    JOIN sites_de_collecte s",
            "      ON s.id = co.site_id",
            "     AND s.organisation_id = ca.organisation_id",

            "    LEFT JOIN types_dechets td",
            "      ON td.id = co.type_dechet_id",

            "),",

            "collectes_mesurees AS (",

            "    SELECT *",

            "    FROM collectes_autorisees",

            "    WHERE poids_reel IS NOT NULL",
            "      AND poids_reel > 0",

            "      AND LOWER(COALESCE(statut, ''))",
            "          NOT IN ('annule', 'annulee', 'echec')",

            "      AND LOWER(COALESCE(resultat_terrain, ''))",
            "          <> 'echec'",

            "),",

            "resume AS (",

            "    SELECT",

            "        (",
            "            SELECT COUNT(*)::integer",
            "            FROM collectes_autorisees",
            "        ) AS collectes_total,",

            "        COUNT(*)::integer",
            "            AS collectes_mesurees,",

            "        COUNT(*) FILTER (",
            "            WHERE documentee = TRUE",
            "        )::integer",
            "            AS collectes_documentees,",

            "        COALESCE(",
            "            SUM(poids_reel),",
            "            0",
            "        ) AS poids_reel_kg,",

            "        COALESCE(",
            "            SUM(poids_reel) FILTER (",
            "                WHERE documentee = TRUE",
            "            ),",
            "            0",
            "        ) AS poids_documente_kg,",

            "        COUNT(DISTINCT site_id) FILTER (",
            "            WHERE site_id IS NOT NULL",
            "        )::integer",
            "            AS sites_concernes,",

            "        COUNT(DISTINCT type_dechet_id) FILTER (",
            "            WHERE type_dechet_id IS NOT NULL",
            "        )::integer",
            "            AS matieres_distinctes,",

            "        (",
            "            SELECT COUNT(*)::integer",
            "            FROM clients_autorises",
            "        ) AS clients_couverts",

            "    FROM collectes_mesurees",

            "),",

            "matieres AS (",

            "    SELECT",
            "        type_dechet_id,",
            "        type_dechet,",
            "        COUNT(*)::integer AS nombre_collectes,",
            "        SUM(poids_reel) AS poids_reel_kg,",

            "        COALESCE(",
            "            SUM(poids_reel) FILTER (",
            "                WHERE documentee = TRUE",
            "            ),",
            "            0",
            "        ) AS poids_documente_kg",

            "    FROM collectes_mesurees",

            "    GROUP BY",
            "        type_dechet_id,",
            "        type_dechet",

            "),",

            "evolution AS (",

            "    SELECT",
            "        DATE_TRUNC('month', date_collecte) AS mois,",
            "        COUNT(*)::integer AS nombre_collectes,",
            "        SUM(poids_reel) AS poids_reel_kg,",

            "        COALESCE(",
            "            SUM(poids_reel) FILTER (",
            "                WHERE documentee = TRUE",
            "            ),",
            "            0",
            "        ) AS poids_documente_kg",

            "    FROM collectes_mesurees",

            "    WHERE date_collecte IS NOT NULL",

            "    GROUP BY",
            "        DATE_TRUNC('month', date_collecte)",

            "),",

            "par_client AS (",

            "    SELECT",
            "        client_id,",
            "        client_nom,",
            "        type_client,",
            "        COUNT(*)::integer AS nombre_collectes,",
            "        SUM(poids_reel) AS poids_reel_kg,",

            "        COALESCE(",
            "            SUM(poids_reel) FILTER (",
            "                WHERE documentee = TRUE",
            "            ),",
            "            0",
            "        ) AS poids_documente_kg",

            "    FROM collectes_mesurees",

            "    GROUP BY",
            "        client_id,",
            "        client_nom,",
            "        type_client",

            ")",

            "SELECT",

            "    jsonb_build_object(",
            "        'collectes_total',",
            "            r.collectes_total,",
            "        'collectes_mesurees',",
            "            r.collectes_mesurees,",
            "        'collectes_documentees',",
            "            r.collectes_documentees,",
            "        'poids_reel_kg',",
            "            r.poids_reel_kg,",
            "        'poids_documente_kg',",
            "            r.poids_documente_kg,",
            "        'taux_documentation_poids_pct',",
            "            CASE",
            "                WHEN r.poids_reel_kg > 0",
            "                THEN ROUND(",
            "                    (",
            "                        r.poids_documente_kg",
            "                        / r.poids_reel_kg",
            "                    ) * 100,",
            "                    2",
            "                )",
            "                ELSE 0",
            "            END,",
            "        'sites_concernes',",
            "            r.sites_concernes,",
            "        'matieres_distinctes',",
            "            r.matieres_distinctes,",
            "        'clients_couverts',",
            "            r.clients_couverts",
            "    ) AS resume,",

            "    COALESCE(",
            "        (",
            "            SELECT jsonb_agg(",
            "                jsonb_build_object(",
            "                    'type_dechet_id', m.type_dechet_id,",
            "                    'type_dechet', m.type_dechet,",
            "                    'nombre_collectes', m.nombre_collectes,",
            "                    'poids_reel_kg', m.poids_reel_kg,",
            "                    'poids_documente_kg', m.poids_documente_kg",
            "                )",
            "                ORDER BY",
            "                    m.poids_reel_kg DESC,",
            "                    m.type_dechet ASC",
            "            )",
            "            FROM matieres m",
            "        ),",
            "        '[]'::jsonb",
            "    ) AS repartition_matieres,",

            "    COALESCE(",
            "        (",
            "            SELECT jsonb_agg(",
            "                jsonb_build_object(",
            "                    'periode', TO_CHAR(e.mois, 'YYYY-MM'),",
            "                    'date_debut', e.mois,",
            "                    'nombre_collectes', e.nombre_collectes,",
            "                    'poids_reel_kg', e.poids_reel_kg,",
            "                    'poids_documente_kg', e.poids_documente_kg",
            "                )",
            "                ORDER BY e.mois ASC",
            "            )",
            "            FROM evolution e",
            "        ),",
            "        '[]'::jsonb",
            "    ) AS evolution_mensuelle,",

            "    COALESCE(",
            "        (",
            "            SELECT jsonb_agg(",
            "                jsonb_build_object(",
            "                    'client_id', p.client_id,",
            "                    'client_nom', p.client_nom,",
            "                    'type_client', p.type_client,",
            "                    'nombre_collectes', p.nombre_collectes,",
            "                    'poids_reel_kg', p.poids_reel_kg,",
            "                    'poids_documente_kg', p.poids_documente_kg",
            "                )",
            "                ORDER BY",
            "                    p.client_nom ASC,",
            "                    p.client_id ASC",
            "            )",
            "            FROM par_client p",
            "        ),",
            "        '[]'::jsonb",
            "    ) AS par_client",

            "FROM resume r;"

        ].join("\n");


        const resultat =
            await connexion.query(
                requete,
                [
                    utilisateurId,
                    organisationId
                ]
            );


        return resultat.rows[0];

    }


    async trouverCollecteAutorisee(
        utilisateurId,
        organisationId,
        collecteId,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                    SELECT
                        co.id AS collecte_id,
                        co.client_id,
                        c.nom AS client_nom,
                        c.type_client,

                        co.site_id,
                        s.nom AS site_nom,
                        s.adresse AS site_adresse,
                        s.zone_geographique,
                        s.responsable_nom,

                        co.type_dechet_id,
                        td.nom AS type_dechet,

                        co.agent_id,
                        u.nom AS agent_nom,

                        co.date_collecte,
                        co.poids_estime,
                        co.poids_reel,
                        co.poids_reel_saisi_le,
                        co.statut,
                        co.resultat_terrain,
                        co.motif_terrain,

                        COALESCE(
                            (
                                SELECT
                                    jsonb_agg(
                                        jsonb_build_object(
                                            'id', pc.id,
                                            'mission_id', pc.mission_id,
                                            'type_preuve', pc.type_preuve,
                                            'mime_type', pc.mime_type,
                                            'taille_octets', pc.taille_octets,
                                            'pris_le', pc.pris_le,
                                            'recu_le', pc.recu_le
                                        )
                                        ORDER BY
                                            pc.pris_le ASC,
                                            pc.id ASC
                                    )

                                FROM preuves_collecte pc

                                WHERE pc.collecte_id =
                                      co.id

                                  AND pc.organisation_id =
                                      cu.organisation_id
                            ),
                            '[]'::jsonb
                        ) AS preuves,

                        COALESCE(
                            (
                                SELECT
                                    jsonb_agg(
                                        jsonb_build_object(
                                            'id', p.id,
                                            'mission_id', p.mission_id,
                                            'type', p.type,
                                            'poids_brut', p.poids_brut,
                                            'tare', p.tare,
                                            'poids_net', p.poids_net,
                                            'date_heure', p.date_heure,
                                            'preuve_id', p.preuve_id
                                        )
                                        ORDER BY
                                            p.date_heure ASC,
                                            p.id ASC
                                    )

                                FROM pesees p

                                WHERE p.collecte_id =
                                      co.id

                                  AND p.organisation_id =
                                      cu.organisation_id
                            ),
                            '[]'::jsonb
                        ) AS pesees

                    FROM client_utilisateurs cu

                    JOIN clients c
                      ON c.id = cu.client_id
                     AND c.organisation_id =
                         cu.organisation_id

                    JOIN collectes co
                      ON co.client_id = c.id

                    JOIN sites_de_collecte s
                      ON s.id = co.site_id
                     AND s.organisation_id =
                         cu.organisation_id

                    LEFT JOIN types_dechets td
                      ON td.id = co.type_dechet_id

                    LEFT JOIN utilisateurs u
                      ON u.id = co.agent_id

                    WHERE cu.utilisateur_id = $1
                      AND cu.organisation_id = $2
                      AND cu.actif = TRUE
                      AND co.id = $3

                    LIMIT 1;
                `,
                [
                    utilisateurId,
                    organisationId,
                    collecteId
                ]
            );

        return resultat.rows[0] || null;

    }


    async trouverPreuveAutorisee(
        utilisateurId,
        organisationId,
        collecteId,
        preuveId,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                    SELECT
                        pc.id,
                        pc.collecte_id,
                        pc.mission_id,
                        pc.type_preuve,
                        pc.mime_type,
                        pc.taille_octets,
                        pc.pris_le,
                        pc.recu_le,

                        /*
                         * Interne uniquement :
                         * jamais retourne directement
                         * au navigateur.
                         */
                        pc.storage_path

                    FROM client_utilisateurs cu

                    JOIN clients c
                      ON c.id = cu.client_id
                     AND c.organisation_id =
                         cu.organisation_id

                    JOIN collectes co
                      ON co.client_id = c.id

                    JOIN preuves_collecte pc
                      ON pc.collecte_id = co.id
                     AND pc.organisation_id =
                         cu.organisation_id

                    JOIN sites_de_collecte s
                      ON s.id = co.site_id
                     AND s.organisation_id =
                         cu.organisation_id

                    WHERE cu.utilisateur_id = $1
                      AND cu.organisation_id = $2
                      AND cu.actif = TRUE
                      AND co.id = $3
                      AND pc.id = $4

                    LIMIT 1;
                `,
                [
                    utilisateurId,
                    organisationId,
                    collecteId,
                    preuveId
                ]
            );

        return resultat.rows[0] || null;

    }
}

export default new PortailClientRepository();
