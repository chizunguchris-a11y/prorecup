import authSchema from "./auth.js";
import clientSchema from "./client.js";
import stockSchema from "./stock.js";

const schemas = {
    ...authSchema,
    ...clientSchema,
    ...stockSchema
};

export default schemas;