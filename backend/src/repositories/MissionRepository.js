import pool from "../config/db.js";

class MissionRepository {

    async creer(
        mission,
        connexion = pool
    ) {

        const requete = `
            INSERT INTO missions
            (
                organisation_id,
                agent_id,
                tricycle_id,
                date_prevue,
                heure_depart_prevue,
                heure_retour_prevue,
                statut,
                observations,
                cree_par
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
                $9
            )
            RETURNING *;
        `;

        const valeurs = [
            mission.organisation_id,
            mission.agent_id,
            mission.tricycle_id,
            mission.date_prevue,
            mission.heure_depart_prevue || null,
            mission.heure_retour_prevue || null,
            mission.statut || "planifiee",
            mission.observations || null,
            mission.cree_par || null
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
                m.cree_par,
                m.cree_le,
                m.modifie_le,

                u.nom AS agent_nom,
                u.email AS agent_email,

                a.telephone AS agent_telephone,
                a.disponible AS agent_disponible,
                a.statut AS agent_statut,

                t.numero_interne AS tricycle_numero,
                t.plaque_identification,
                t.marque AS tricycle_marque,
                t.modele AS tricycle_modele,
                t.capacite_kg,
                t.statut AS tricycle_statut,
                t.etat AS tricycle_etat,

                createur.nom AS cree_par_nom,

                (
                    SELECT COUNT(*)::integer
                    FROM missions_collectes mc
                    WHERE mc.mission_id = m.id
                ) AS nombre_collectes

            FROM missions m

            JOIN agents a
                ON a.id = m.agent_id

            JOIN utilisateurs u
                ON u.id = a.utilisateur_id

            JOIN tricycles t
                ON t.id = m.tricycle_id

            LEFT JOIN utilisateurs createur
                ON createur.id = m.cree_par

            WHERE m.organisation_id = $1

            ORDER BY
                m.date_prevue DESC,
                m.heure_depart_prevue DESC
                    NULLS LAST;
        `;

        const resultat =
            await connexion.query(
                requete,
                [organisationId]
            );

        return resultat.rows;

    }

    async trouverParIdPourOrganisation(
        missionId,
        organisationId,
        connexion = pool,
        verrouiller = false
    ) {

        const verrou =
            verrouiller
                ? "FOR UPDATE OF m"
                : "";

        const requete = `
            SELECT
                m.*,

                u.nom AS agent_nom,
                u.email AS agent_email,

                a.telephone AS agent_telephone,
                a.disponible AS agent_disponible,
                a.statut AS agent_statut,

                t.numero_interne AS tricycle_numero,
                t.plaque_identification,
                t.capacite_kg,
                t.statut AS tricycle_statut,
                t.etat AS tricycle_etat,

                (
                    SELECT COUNT(*)::integer
                    FROM missions_collectes mc
                    WHERE mc.mission_id = m.id
                ) AS nombre_collectes

            FROM missions m

            JOIN agents a
                ON a.id = m.agent_id

            JOIN utilisateurs u
                ON u.id = a.utilisateur_id

            JOIN tricycles t
                ON t.id = m.tricycle_id

            WHERE m.id = $1
              AND m.organisation_id = $2

            ${verrou};
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

    async trouverAgentPourMiseAJour(
        agentId,
        organisationId,
        connexion = pool
    ) {

        const requete = `
            SELECT
                a.*,
                u.nom,
                u.email,
                u.organisation_id

            FROM agents a

            JOIN utilisateurs u
                ON u.id = a.utilisateur_id

            WHERE a.id = $1
              AND u.organisation_id = $2

            FOR UPDATE OF a;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    agentId,
                    organisationId
                ]
            );

        return resultat.rows[0];

    }

    async trouverTricyclePourMiseAJour(
        tricycleId,
        organisationId,
        connexion = pool
    ) {

        const requete = `
            SELECT *
            FROM tricycles

            WHERE id = $1
              AND organisation_id = $2

            FOR UPDATE;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    tricycleId,
                    organisationId
                ]
            );

        return resultat.rows[0];

    }

    async existeConflitAgent(
        agentId,
        datePrevue,
        missionIgnoreeId = null,
        connexion = pool
    ) {

        const requete = `
            SELECT id

            FROM missions

            WHERE agent_id = $1
              AND date_prevue = $2
              AND statut IN
              (
                  'planifiee',
                  'en_cours'
              )
              AND
              (
                  $3::uuid IS NULL
                  OR id <> $3
              )

            LIMIT 1;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    agentId,
                    datePrevue,
                    missionIgnoreeId
                ]
            );

        return Boolean(
            resultat.rows[0]
        );

    }

    async existeConflitTricycle(
        tricycleId,
        datePrevue,
        missionIgnoreeId = null,
        connexion = pool
    ) {

        const requete = `
            SELECT id

            FROM missions

            WHERE tricycle_id = $1
              AND date_prevue = $2
              AND statut IN
              (
                  'planifiee',
                  'en_cours'
              )
              AND
              (
                  $3::uuid IS NULL
                  OR id <> $3
              )

            LIMIT 1;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    tricycleId,
                    datePrevue,
                    missionIgnoreeId
                ]
            );

        return Boolean(
            resultat.rows[0]
        );

    }

    async modifier(
        missionId,
        organisationId,
        mission,
        connexion = pool
    ) {

        const requete = `
            UPDATE missions

            SET
                agent_id = $1,
                tricycle_id = $2,
                date_prevue = $3,
                heure_depart_prevue = $4,
                heure_retour_prevue = $5,
                observations = $6,
                modifie_le = CURRENT_TIMESTAMP

            WHERE id = $7
              AND organisation_id = $8

            RETURNING *;
        `;

        const valeurs = [
            mission.agent_id,
            mission.tricycle_id,
            mission.date_prevue,
            mission.heure_depart_prevue || null,
            mission.heure_retour_prevue || null,
            mission.observations || null,
            missionId,
            organisationId
        ];

        const resultat =
            await connexion.query(
                requete,
                valeurs
            );

        return resultat.rows[0];

    }

    async modifierStatut(
        missionId,
        organisationId,
        statut,
        connexion = pool
    ) {

        let champsSupplementaires =
            "";

        if (
            statut ===
            "en_cours"
        ) {

            champsSupplementaires = `
                heure_depart_reelle =
                    COALESCE(
                        heure_depart_reelle,
                        CURRENT_TIMESTAMP
                    ),
            `;

        }

        if (
            statut === "terminee" ||
            statut === "annulee"
        ) {

            champsSupplementaires = `
                heure_retour_reelle =
                    CASE
                        WHEN heure_depart_reelle IS NOT NULL
                        THEN COALESCE(
                            heure_retour_reelle,
                            CURRENT_TIMESTAMP
                        )
                        ELSE heure_retour_reelle
                    END,
            `;

        }

        const requete = `
            UPDATE missions

            SET
                ${champsSupplementaires}
                statut = $1,
                modifie_le = CURRENT_TIMESTAMP

            WHERE id = $2
              AND organisation_id = $3

            RETURNING *;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    statut,
                    missionId,
                    organisationId
                ]
            );

        return resultat.rows[0];

    }

    async modifierDisponibiliteAgent(
        agentId,
        disponible,
        connexion = pool
    ) {

        const requete = `
            UPDATE agents

            SET
                disponible = $1,
                modifie_le = CURRENT_TIMESTAMP

            WHERE id = $2

            RETURNING *;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    disponible,
                    agentId
                ]
            );

        return resultat.rows[0];

    }

    async modifierStatutTricycle(
        tricycleId,
        statut,
        connexion = pool
    ) {

        const requete = `
            UPDATE tricycles

            SET
                statut = $1,
                modifie_le = CURRENT_TIMESTAMP

            WHERE id = $2

            RETURNING *;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    statut,
                    tricycleId
                ]
            );

        return resultat.rows[0];

    }

}

export default new MissionRepository();