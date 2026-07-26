class ApiError extends Error {

    constructor(statut, message) {

        super(message);

        this.statut = statut;

        Error.captureStackTrace(this, this.constructor);

    }

}

export default ApiError;