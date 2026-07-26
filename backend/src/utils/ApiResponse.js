class ApiResponse {

    static success(res, message, data = null, statut = 200) {

        return res.status(statut).json({
            success: true,
            message,
            data
        });

    }

    static created(res, message, data = null) {

        return res.status(201).json({
            success: true,
            message,
            data
        });

    }

    static noContent(res) {

        return res.status(204).send();

    }

}

export default ApiResponse;