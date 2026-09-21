import ApiError
    from "./ApiError.js";


const TYPES_IMAGES = [
    "image/jpeg",
    "image/png",
    "image/webp"
];


const commencePar = (
    buffer,
    octets
) => {

    if (
        !Buffer.isBuffer(buffer) ||
        buffer.length <
            octets.length
    ) {

        return false;

    }


    return octets.every(
        (
            valeur,
            index
        ) =>
            buffer[index] ===
            valeur
    );

};


const detecterMimeReel = (
    buffer
) => {

    /*
     * PNG
     */
    if (
        commencePar(
            buffer,
            [
                0x89,
                0x50,
                0x4E,
                0x47,
                0x0D,
                0x0A,
                0x1A,
                0x0A
            ]
        )
    ) {

        return "image/png";

    }


    /*
     * JPEG
     */
    if (
        commencePar(
            buffer,
            [
                0xFF,
                0xD8,
                0xFF
            ]
        )
    ) {

        return "image/jpeg";

    }


    /*
     * WEBP
     *
     * RIFF .... WEBP
     */
    if (
        buffer.length >= 12 &&
        buffer
            .subarray(
                0,
                4
            )
            .toString(
                "ascii"
            ) === "RIFF" &&
        buffer
            .subarray(
                8,
                12
            )
            .toString(
                "ascii"
            ) === "WEBP"
    ) {

        return "image/webp";

    }


    /*
     * PDF
     */
    if (
        buffer.length >= 5 &&
        buffer
            .subarray(
                0,
                5
            )
            .toString(
                "ascii"
            ) === "%PDF-"
    ) {

        return "application/pdf";

    }


    return null;

};


const verifierPreuveTerrain = (
    buffer,
    mimeDeclare,
    typePreuve
) => {

    const mimeReel =
        detecterMimeReel(
            buffer
        );


    if (!mimeReel) {

        throw new ApiError(
            400,
            "Le contenu réel du fichier n'est pas reconnu."
        );

    }


    if (
        mimeReel !==
        mimeDeclare
    ) {

        throw new ApiError(
            400,
            "Le type déclaré du fichier ne correspond pas à son contenu réel."
        );

    }


    /*
     * Une preuve photographique doit
     * réellement être une image.
     *
     * Le PDF reste accepté uniquement
     * pour un ticket de balance.
     */
    if (
        typePreuve !==
            "ticket_balance" &&
        !TYPES_IMAGES.includes(
            mimeReel
        )
    ) {

        throw new ApiError(
            400,
            "Ce type de preuve doit être une image."
        );

    }


    return mimeReel;

};


export {
    detecterMimeReel,
    verifierPreuveTerrain
};