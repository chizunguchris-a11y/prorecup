import pool from "../config/db.js";

class CollecteRepository {

    async creer(
        collecte,
        connexion = pool
    ) {

        const requete = `
            INSERT INTO collectes
            (
                site_id,
                client_id,
                agent_id,
                type_dechet_id,
                poids_estime,
                statut
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;

        const valeurs = [
            collecte.site_id,
            collecte.client_id,
            collecte.agent_id || null,
            collecte.type_dechet_id,
            collecte.poids_estime,
            collecte.statut || "en_attente"
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
        seuilEcartPourcent = 5,
        connexion = pool
    ) {

        const requete = `
            SELECT
                c.id,
                c.site_id,
                c.client_id,
                c.agent_id,
                c.type_dechet_id,
		c.date_collecte,
                c.poids_estime,
                c.statut,

                s.nom AS site_nom,
                s.adresse AS site_adresse,

                cl.nom AS client_nom,
                cl.type_client,

                td.nom AS type_dechet,

                u.nom AS agent_nom,

                COALESCE(
                    (
                        SELECT jsonb_agg(jsonb_build_object(
                            'id', p.id,
                            'mission_id', p.mission_id,
                            'type', p.type,
                            'poids_brut', p.poids_brut,
                            'tare', p.tare,
                            'poids_net', p.poids_net,
                            'date_heure', p.date_heure,
                            'latitude', p.latitude,
                            'longitude', p.longitude,
                            'precision_gps', p.precision_gps,
                            'balance_id', b.id,
                            'balance_numero', b.numero_interne,
                            'preuve_id', p.preuve_id,
                            'agent_nom', up.nom,
                            'remplace_pesee_id', p.remplace_pesee_id,
                            'est_courante', p.id = CASE WHEN p.type = 'terrain' THEN pt.id ELSE pd.id END
                        ) ORDER BY p.date_heure ASC, p.cree_le ASC)
                        FROM pesees p
                        JOIN balances b ON b.id = p.balance_id
                        LEFT JOIN utilisateurs up ON up.id = p.utilisateur_id
                        WHERE p.collecte_id = c.id
                          AND p.organisation_id = $1
                    ),
                    '[]'::jsonb
                ) AS pesees,

                COALESCE(
                    (
                        SELECT jsonb_agg(jsonb_build_object(
                            'id', pc.id,
                            'type_preuve', pc.type_preuve,
                            'mime_type', pc.mime_type,
                            'pris_le', pc.pris_le
                        ) ORDER BY pc.pris_le ASC)
                        FROM preuves_collecte pc
                        WHERE pc.collecte_id = c.id
                          AND pc.organisation_id = $1
                          AND pc.type_preuve = 'ticket_balance'
                    ),
                    '[]'::jsonb
                ) AS tickets_balance,

                pt.poids_net AS poids_terrain_kg,
                pd.poids_net AS poids_depot_kg,
                CASE
                    WHEN pt.poids_net IS NOT NULL AND pd.poids_net IS NOT NULL
                         AND pt.poids_net > 0
                    THEN ROUND(ABS(pd.poids_net - pt.poids_net) / pt.poids_net * 100, 2)
                    ELSE NULL
                END AS ecart_terrain_depot_pct,
                CASE
                    WHEN pt.poids_net IS NOT NULL AND pd.poids_net IS NOT NULL
                         AND pt.poids_net = 0 AND pd.poids_net <> 0 THEN TRUE
                    WHEN pt.poids_net IS NOT NULL AND pd.poids_net IS NOT NULL
                         AND pt.poids_net > 0
                    THEN ABS(pd.poids_net - pt.poids_net) / pt.poids_net * 100 > $2
                    ELSE FALSE
                END AS anomalie_pesee

            FROM collectes c

            JOIN sites_de_collecte s
                ON s.id = c.site_id

            JOIN clients cl
                ON cl.id = c.client_id

            JOIN types_dechets td
                ON td.id = c.type_dechet_id

            LEFT JOIN utilisateurs u
                ON u.id = c.agent_id

            LEFT JOIN LATERAL (
                SELECT id, poids_net FROM pesees
                WHERE collecte_id = c.id AND organisation_id = $1 AND type = 'terrain'
                ORDER BY date_heure DESC, cree_le DESC, id DESC LIMIT 1
            ) pt ON TRUE

            LEFT JOIN LATERAL (
                SELECT id, poids_net FROM pesees
                WHERE collecte_id = c.id AND organisation_id = $1 AND type = 'depot'
                ORDER BY date_heure DESC, cree_le DESC, id DESC LIMIT 1
            ) pd ON TRUE

            WHERE cl.organisation_id = $1
              AND s.organisation_id = $1

            ORDER BY c.id DESC;
        `;

        const resultat =
            await connexion.query(
                requete,
                [organisationId, seuilEcartPourcent]
            );

        return resultat.rows;

    }

    // Utilisé notamment par LotService
    async trouverParId(
        id,
        connexion = pool
    ) {

        const requete = `
            SELECT
                c.*,
                cl.organisation_id
            FROM collectes c

            JOIN clients cl
                ON cl.id = c.client_id

            WHERE c.id = $1;
        `;

        const resultat =
            await connexion.query(
                requete,
                [id]
            );

        return resultat.rows[0];

    }

    async trouverParIdPourOrganisation(
        id,
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
                    id,
                    organisationId
                ]
            );

        return resultat.rows[0];

    }

    async trouverPreuvePourOrganisation(
        collecteId,
        preuveId,
        organisationId,
        connexion = pool
    ) {
        const resultat = await connexion.query(`
            SELECT p.*
            FROM preuves_collecte p
            WHERE p.id = $1
              AND p.collecte_id = $2
              AND p.organisation_id = $3
            LIMIT 1;
        `, [preuveId, collecteId, organisationId]);
        return resultat.rows[0] || null;
    }

    async validerCollecte(
        id,
        connexion = pool
    ) {

        const requete = `
            UPDATE collectes
            SET statut = 'valide'
            WHERE id = $1
            RETURNING *;
        `;

        const resultat =
            await connexion.query(
                requete,
                [id]
            );

        return resultat.rows[0];

    }

}

export default new CollecteRepository();
