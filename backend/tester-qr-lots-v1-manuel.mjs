/**
 * Recette temporaire QR + sacs/bacs/lots + traçabilité matière V1.
 *
 * Smoke auto-nettoyé :
 *   node backend/tester-qr-lots-v1-manuel.mjs C:\\ProRecup --smoke
 * Nettoyage après interruption :
 *   node backend/tester-qr-lots-v1-manuel.mjs C:\\ProRecup --cleanup <runId>
 *
 * Le script réutilise les références pilotes nécessaires au dépôt, mais crée
 * un tricycle et une balance Terrain temporaires propres à chaque run.
 * Aucun secret fixe n'est stocké dans ce fichier.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { randomBytes, randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { cleanupQrLotsFixtures } from "./lib/qrLotsCleanup.mjs";

const ORGANISATION_ID = "04fbfede-8cf8-47fc-a9b2-599b766229e2";
const SITE_ID = "781d4e3f-903d-4779-9137-304202e99767";
const BALANCE_DEPOT_ID = "137b8c49-4f99-444a-a1e5-45198ba43a44";

const args = process.argv.slice(2);
const cleanupIndex = args.indexOf("--cleanup");
const cleanupRunId = cleanupIndex < 0 ? null : args[cleanupIndex + 1];
const smoke = args.includes("--smoke");

const repo = path.resolve(
    args.find(value => !value.startsWith("--") && value !== cleanupRunId)
    || "C:\\ProRecup"
);

const backend = path.join(repo, "backend");
const runs = path.join(backend, "qr-lots-manuel-runs");
const require = createRequire(path.join(backend, "package.json"));
const dotenv = require("dotenv");

dotenv.config({
    path: path.join(backend, ".env"),
    quiet: true
});

const BUSINESS_TIMEZONE =
    process.env.APP_TIMEZONE || "Africa/Kinshasa";

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const QRCode = require("qrcode");

assert.ok(
    process.env.DATABASE_URL,
    "DATABASE_URL absente de backend/.env."
);

assert.ok(
    process.env.JWT_SECRET,
    "JWT_SECRET absente de backend/.env."
);

process.env.SKIP_DATABASE_STARTUP_CHECK = "1";

const [
    { default: pool },
    { default: app }
] = await Promise.all([
    import(pathToFileURL(path.join(backend, "src", "config", "db.js"))),
    import(pathToFileURL(path.join(backend, "src", "app.js")))
]);

const label = runId =>
    "qrlots-v1-" + runId;

const manifestPath = runId =>
    path.join(
        runs,
        "qr-lots-" + runId + ".json"
    );

const save = manifest => {
    fs.mkdirSync(
        runs,
        {
            recursive: true
        }
    );

    fs.writeFileSync(
        manifestPath(manifest.runId),
        JSON.stringify(
            manifest,
            null,
            2
        ),
        {
            mode: 0o600
        }
    );
};

const load = runId =>
    JSON.parse(
        fs.readFileSync(
            manifestPath(runId),
            "utf8"
        )
    );

const token = (
    id,
    role,
    organisationId = ORGANISATION_ID
) =>
    jwt.sign(
        {
            id,
            organisationId,
            role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "2h"
        }
    );

const iso = (
    deltaMs = 0
) =>
    new Date(
        Date.now() + deltaMs
    ).toISOString();

const businessDate = () => {
    const parts =
        new Intl.DateTimeFormat(
            "fr-CA",
            {
                timeZone:
                    BUSINESS_TIMEZONE,
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }
        ).formatToParts(
            new Date()
        );

    const values =
        Object.fromEntries(
            parts
                .filter(
                    part =>
                        part.type !==
                        "literal"
                )
                .map(
                    part => [
                        part.type,
                        part.value
                    ]
                )
        );

    return (
        `${values.year}-` +
        `${values.month}-` +
        `${values.day}`
    );
};

const api = (
    method,
    url,
    bearer,
    body
) => {
    let call =
        request(app)[method](url)
            .set(
                "Authorization",
                "Bearer " + bearer
            );

    if (body !== undefined) {
        call = call.send(body);
    }

    return call;
};

async function prepare() {
    const runId =
        randomUUID();

    const compactRunId =
        runId
            .replaceAll("-", "")
            .toUpperCase();

    const ids = {
        agentUser:
            randomUUID(),

        agent:
            randomUUID(),

        managerUser:
            randomUUID(),

        collecte:
            randomUUID(),

        mission:
            randomUUID(),

        tricycle:
            randomUUID(),

        balanceTerrain:
            randomUUID()
    };

    const codeSac =
        "PR-C-SAC-" +
        compactRunId.slice(
            0,
            12
        );

    const codeBac =
        "PR-C-BAC-" +
        compactRunId.slice(
            12,
            24
        );

    const codeLot =
        "PR-L-LOT-" +
        compactRunId.slice(
            0,
            12
        );

    const numeroTricycle =
        "TRI-TEST-" +
        compactRunId.slice(
            0,
            12
        );

    const numeroBalanceTerrain =
        "BAL-TEST-" +
        compactRunId.slice(
            0,
            12
        );

    const roles = (
        await pool.query(
            `
            SELECT
                id,
                lower(trim(nom)) AS nom
            FROM roles
            WHERE lower(trim(nom))
                IN (
                    'agent_valorisation_carbone',
                    'manager'
                )
            `
        )
    ).rows;

    const agentRole =
        roles.find(
            row =>
                row.nom ===
                "agent_valorisation_carbone"
        );

    const managerRole =
        roles.find(
            row =>
                row.nom ===
                "manager"
        );

    assert.ok(
        agentRole &&
        managerRole,
        "Rôles pilote introuvables."
    );

    const client = (
        await pool.query(
            `
            SELECT
                id,
                nom
            FROM clients
            WHERE organisation_id=$1
            ORDER BY
                nom,
                id
            LIMIT 1
            `,
            [
                ORGANISATION_ID
            ]
        )
    ).rows[0];

    const type = (
        await pool.query(
            `
            SELECT
                id,
                nom
            FROM types_dechets
            ORDER BY
                nom,
                id
            LIMIT 1
            `
        )
    ).rows[0];

    assert.ok(
        client &&
        type,
        "Client ou matière pilote introuvable."
    );

    const stock = (
        await pool.query(
            `
            SELECT
                id,
                quantite::text,
                date_mise_a_jour::text
            FROM stocks
            WHERE organisation_id=$1
              AND type_dechet_id=$2
            `,
            [
                ORGANISATION_ID,
                type.id
            ]
        )
    ).rows[0] || null;

    const agentPassword =
        randomBytes(18)
            .toString("base64url") +
        "!aA1";

    const managerPassword =
        randomBytes(18)
            .toString("base64url") +
        "!mM2";

    const manifest = {
        version: 3,

        runId,

        label:
            label(runId),

        ids,

        codeSac,

        codeBac,

        codeLot,

        numeroTricycle,

        numeroBalanceTerrain,

        businessDate:
            businessDate(),

        businessTimezone:
            BUSINESS_TIMEZONE,

        client,

        type,

        stockBefore:
            stock,

        lotId:
            null,

        created: {
            containers: [],
            lot: null,
            stock: null,
            mouvementStock: null
        },

        createdAt:
            iso(),

        emails: {
            agent:
                `qrlots-agent-${runId}@example.com`,

            manager:
                `qrlots-manager-${runId}@example.com`
        }
    };

    save(
        manifest
    );

    const [
        agentHash,
        managerHash
    ] =
        await Promise.all([
            bcrypt.hash(
                agentPassword,
                12
            ),

            bcrypt.hash(
                managerPassword,
                12
            )
        ]);

    const c =
        await pool.connect();

    try {
        await c.query(
            "BEGIN"
        );

        await c.query(
            `
            INSERT INTO utilisateurs(
                id,
                nom,
                email,
                mot_de_passe,
                organisation_id,
                role_id,
                actif
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                TRUE
            ),
            (
                $7,
                $8,
                $9,
                $10,
                $5,
                $11,
                TRUE
            )
            `,
            [
                ids.agentUser,

                manifest.label +
                " agent",

                manifest.emails.agent,

                agentHash,

                ORGANISATION_ID,

                agentRole.id,

                ids.managerUser,

                manifest.label +
                " manager",

                manifest.emails.manager,

                managerHash,

                managerRole.id
            ]
        );

        await c.query(
            `
            INSERT INTO agents(
                id,
                utilisateur_id,
                statut,
                disponible
            )
            VALUES(
                $1,
                $2,
                'actif',
                TRUE
            )
            `,
            [
                ids.agent,
                ids.agentUser
            ]
        );

        await c.query(
            `
            INSERT INTO tricycles(
                id,
                organisation_id,
                numero_interne,
                capacite_kg,
                statut,
                etat,
                observations
            )
            VALUES(
                $1,
                $2,
                $3,
                350,
                $4,
                'bon',
                $5
            )
            `,
            [
                ids.tricycle,

                ORGANISATION_ID,

                numeroTricycle,

                smoke
                    ? "en_mission"
                    : "disponible",

                manifest.label
            ]
        );

        await c.query(
            `
            INSERT INTO balances(
                id,
                organisation_id,
                numero_interne,
                type,
                capacite_max_kg,
                precision_kg,
                statut,
                tricycle_id,
                site_id
            )
            VALUES(
                $1,
                $2,
                $3,
                'numerique',
                350,
                0.1,
                'active',
                $4,
                NULL
            )
            `,
            [
                ids.balanceTerrain,

                ORGANISATION_ID,

                numeroBalanceTerrain,

                ids.tricycle
            ]
        );

        await c.query(
            `
            INSERT INTO collectes(
                id,
                site_id,
                client_id,
                agent_id,
                type_dechet_id,
                poids_estime,
                statut
            )
            VALUES(
                $1,
                $2,
                $3,
                $4,
                $5,
                110,
                'en_attente'
            )
            `,
            [
                ids.collecte,

                SITE_ID,

                client.id,

                ids.agentUser,

                type.id
            ]
        );

        if (smoke) {
            const departReel =
                iso(-180000);

            await c.query(
                `
                INSERT INTO missions(
                    id,
                    organisation_id,
                    agent_id,
                    tricycle_id,
                    date_prevue,
                    heure_depart_prevue,
                    heure_retour_prevue,
                    statut,
                    observations,
                    cree_par,
                    heure_depart_reelle
                )
                VALUES(
                    $1,
                    $2,
                    $3,
                    $4,
                    $5::date,
                    '08:00',
                    '18:00',
                    'en_cours',
                    $6,
                    $7,
                    $8::timestamptz
                )
                `,
                [
                    ids.mission,

                    ORGANISATION_ID,

                    ids.agent,

                    ids.tricycle,

                    manifest.businessDate,

                    manifest.label,

                    ids.managerUser,

                    departReel
                ]
            );
        } else {
            await c.query(
                `
                INSERT INTO missions(
                    id,
                    organisation_id,
                    agent_id,
                    tricycle_id,
                    date_prevue,
                    heure_depart_prevue,
                    heure_retour_prevue,
                    statut,
                    observations,
                    cree_par
                )
                VALUES(
                    $1,
                    $2,
                    $3,
                    $4,
                    $5::date,
                    '08:00',
                    '18:00',
                    'planifiee',
                    $6,
                    $7
                )
                `,
                [
                    ids.mission,

                    ORGANISATION_ID,

                    ids.agent,

                    ids.tricycle,

                    manifest.businessDate,

                    manifest.label,

                    ids.managerUser
                ]
            );
        }

        await c.query(
            `
            INSERT INTO missions_collectes(
                mission_id,
                collecte_id,
                ordre_collecte
            )
            VALUES(
                $1,
                $2,
                1
            )
            `,
            [
                ids.mission,
                ids.collecte
            ]
        );

        if (smoke) {
            for (
                const [
                    event,
                    at
                ] of [
                    [
                        "mission_demarree",
                        iso(-180000)
                    ],
                    [
                        "arrivee_site",
                        iso(-120000)
                    ],
                    [
                        "collecte_demarree",
                        iso(-60000)
                    ]
                ]
            ) {
                await c.query(
                    `
                    INSERT INTO mission_evenements(
                        mission_id,
                        collecte_id,
                        type_evenement,
                        latitude,
                        longitude,
                        precision_gps,
                        cree_par,
                        operation_id,
                        survenu_le,
                        recu_le,
                        contexte
                    )
                    VALUES(
                        $1,
                        $2,
                        $3,
                        -4.325,
                        15.322,
                        10,
                        $4,
                        $5,
                        $6,
                        $6,
                        '{}'::jsonb
                    )
                    `,
                    [
                        ids.mission,

                        event ===
                        "mission_demarree"
                            ? null
                            : ids.collecte,

                        event,

                        ids.agentUser,

                        randomUUID(),

                        at
                    ]
                );
            }
        }

        await c.query(
            "COMMIT"
        );
    } catch (error) {
        await c.query(
            "ROLLBACK"
        );

        throw error;
    } finally {
        c.release();
    }

    const managerToken =
        token(
            ids.managerUser,
            "manager"
        );

    const agentToken =
        token(
            ids.agentUser,
            "agent_valorisation_carbone"
        );

    const forbidden =
        await api(
            "post",
            "/api/lots/contenants",
            agentToken,
            {
                type_contenant:
                    "sac"
            }
        );

    assert.equal(
        forbidden.status,
        403,
        "Un agent ne doit pas créer de contenant."
    );

    for (
        const body of [
            {
                type_contenant:
                    "sac",

                code_qr:
                    codeSac,

                tare_kg:
                    1
            },

            {
                type_contenant:
                    "bac",

                code_qr:
                    codeBac,

                tare_kg:
                    2
            }
        ]
    ) {
        const response =
            await api(
                "post",
                "/api/lots/contenants",
                managerToken,
                body
            );

        assert.equal(
            response.status,
            201,
            response.body?.error ||
            "Création contenant refusée."
        );

        assert.equal(
            response.body.data.code_qr,
            body.code_qr
        );

        manifest.created.containers.push({
            id: response.body.data.id,
            code: response.body.data.code_qr
        });

        save(manifest);
    }

    return {
        manifest,

        agentPassword,

        managerPassword,

        agentToken,

        managerToken
    };
}

async function smokeRun(
    context
) {
    const {
        manifest,
        agentToken,
        managerToken
    } =
        context;

    const {
        ids,
        codeSac,
        codeBac,
        codeLot
    } =
        manifest;

    const terrainOp =
        randomUUID();

    const terrainAt =
        iso();

    const terrain =
        await api(
            "post",

            `/api/terrain/missions/${ids.mission}/collectes/${ids.collecte}/pesees`,

            agentToken,

            {
                operation_id:
                    terrainOp,

                balance_id:
                    ids.balanceTerrain,

                poids_brut:
                    113,

                tare:
                    null,

                codes_qr: [
                    codeSac,
                    codeBac
                ],

                survenu_le:
                    terrainAt,

                latitude:
                    -4.325,

                longitude:
                    15.322,

                precision_gps:
                    10
            }
        );

    assert.equal(
        terrain.status,
        200,
        terrain.body?.error ||
        "Pesée terrain QR refusée."
    );

    assert.equal(
        Number(
            terrain.body.data
                .pesee.tare
        ),
        3,
        "La tare QR 1 + 2 kg n'a pas été reprise."
    );

    const terrainRepeat =
        await api(
            "post",

            `/api/terrain/missions/${ids.mission}/collectes/${ids.collecte}/pesees`,

            agentToken,

            {
                operation_id:
                    terrainOp,

                balance_id:
                    ids.balanceTerrain,

                poids_brut:
                    113,

                tare:
                    null,

                codes_qr: [
                    codeBac,
                    codeSac
                ],

                survenu_le:
                    terrainAt,

                latitude:
                    -4.325,

                longitude:
                    15.322,

                precision_gps:
                    10
            }
        );

    assert.equal(
        terrainRepeat.status,
        200,
        "Rejeu idempotent de pesée QR refusé."
    );

    assert.equal(
        terrainRepeat.body.data
            .deja_traitee,
        true
    );

    const sansQr =
        await api(
            "post",

            `/api/terrain/missions/${ids.mission}/collectes/${ids.collecte}/pesees`,

            agentToken,

            {
                operation_id:
                    randomUUID(),

                balance_id:
                    ids.balanceTerrain,

                poids_brut:
                    110,

                tare:
                    0,

                survenu_le:
                    iso(10),

                latitude:
                    -4.325,

                longitude:
                    15.322,

                precision_gps:
                    10
            }
        );

    assert.equal(
        sansQr.status,
        200,
        "Compatibilité pesée sans QR cassée."
    );

    for (
        const [
            code,
            brut
        ] of [
            [
                codeSac,
                51
            ],

            [
                codeBac,
                62
            ]
        ]
    ) {
        const depot =
            await api(
                "post",

                `/api/collectes/${ids.collecte}/pesees`,

                managerToken,

                {
                    operation_id:
                        randomUUID(),

                    mission_id:
                        ids.mission,

                    balance_id:
                        BALANCE_DEPOT_ID,

                    poids_brut:
                        brut,

                    tare:
                        null,

                    codes_qr: [
                        code
                    ],

                    date_heure:
                        iso(
                            20 +
                            brut
                        )
                }
            );

        assert.equal(
            depot.status,
            200,
            depot.body?.error ||
            "Réception dépôt refusée."
        );
    }

    const operationLot =
        randomUUID();

    const lotBody = {
        operation_id:
            operationLot,

        site_id:
            SITE_ID,

        codes_qr: [
            codeBac,
            codeSac
        ],

        code_qr:
            codeLot,

        survenu_le:
            iso(100)
    };

    const lot =
        await api(
            "post",
            "/api/lots/regroupements",
            managerToken,
            lotBody
        );

    assert.equal(
        lot.status,
        201,
        lot.body?.error ||
        "Regroupement refusé."
    );

    assert.equal(
        Number(
            lot.body.data
                .poids_reel
        ),
        110
    );

    manifest.lotId =
        lot.body.data.id;

    manifest.created.lot = {
        id: lot.body.data.id,
        code: lot.body.data.code_qr,
        operationId: operationLot
    };

    save(
        manifest
    );

    const stockCreated = await pool.query(
        `
        SELECT
            ms.id AS mouvement_id,
            ms.stock_id
        FROM mouvements_stock ms
        WHERE ms.lot_id=$1
        `,
        [manifest.lotId]
    );

    assert.equal(
        stockCreated.rows.length,
        1,
        "Mouvement de stock du lot introuvable ou ambigu."
    );

    manifest.created.stock = {
        id: stockCreated.rows[0].stock_id
    };

    manifest.created.mouvementStock = {
        id: stockCreated.rows[0].mouvement_id
    };

    save(manifest);

    const replay =
        await api(
            "post",
            "/api/lots/regroupements",
            managerToken,
            lotBody
        );

    assert.equal(
        replay.status,
        201
    );

    assert.equal(
        replay.body.data.id,
        manifest.lotId
    );

    const conflict =
        await api(
            "post",
            "/api/lots/regroupements",
            managerToken,
            {
                ...lotBody,

                codes_qr: [
                    codeSac
                ]
            }
        );

    assert.equal(
        conflict.status,
        409,
        "Un operation_id rejoué avec un autre contenu doit être refusé."
    );

    const histoireLot =
        await api(
            "get",
            "/api/lots/tracabilite/" +
            codeLot,
            managerToken
        );

    assert.equal(
        histoireLot.status,
        200
    );

    assert.equal(
        histoireLot.body.data
            .filiation.length,
        2
    );

    const histoireSac =
        await api(
            "get",
            "/api/lots/tracabilite/" +
            codeSac,
            managerToken
        );

    assert.equal(
        histoireSac.status,
        200
    );

    for (
        const type of [
            "creation",

            "pesee_terrain",

            "pesee_depot",

            "reception_depot",

            "regroupement_lot"
        ]
    ) {
        assert.ok(
            histoireSac.body.data
                .historique
                .some(
                    row =>
                        row.type_evenement ===
                        type
                ),

            "Événement absent : " +
            type
        );
    }

    const etiquette =
        await api(
            "get",
            "/api/lots/etiquette/" +
            codeLot,
            managerToken
        );

    assert.equal(
        etiquette.status,
        200
    );

    assert.equal(
        etiquette.body.data.code_qr,
        codeLot
    );

    const svgAttendu =
        await QRCode.toString(
            codeLot,
            {
                type:
                    "svg",

                errorCorrectionLevel:
                    "M",

                margin:
                    2,

                width:
                    320
            }
        );

    assert.equal(
        etiquette.body.data.svg,
        svgAttendu,
        "Le QR SVG ne correspond pas exactement au code stocké."
    );

    const autreOrg =
        await api(
            "get",
            "/api/lots/unites",
            token(
                ids.managerUser,
                "manager",
                randomUUID()
            )
        );

    assert.equal(
        autreOrg.status,
        200
    );

    assert.ok(
        !autreOrg.body.data
            .some(
                row =>
                    [
                        codeSac,
                        codeBac,
                        codeLot
                    ].includes(
                        row.code_qr
                    )
            ),

        "Isolation organisation compromise."
    );

    const db =
        await pool.query(
            `
            SELECT

            (
                SELECT
                    count(*)::int
                FROM pesees_unites pu

                JOIN pesees p
                  ON p.id =
                     pu.pesee_id

                WHERE
                    p.collecte_id=$1

            ) AS liens_pesees,

            (
                SELECT
                    count(*)::int
                FROM lot_contenants
                WHERE lot_id=$2

            ) AS filiation,

            (
                SELECT
                    count(*)::int
                FROM mouvements_stock
                WHERE lot_id=$2

            ) AS mouvements
            `,
            [
                ids.collecte,
                manifest.lotId
            ]
        );

    assert.deepEqual(
        db.rows[0],
        {
            liens_pesees:
                4,

            filiation:
                2,

            mouvements:
                1
        }
    );

    return {
        lotId:
            manifest.lotId,

        codeLot,

        poids:
            110,

        liensPesees:
            4,

        evenementsSac:
            histoireSac.body
                .data
                .historique
                .length
    };
}

async function recordManualLot(manifest) {
    if (
        Number(manifest.version) < 3 ||
        manifest.created?.lot
    ) {
        return;
    }

    const result = await pool.query(
        `
        SELECT
            l.id,
            l.code_qr,
            l.operation_id,
            l.type_dechet_id,
            e.creation_user_id,
            e.creation_count,
            ms.id AS mouvement_id,
            ms.stock_id
        FROM lots l
        LEFT JOIN LATERAL
        (
            SELECT
                min(utilisateur_id::text)::uuid
                    AS creation_user_id,
                count(*)::int
                    AS creation_count
            FROM tracabilite_matiere_evenements
            WHERE lot_id=l.id
              AND type_evenement='creation'
        ) e ON TRUE
        LEFT JOIN mouvements_stock ms
          ON ms.lot_id=l.id
        WHERE l.organisation_id=$1
          AND l.code_qr=$2
        `,
        [
            ORGANISATION_ID,
            manifest.codeLot
        ]
    );

    if (!result.rows.length) {
        return;
    }

    assert.equal(
        result.rows.length,
        1,
        "Lot manuel ou mouvement de stock ambigu."
    );

    const row = result.rows[0];

    assert.equal(
        row.creation_user_id,
        manifest.ids.managerUser,
        "Le lot manuel n'appartient pas au manager du run."
    );

    assert.equal(
        Number(row.creation_count),
        1,
        "Preuve de création du lot manuel ambiguë."
    );

    assert.equal(
        row.type_dechet_id,
        manifest.type.id,
        "Matière du lot manuel différente du manifeste."
    );

    assert.match(
        String(row.operation_id || ""),
        /^[0-9a-f-]{36}$/i,
        "Opération du lot manuel absente."
    );

    assert.match(
        String(row.mouvement_id || ""),
        /^[0-9a-f-]{36}$/i,
        "Mouvement du lot manuel absent."
    );

    assert.match(
        String(row.stock_id || ""),
        /^[0-9a-f-]{36}$/i,
        "Stock du lot manuel absent."
    );

    manifest.lotId = row.id;
    manifest.created.lot = {
        id: row.id,
        code: row.code_qr,
        operationId: row.operation_id
    };
    manifest.created.stock = {
        id: row.stock_id
    };
    manifest.created.mouvementStock = {
        id: row.mouvement_id
    };

    save(manifest);
}

const cleanup = async manifest => {
    await recordManualLot(manifest);

    return cleanupQrLotsFixtures(
        pool,
        manifest,
        ORGANISATION_ID
    );
};

let manifest;

try {
    if (
        cleanupRunId
    ) {
        assert.match(
            cleanupRunId || "",
            /^[0-9a-f-]{36}$/i,
            "runId invalide."
        );

        manifest =
            load(
                cleanupRunId
            );

        const affected =
            await cleanup(
                manifest
            );

        fs.rmSync(
            manifestPath(
                cleanupRunId
            ),
            {
                force: true
            }
        );

        console.log(
            `Nettoyage QR/Lots OK — ${affected} lignes affectées.`
        );
    } else {
        const context =
            await prepare();

        manifest =
            context.manifest;

        if (
            smoke
        ) {
            const result =
                await smokeRun(
                    context
                );

            const affected =
                await cleanup(
                    manifest
                );

            fs.rmSync(
                manifestPath(
                    manifest.runId
                ),
                {
                    force: true
                }
            );

            console.log(
                `Smoke QR/Lots OK — lot ${result.codeLot}, ${result.poids} kg, ` +
                `${result.liensPesees} liens pesée, ${result.evenementsSac} événements sac ; ` +
                `${affected} lignes nettoyées.`
            );
        } else {
            console.log(
                `runId : ${manifest.runId}`
            );

            console.log(
                `Agent : ${manifest.emails.agent} / ${context.agentPassword}`
            );

            console.log(
                `Manager : ${manifest.emails.manager} / ${context.managerPassword}`
            );

            console.log(
                `Tricycle test : ${manifest.numeroTricycle}`
            );

            console.log(
                `Balance Terrain test : ${manifest.numeroBalanceTerrain}`
            );

            console.log(
                `Sac : ${manifest.codeSac} (tare 1 kg)`
            );

            console.log(
                `Bac : ${manifest.codeBac} (tare 2 kg)`
            );

            console.log(
                `Lot attendu : ${manifest.codeLot}`
            );

            console.log(
                `Après interruption : node backend/tester-qr-lots-v1-manuel.mjs C:\\ProRecup --cleanup ${manifest.runId}`
            );

            const terminal =
                createInterface({
                    input:
                        process.stdin,

                    output:
                        process.stdout
                });

            await terminal.question(
                "Appuyez sur Entrée pour nettoyer les fixtures..."
            );

            terminal.close();

            const affected =
                await cleanup(
                    manifest
                );

            fs.rmSync(
                manifestPath(
                    manifest.runId
                ),
                {
                    force: true
                }
            );

            console.log(
                `Nettoyage QR/Lots OK — ${affected} lignes affectées.`
            );
        }
    }
} catch (
    error
) {
    process.exitCode =
        1;

    console.error(
        "ÉCHEC : " +
        (
            error?.message ||
            "Erreur inattendue."
        )
    );

    if (
        manifest
    ) {
        console.error(
            `Nettoyage : node backend/tester-qr-lots-v1-manuel.mjs C:\\ProRecup --cleanup ${manifest.runId}`
        );
    }
} finally {
    await pool.end();
}
