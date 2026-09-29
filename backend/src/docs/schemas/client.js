const clientSchema = {
    Client: {
        type: "object",
        properties: {
            id: {
                type: "string",
                format: "uuid"
            },
            nom: {
                type: "string",
                example: "Hôpital Central"
            },
            type_client: {
                type: "string",
                enum: [
                    "entreprise",
                    "institution",
                    "menage",
                    "association",
                    "collectivite"
                ],
                example: "institution"
            },
            secteur_activite: {
                type: "string",
                nullable: true,
                example: "sante"
            },
            contact_email: {
                type: "string",
                example: "contact@hopital.cd"
            },
            contact_telephone: {
                type: "string",
                example: "+243900000000"
            },
            adresse_siege: {
                type: "string",
                example: "Kinshasa"
            },
            organisation_id: {
                type: "string",
                format: "uuid"
            }
        }
    }
};

export default clientSchema;