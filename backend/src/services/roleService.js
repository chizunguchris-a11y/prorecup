import roleRepository
    from "../repositories/roleRepository.js";

import ApiError
    from "../utils/ApiError.js";

const rolesSysteme = [
    "admin",
    "manager",
    "agent"
];

const roleService = {

    async creer(
        donnees
    ) {

        const nom =
            String(
                donnees.nom || ""
            )
                .trim()
                .toLowerCase();

        const description =
            String(
                donnees.description || ""
            ).trim();

        if (!nom) {

            throw new ApiError(
                400,
                "Le nom du rôle est obligatoire."
            );

        }

        if (
            !rolesSysteme.includes(
                nom
            )
        ) {

            throw new ApiError(
                400,
                "Le rôle doit être admin, manager ou agent."
            );

        }

        const roleExistant =
            await roleRepository
                .trouverParNom(
                    nom
                );

        if (roleExistant) {

            throw new ApiError(
                409,
                "Ce rôle existe déjà."
            );

        }

        return roleRepository.creer({
            nom,
            description
        });

    },

    async lister() {

        return roleRepository.lister();

    },

    async trouverParId(
        roleId
    ) {

        if (!roleId) {

            throw new ApiError(
                400,
                "L'identifiant du rôle est obligatoire."
            );

        }

        const role =
            await roleRepository
                .trouverParId(
                    roleId
                );

        if (!role) {

            throw new ApiError(
                404,
                "Rôle introuvable."
            );

        }

        return role;

    }

};

export default roleService;