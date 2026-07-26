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
                example: "Hôpital"
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