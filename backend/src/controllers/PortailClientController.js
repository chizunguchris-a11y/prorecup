import ApiResponse
    from "../utils/ApiResponse.js";


const portailClientController = {

    me: (
        req,
        res
    ) => {

        return ApiResponse.success(
            res,
            "Contexte portail client récupéré avec succès.",
            {
                utilisateur: {
                    id:
                        req.portailClient
                            .utilisateur_id,

                    nom:
                        req.portailClient
                            .utilisateur_nom,

                    email:
                        req.portailClient
                            .utilisateur_email,

                    telephone:
                        req.portailClient
                            .utilisateur_telephone,

                    photo_url:
                        req.portailClient
                            .utilisateur_photo_url
                },

                organisation_id:
                    req.portailClient
                        .organisation_id,

                role:
                    req.portailClient.role,

                clients:
                    req.portailClient.clients
            }
        );

    }

};


export default portailClientController;
