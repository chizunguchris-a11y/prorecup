/**
 * Configuration de securite centrale Pro Recup.
 *
 * Aucun secret JWT par defaut n'est autorise.
 * Une erreur de configuration doit etre visible plutot
 * que de signer ou verifier des jetons avec une cle connue.
 */

const JWT_FALLBACK_INTERDIT =
    "votre_cle_secrete_temporaire";


const creerErreurConfiguration =
    message => {

        const erreur =
            new Error(
                message
            );

        erreur.code =
            "SECURITY_CONFIGURATION_ERROR";

        return erreur;
    };


export const obtenirJwtSecret =
    () => {

        const secret =
            String(
                process.env.JWT_SECRET ||
                ""
            ).trim();


        if (!secret) {

            throw creerErreurConfiguration(
                "JWT_SECRET est obligatoire."
            );
        }


        if (
            secret ===
            JWT_FALLBACK_INTERDIT
        ) {

            throw creerErreurConfiguration(
                "JWT_SECRET utilise une valeur interdite et non securisee."
            );
        }


        return secret;
    };


export default {
    obtenirJwtSecret
};
