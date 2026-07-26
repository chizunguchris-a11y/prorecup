const asyncHandler = (fonction) => {

    return (req, res, next) => {

        Promise.resolve(
            fonction(req, res, next)
        ).catch(next);

    };

};

export default asyncHandler;