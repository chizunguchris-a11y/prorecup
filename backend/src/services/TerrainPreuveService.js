import { verifierEtape } from './TerrainParcoursService.js';
import pool from "../config/db.js";
﻿import {
    createHash
} from "node:crypto";

import terrainPreuveRepository
    from "../repositories/TerrainPreuveRepository.js";
import {
    verifierPreuveTerrain
} from "../utils/terrainFileSignature.js";

import terrainStorageService
    from "./TerrainStorageService.js";

import ApiError
    from "../utils/ApiError.js";

import peseeRepository
    from "../repositories/PeseeRepository.js";


const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;


const TYPES_PREUVES = [
    "avant_collecte",
    "apres_collecte",
    "ticket_balance",
    "anomalie"
];


const EXTENSIONS = {

    "image/jpeg":
        "jpg",

    "image/png":
        "png",

    "image/webp":
        "webp",

    "application/pdf":
        "pdf"

};


class TerrainPreuveService {

    validerUuid(
        valeur,
        nom
    ) {

        if (
            !valeur ||
            !UUID_REGEX.test(
                String(valeur)
            )
        ) {

            throw new ApiError(
                400,
                `${nom} est invalide.`
            );

        }

    }


    validerGps(
        latitude,
        longitude,
        precisionGps
    ) {

        const latitudePresente =
            latitude !== undefined &&
            latitude !== null &&
            latitude !== "";


        const longitudePresente =
            longitude !== undefined &&
            longitude !== null &&
            longitude !== "";


        if (
            latitudePresente !==
            longitudePresente
        ) {

            throw new ApiError(
                400,
                "Latitude et longitude doivent être fournies ensemble."
            );

        }


        if (
            latitudePresente &&
            (
                Number.isNaN(
                    Number(latitude)
                ) ||
                Number(latitude) < -90 ||
                Number(latitude) > 90
            )
        ) {

            throw new ApiError(
                400,
                "Latitude invalide."
            );

        }


        if (
            longitudePresente &&
            (
                Number.isNaN(
                    Number(longitude)
                ) ||
                Number(longitude) < -180 ||
                Number(longitude) > 180
            )
        ) {

            throw new ApiError(
                400,
                "Longitude invalide."
            );

        }


        if (
            precisionGps !== undefined &&
            precisionGps !== null &&
            precisionGps !== "" &&
            (
                Number.isNaN(
                    Number(
                        precisionGps
                    )
                ) ||
                Number(
                    precisionGps
                ) < 0
            )
        ) {

            throw new ApiError(
                400,
                "Précision GPS invalide."
            );

        }

    }


    async lierTicket(...args) {
        const lien = await peseeRepository.lierPreuveParOperation(...args);
        if (!lien) throw new ApiError(409, 'Ce ticket est déjà lié à une autre pesée ou cette pesée possède déjà une autre preuve.');
        return lien;
    }

    async enregistrer(missionId, collecteId, agentTerrain, donnees, fichier) {
        this.validerUuid(donnees.operation_id, "L'identifiant de l'opération");
        const connexion = await pool.connect();
        try {
            await connexion.query('BEGIN');
            await connexion.query("SET LOCAL lock_timeout = '5s'");
            await connexion.query("SET LOCAL statement_timeout = '30s'");
            await connexion.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [donnees.operation_id]);
            const result = await this.enregistrerAvecConnexion(missionId, collecteId, agentTerrain, donnees, fichier, connexion);
            await connexion.query('COMMIT');
            return result;
        } catch (error) {
            await connexion.query('ROLLBACK');
            // A failed COMMIT may already be durable: never delete the immutable Storage object here.
            throw error;
        } finally { connexion.release(); }
    }

    async enregistrerAvecConnexion(
        missionId,
        collecteId,
        agentTerrain,
        donnees,
        fichier,
        connexion
    ) {

        this.validerUuid(
            missionId,
            "L'identifiant de la mission"
        );


        this.validerUuid(
            collecteId,
            "L'identifiant de la collecte"
        );


        this.validerUuid(
            donnees.operation_id,
            "L'identifiant de l'opération"
        );


        if (!fichier) {

            throw new ApiError(
                400,
                "Le fichier de preuve est obligatoire."
            );

        }


        if (
            !Buffer.isBuffer(
                fichier.buffer
            ) ||
            fichier.buffer.length === 0
        ) {

            throw new ApiError(
                400,
                "Le fichier reçu est vide."
            );

        }


        const typePreuve =
            String(
                donnees.type_preuve ||
                ""
            )
                .trim()
                .toLowerCase();

        if (donnees.pesee_operation_id) {
            this.validerUuid(
                donnees.pesee_operation_id,
                "L'identifiant de la pesée"
            );
        }


        if (
            !TYPES_PREUVES.includes(
                typePreuve
            )
        ) {

            throw new ApiError(
                400,
                "Le type de preuve est invalide."
            );

        }


        const mimeReel =
    verifierPreuveTerrain(
        fichier.buffer,
        fichier.mimetype,
        typePreuve
    );


const extension =
    EXTENSIONS[
        mimeReel
    ];


        if (!extension) {

            throw new ApiError(
                400,
                "Le format du fichier n'est pas autorisé."
            );

        }


        if (!donnees.pris_le) {

            throw new ApiError(
                400,
                "La date réelle de prise de la preuve est obligatoire."
            );

        }


        const datePrise =
            new Date(
                donnees.pris_le
            );


        if (
            Number.isNaN(
                datePrise.getTime()
            )
        ) {

            throw new ApiError(
                400,
                "La date de prise de la preuve est invalide."
            );

        }


        const cinqMinutes =
            5 * 60 * 1000;


        if (
            datePrise.getTime() >
            Date.now() + cinqMinutes
        ) {

            throw new ApiError(
                400,
                "La date de prise de la preuve est située dans le futur."
            );

        }


        this.validerGps(
            donnees.latitude,
            donnees.longitude,
            donnees.precision_gps
        );


        const contexte =
            await terrainPreuveRepository
                .trouverContexte(
                    missionId,
                    collecteId,
                    agentTerrain.agent_id,
                    agentTerrain
                        .organisation_id,
                    connexion,
                    true
                );


        if (!contexte) {

            throw new ApiError(
                404,
                "Mission ou collecte introuvable pour cet agent."
            );

        }

        const hash =
            createHash(
                "sha256"
            )
                .update(
                    fichier.buffer
                )
                .digest(
                    "hex"
                );


        /*
         * Idempotence AVANT upload.
         */
        const existante =
            await terrainPreuveRepository
                .trouverParOperation(
                    donnees.operation_id,
                    agentTerrain
                        .organisation_id,
                    connexion
                );


        if (existante) {

            if (
                existante.mission_id !==
                    missionId ||
                existante.collecte_id !==
                    collecteId ||
                existante.cree_par !==
                    agentTerrain
                        .utilisateur_id ||
                existante.type_preuve !==
                    typePreuve ||
                existante.hash_sha256 !== hash ||
                new Date(existante.pris_le).getTime() !== datePrise.getTime() ||
                ['latitude', 'longitude', 'precision_gps'].some(key =>
                    (existante[key] == null ? null : Number(existante[key])) !==
                    (donnees[key] == null || donnees[key] === '' ? null : Number(donnees[key])))
            ) {

                throw new ApiError(
                    409,
                    "Cet identifiant d'opération a déjà été utilisé pour une autre preuve."
                );

            }


            if (
                typePreuve === "ticket_balance" &&
                donnees.pesee_operation_id
            ) {
                await this.lierTicket(
                    donnees.pesee_operation_id,
                    existante.id,
                    agentTerrain.organisation_id,
                    missionId,
                    collecteId,
                    agentTerrain.utilisateur_id,
                    connexion
                );
            }

            return {

                deja_traitee:
                    true,

                preuve:
                    existante

            };

        }


        if (
            typePreuve === "ticket_balance" &&
            donnees.pesee_operation_id
        ) {
            const pesee = await peseeRepository.trouverParOperation(
                donnees.pesee_operation_id,
                agentTerrain.organisation_id,
                connexion
            );
            if (
                !pesee ||
                pesee.mission_id !== missionId ||
                pesee.collecte_id !== collecteId ||
                pesee.utilisateur_id !== agentTerrain.utilisateur_id ||
                pesee.type !== "terrain"
            ) {
                throw new ApiError(409, "Le ticket ne correspond pas à cette pesée terrain.");
            }
        }


        /*
         * Permettre aussi la synchronisation tardive
         * après la fin de mission.
         */
        if (
            ![
                "en_cours",
                "terminee"
            ].includes(
                contexte.mission_statut
            )
        ) {

            throw new ApiError(
                409,
                "Cette mission n'accepte pas encore de preuve terrain."
            );

        }


        if (
            contexte.heure_depart_reelle
        ) {

            const depart =
                new Date(
                    contexte
                        .heure_depart_reelle
                );


            if (
                datePrise.getTime() <
                depart.getTime()
            ) {

                throw new ApiError(
                    409,
                    "La preuve est antérieure au départ réel de la mission."
                );

            }

        }


        if (
            contexte.mission_statut ===
                "terminee" &&
            contexte.heure_retour_reelle
        ) {

            const retour =
                new Date(
                    contexte
                        .heure_retour_reelle
                );


            if (
                datePrise.getTime() >
                retour.getTime()
            ) {

                throw new ApiError(
                    409,
                    "La preuve est postérieure à la fin réelle de la mission."
                );

            }

        }


        if (['avant_collecte', 'apres_collecte'].includes(typePreuve))
            await verifierEtape(connexion, missionId, collecteId, typePreuve, donnees.pris_le);
        const chemin =
            [
                agentTerrain
                    .organisation_id,

                missionId,

                collecteId,

                typePreuve,

                `${donnees.operation_id}-${hash}.${extension}`
            ]
                .join("/");


        try {

            await terrainStorageService
                .envoyerFichier(
                    {
                        buffer:
                            fichier.buffer,

                        chemin,

                        mimeType:
    			    mimeReel
                    }
                ).catch(error => {
                    if (error.code !== 'STORAGE_DUPLICATE') throw error;
                });


            const preuve =
                await terrainPreuveRepository
                    .creer(
                        {

                            organisation_id:
                                agentTerrain
                                    .organisation_id,

                            mission_id:
                                missionId,

                            collecte_id:
                                collecteId,

                            type_preuve:
                                typePreuve,

                            storage_bucket:
                                process.env
                                    .SUPABASE_STORAGE_BUCKET,

                            storage_path:
                                chemin,

                            mime_type:
    				mimeReel,

                            taille_octets:
                                fichier.size,

                            hash_sha256:
                                hash,

                            latitude:
                                donnees.latitude !==
                                    undefined &&
                                donnees.latitude !==
                                    ""
                                    ? Number(
                                        donnees.latitude
                                    )
                                    : null,

                            longitude:
                                donnees.longitude !==
                                    undefined &&
                                donnees.longitude !==
                                    ""
                                    ? Number(
                                        donnees.longitude
                                    )
                                    : null,

                            precision_gps:
                                donnees.precision_gps !==
                                    undefined &&
                                donnees.precision_gps !==
                                    ""
                                    ? Number(
                                        donnees
                                            .precision_gps
                                    )
                                    : null,

                            pris_le:
                                donnees.pris_le,

                            cree_par:
                                agentTerrain
                                    .utilisateur_id,

                            operation_id:
                                donnees.operation_id

                        },
                        connexion
                    );


            if (!preuve) {

                const existanteApres =
                    await terrainPreuveRepository
                        .trouverParOperation(
                            donnees.operation_id,
                            agentTerrain
                                .organisation_id,
                            connexion
                        );


                if (existanteApres) {

                    if (
                        typePreuve === "ticket_balance" &&
                        donnees.pesee_operation_id
                    ) {
                        await this.lierTicket(
                            donnees.pesee_operation_id,
                            existanteApres.id,
                            agentTerrain.organisation_id,
                            missionId,
                            collecteId,
                            agentTerrain.utilisateur_id,
                            connexion
                        );
                    }

                    return {

                        deja_traitee:
                            true,

                        preuve:
                            existanteApres

                    };

                }

                throw new Error(
                    "La preuve n'a pas pu être enregistrée."
                );

            }

            if (
                typePreuve === "ticket_balance" &&
                donnees.pesee_operation_id
            ) {
                await this.lierTicket(
                    donnees.pesee_operation_id,
                    preuve.id,
                    agentTerrain.organisation_id,
                    missionId,
                    collecteId,
                    agentTerrain.utilisateur_id,
                    connexion
                );
            }


            return {

                deja_traitee:
                    false,

                preuve

            };


        } catch (erreur) {
            // Keep the content-addressed object: the database commit/link may be uncertain.
            // A retry reuses this exact path and never overwrites another proof.
            throw erreur;

        }

    }

    async obtenirUrl(
        missionId,
        collecteId,
        preuveId,
        agentTerrain
    ) {

        this.validerUuid(
            missionId,
            "L'identifiant de la mission"
        );


        this.validerUuid(
            collecteId,
            "L'identifiant de la collecte"
        );


        this.validerUuid(
            preuveId,
            "L'identifiant de la preuve"
        );


        const preuve =
            await terrainPreuveRepository
                .trouverPourAgent(
                    preuveId,
                    missionId,
                    collecteId,
                    agentTerrain.agent_id,
                    agentTerrain
                        .organisation_id
                );


        if (!preuve) {

            throw new ApiError(
                404,
                "Preuve introuvable pour cet agent."
            );

        }


        const signature =
            await terrainStorageService
                .creerUrlSignee(
                    preuve.storage_path,
                    300
                );


        return {

            preuve: {

                id:
                    preuve.id,

                type_preuve:
                    preuve.type_preuve,

                mime_type:
                    preuve.mime_type,

                taille_octets:
                    preuve.taille_octets,

                pris_le:
                    preuve.pris_le

            },

            url:
                signature.url,

            expire_dans_secondes:
                signature
                    .expire_dans_secondes

        };

    }

}


export default new TerrainPreuveService();
