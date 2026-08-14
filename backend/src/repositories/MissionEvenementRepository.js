import pool from "../config/db.js";

class MissionEvenementRepository {

    async trouverMissionParIdPourOrganisation(
        missionId,
        organisationId,
        connexion = pool
    ) {

        const requete = `
            SELECT
                id,
                organisation_id,
                agent_id,
                tricycle_id,
                date_prevue,
                statut
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

    async trouverCollecteAssociee(
        missionId,
        collecteId,
        organisationId,
        connexion = pool
    ) {

        const requete = `
            SELECT
                mc.mission_id,
                mc.collecte_id,
                mc.ordre_collecte,
                c.statut AS statut_collecte
            FROM missions_collectes mc

            JOIN missions m
                ON m.id = mc.mission_id

            JOIN collectes c
                ON c.id = mc.collecte_id

            JOIN clients cl
                ON cl.id = c.client_id

            JOIN sites_de_collecte s
                ON s.id = c.site_id

            WHERE mc.mission_id = $1
              AND mc.collecte_id = $2
              AND m.organisation_id = $3
              AND cl.organisation_id = $3
              AND s.organisation_id = $3;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    missionId,
                    collecteId,
                    organisationId
                ]
            );

        return resultat.rows[0];

    }

    async trouverEvenementMissionParType(
        missionId,
        typeEvenement,
        connexion = pool
    ) {

        const requete = `
            SELECT *
            FROM mission_evenements
            WHERE mission_id = $1
              AND type_evenement = $2
            LIMIT 1;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    missionId,
                    typeEvenement
                ]
            );

        return resultat.rows[0];

    }

    async trouverEvenementCollecteParType(
        missionId,
        collecteId,
        typeEvenement,
        connexion = pool
    ) {

        const requete = `
            SELECT *
            FROM mission_evenements
            WHERE mission_id = $1
              AND collecte_id = $2
              AND type_evenement = $3
            LIMIT 1;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    missionId,
                    collecteId,
                    typeEvenement
                ]
            );

        return resultat.rows[0];

    }

    async creer(
        evenement,
        connexion = pool
    ) {

        const requete = `
            INSERT INTO mission_evenements
            (
                mission_id,
                collecte_id,
                type_evenement,
                latitude,
                longitude,
                precision_gps,
                observations,
                cree_par
            )
            VALUES
            (
                $1, $2, $3, $4,
                $5, $6, $7, $8
            )
            RETURNING *;
        `;

        const valeurs = [
            evenement.mission_id,
            evenement.collecte_id || null,
            evenement.type_evenement,
            evenement.latitude !== undefined
                ? evenement.latitude
                : null,
            evenement.longitude !== undefined
                ? evenement.longitude
                : null,
            evenement.precision_gps !== undefined
                ? evenement.precision_gps
                : null,
            evenement.observations || null,
            evenement.cree_par || null
        ];

        const resultat =
            await connexion.query(
                requete,
                valeurs
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
                me.id,
                me.mission_id,
                me.collecte_id,
                me.type_evenement,
                me.latitude,
                me.longitude,
                me.precision_gps,
                me.observations,
                me.cree_par,
                me.cree_le,

                u.nom AS cree_par_nom,

                cl.nom AS client_nom,

                s.nom AS site_nom,
                s.adresse AS site_adresse,
                s.zone_geographique

            FROM mission_evenements me

            JOIN missions m
                ON m.id = me.mission_id

            LEFT JOIN utilisateurs u
                ON u.id = me.cree_par

            LEFT JOIN collectes c
                ON c.id = me.collecte_id

            LEFT JOIN clients cl
                ON cl.id = c.client_id

            LEFT JOIN sites_de_collecte s
                ON s.id = c.site_id

            WHERE me.mission_id = $1
              AND m.organisation_id = $2

            ORDER BY me.cree_le ASC;
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

export default new MissionEvenementRepository();