const auditContextMiddleware = (
    req,
    res,
    next
) => {

    req.audit = {

        date_debut:
            new Date(),

        methode:
            req.method,

        route:
            req.originalUrl,

        adresse_ip:
            req.headers[
                "x-forwarded-for"
            ] ||
            req.ip ||
            req.socket?.remoteAddress ||
            null,

        navigateur:
            req.headers[
                "user-agent"
            ] ||
            null

    };

    next();

};

export default auditContextMiddleware;