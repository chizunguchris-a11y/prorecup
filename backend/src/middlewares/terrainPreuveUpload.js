import multer
    from "multer";

import ApiError
    from "../utils/ApiError.js";


const typesAutorises = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf"
];


const stockage =
    multer.memoryStorage();


const terrainPreuveUpload =
    multer(
        {

            storage:
                stockage,

            limits: {

                fileSize:
                    5 * 1024 * 1024,

                files:
                    1,

                fields:
                    12

            },

            fileFilter: (
                req,
                fichier,
                callback
            ) => {

                if (
                    !typesAutorises.includes(
                        fichier.mimetype
                    )
                ) {

                    callback(
                        new ApiError(
                            400,
                            "Type de fichier non autorisé."
                        )
                    );

                    return;

                }


                callback(
                    null,
                    true
                );

            }

        }
    );


export default terrainPreuveUpload;