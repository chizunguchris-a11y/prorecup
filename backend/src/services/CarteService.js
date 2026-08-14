import carteRepository
    from "../repositories/CarteRepository.js";

import ApiError
    from "../utils/ApiError.js";

class CarteService {

    async obtenirPositions(
        organisationId
    ) {

        if (!organisationId) {

            throw new ApiError(
                400,
                "L'organisation est obligatoire."
            );

        }

        const [
            positions,
            resume
        ] = await Promise.all([
            carteRepository
                .listerPositionsParOrganisation(
                    organisationId
                ),

            carteRepository
                .obtenirResumeParOrganisation(
                    organisationId
                )
        ]);

        return {
            resume,
            positions
        };

    }

}

export default new CarteService();