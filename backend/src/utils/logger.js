const formaterMessage = (
    niveau,
    message,
    informations = {}
) => {

    return JSON.stringify({
        date: new Date().toISOString(),
        niveau,
        message,
        ...informations
    });

};

const logger = {

    info: (message, informations = {}) => {

        console.log(
            formaterMessage(
                "INFO",
                message,
                informations
            )
        );

    },

    warning: (message, informations = {}) => {

        console.warn(
            formaterMessage(
                "WARNING",
                message,
                informations
            )
        );

    },

    error: (message, informations = {}) => {

        console.error(
            formaterMessage(
                "ERROR",
                message,
                informations
            )
        );

    }

};

export default logger;