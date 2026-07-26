const authSchema = {

    LoginRequest: {
        type: "object",
        required: [
            "email",
            "motDePasse"
        ],
        properties: {
            email: {
                type: "string",
                format: "email",
                example: "christian2@prorecup.com"
            },
            motDePasse: {
                type: "string",
                example: "ProRecup2026!"
            }
        }
    }

};

export default authSchema;