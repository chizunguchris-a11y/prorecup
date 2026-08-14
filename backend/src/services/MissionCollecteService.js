import pool from "../config/db.js";

import missionCollecteRepository
    from "../repositories/MissionCollecteRepository.js";

import ApiError
    from "../utils/ApiError.js";

class MissionCollecteService {

    async obtenirMissionPlanifiee(
        missionId,
        organisationId,
        connexion
    ) {

        const mission =
            await missionCollecteRepository
                .trouverMissionParIdPourOrganisation(
                    missionId,
                    organisationId,
                    connexion
                );

        if (!mission) {
            throw new ApiError(
                404,
                "Mission introuvable."
            );
        }

        if (mission.statut !== "planifiee") {
            throw new ApiError(
                409,
                "Seule une mission planifiée peut être modifiée."
            );
        }

        return mission;

    }

    async ajouter(
        missionId,
        organisationId,
        donnees
    ) {

        if (!donnees.collecte_id) {
            throw new ApiError(
                400,
                "La collecte est obligatoire."
            );
        }

        const ordreCollecte =
            donnees.ordre_collecte !== undefined
                ? Number(donnees.ordre_collecte)
                : null;

        if (
            ordreCollecte !== null &&
            (
                !Number.isInteger(ordreCollecte) ||
                ordreCollecte <= 0
            )
        ) {
            throw new ApiError(
                400,
                "L'ordre de collecte doit être un entier supérieur à zéro."
            );
        }

        const connexion =
            await pool.connect();

        try {

            await connexion.query("BEGIN");

            await this.obtenirMissionPlanifiee(
                missionId,
                organisationId,
                connexion
            );

            const collecte =
                await missionCollecteRepository
                    .trouverCollectePourOrganisation(
                        donnees.collecte_id,
                        organisationId,
                        connexion
                    );

            if (!collecte) {
                throw new ApiError(
                    404,
                    "Collecte introuvable dans votre organisation."
                );
            }

            if (collecte.statut !== "en_attente") {
                throw new ApiError(
                    409,
                    "Seule une collecte en attente peut être affectée à une mission."
                );
            }

            const associationExistante =
                await missionCollecteRepository
                    .trouverAssociation(
                        missionId,
                        donnees.collecte_id,
                        connexion
                    );

            if (associationExistante) {
                throw new ApiError(
                    409,
                    "Cette collecte est déjà associée à cette mission."
                );
            }

            const affectationActive =
                await missionCollecteRepository
                    .trouverAffectationActiveParCollecte(
                        donnees.collecte_id,
                        connexion
                    );

            if (
                affectationActive &&
                affectationActive.mission_id !==
                    missionId
            ) {
                throw new ApiError(
                    409,
                    "Cette collecte est déjà affectée à une autre mission active."
                );
            }

            const association =
                await missionCollecteRepository.ajouter(
                    missionId,
                    donnees.collecte_id,
                    ordreCollecte,
                    connexion
                );

            await connexion.query("COMMIT");

            return association;

        } catch (erreur) {

            await connexion.query("ROLLBACK");
            throw erreur;

        } finally {

            connexion.release();

        }

    }

    async lister(
        missionId,
        organisationId
    ) {

        const mission =
            await missionCollecteRepository
                .trouverMissionParIdPourOrganisation(
                    missionId,
                    organisationId
                );

        if (!mission) {
            throw new ApiError(
                404,
                "Mission introuvable."
            );
        }

        return await missionCollecteRepository
            .listerParMission(
                missionId,
                organisationId
            );

    }

    async modifierOrdre(
        missionId,
        collecteId,
        organisationId,
        ordreCollecte
    ) {

        const ordre =
            Number(ordreCollecte);

        if (
            !Number.isInteger(ordre) ||
            ordre <= 0
        ) {
            throw new ApiError(
                400,
                "L'ordre de collecte doit être un entier supérieur à zéro."
            );
        }

        await this.obtenirMissionPlanifiee(
            missionId,
            organisationId
        );

        const association =
            await missionCollecteRepository
                .trouverAssociation(
                    missionId,
                    collecteId
                );

        if (!association) {
            throw new ApiError(
                404,
                "Cette collecte n'est pas associée à la mission."
            );
        }

        return await missionCollecteRepository
            .modifierOrdre(
                missionId,
                collecteId,
                ordre
            );

    }

    async retirer(
        missionId,
        collecteId,
        organisationId
    ) {

        await this.obtenirMissionPlanifiee(
            missionId,
            organisationId
        );

        const association =
            await missionCollecteRepository
                .trouverAssociation(
                    missionId,
                    collecteId
                );

        if (!association) {
            throw new ApiError(
                404,
                "Cette collecte n'est pas associée à la mission."
            );
        }

        return await missionCollecteRepository
            .retirer(
                missionId,
                collecteId
            );

    }

}

export default new MissionCollecteService();