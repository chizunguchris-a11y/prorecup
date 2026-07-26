const stockSchema = {
    Stock: {
        type: "object",
        properties: {
            id: {
                type: "string",
                format: "uuid",
                example: "c51e4918-9457-4d9e-9ea7-86fe60823224"
            },

            organisation_id: {
                type: "string",
                format: "uuid",
                example: "04fbfede-8cf8-47fc-a9b2-599b766229e2"
            },

            type_dechet_id: {
                type: "string",
                format: "uuid",
                example: "aca1e84d-bc23-45e2-b218-42e6b24aad98"
            },

            type_dechet: {
                type: "string",
                example: "PET"
            },

            quantite: {
                type: "number",
                example: 23.5
            },

            unite: {
                type: "string",
                example: "kg"
            },

            date_mise_a_jour: {
                type: "string",
                format: "date-time",
                example: "2026-07-22T22:48:31.266Z"
            }
        }
    },

    StockResponse: {
        type: "object",
        properties: {
            success: {
                type: "boolean",
                example: true
            },

            data: {
                type: "array",
                items: {
                    $ref: "#/components/schemas/Stock"
                }
            }
        }
    }
};

export default stockSchema;