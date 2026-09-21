import pool
    from "../config/db.js";


class TerrainRepository {

    async trouverContexteAgent(
        utilisateurId,
        organisationId,
        connexion = pool
    ) {

        const requete = `
            SELECT
                u.id AS utilisateur_id,
                u.nom AS utilisateur_nom,
                u.email AS utilisateur_email,
                u.telephone AS utilisateur_telephone,
                u.photo_url AS utilisateur_photo_url,
                u.actif AS utilisateur_actif,
                u.organisation_id,

                r.nom AS role_nom,

                a.id AS agent_id,
                a.telephone AS agent_telephone,
                a.photo_url AS agent_photo_url,
                a.statut AS agent_statut,
                a.disponible AS agent_disponible,
                a.date_embauche

            FROM utilisateurs u

            JOIN roles r
                ON r.id = u.role_id

            LEFT JOIN agents a
                ON a.utilisateur_id = u.id

            WHERE u.id = $1
              AND u.organisation_id = $2

            LIMIT 1;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    utilisateurId,
                    organisationId
                ]
            );

        return resultat.rows[0] || null;

    }

    async listerMissionsJournee(
        agentId,
        organisationId,
        dateJour,
        connexion = pool
    ) {

        const requete = `
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
                ON t.id = m.tricycle_id

            WHERE m.organisation_id = $1

              AND m.agent_id = $2

              AND m.date_prevue = $3

              AND m.statut <> 'annulee'

            ORDER BY
                m.heure_depart_prevue ASC
                NULLS LAST,
                m.cree_le ASC;
        `;


        const resultat =
            await connexion.query(
                requete,
                [
                    organisationId,
                    agentId,
                    dateJour
                ]
            );


        return resultat.rows;

    }


    async listerCollectesMissionTerrain(
        missionId,
        organisationId,
        connexion = pool
    ) {

        const requete = `
            SELECT
                mc.mission_id,
                mc.collecte_id,
                mc.ordre_collecte,

                c.site_id,
                c.client_id,
                c.agent_id,
                c.date_collecte,
                c.poids_estime,
                c.poids_reel,
                c.poids_reel_saisi_le,
                c.statut,
                c.type_dechet_id,

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
                    AS site_rayon_validation_m

            FROM missions_collectes mc

            JOIN missions m
                ON m.id = mc.mission_id

            JOIN collectes c
                ON c.id = mc.collecte_id

            LEFT JOIN sites_de_collecte s
                ON s.id = c.site_id

            WHERE mc.mission_id = $1
              AND m.organisation_id = $2

            ORDER BY
                mc.ordre_collecte ASC
                    NULLS LAST,
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

}


export default new TerrainRepository();