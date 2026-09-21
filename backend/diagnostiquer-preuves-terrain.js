import "dotenv/config";

import fs
    from "node:fs";

import pool
    from "./src/config/db.js";


const ouiNon = (
    valeur
) => {

    return valeur
        ? "OUI"
        : "NON";

};


const executer = async () => {

    try {

        console.log("");
        console.log(
            "========================================"
        );

        console.log(
            "DIAGNOSTIC PREUVES TERRAIN PRO RECUP"
        );

        console.log(
            "========================================"
        );


        /*
         * -------------------------------------------------
         * ENVIRONNEMENT NODE
         * -------------------------------------------------
         */

        console.log("");
        console.log(
            "ENVIRONNEMENT"
        );

        console.log(
            "Node :",
            process.version
        );


        /*
         * -------------------------------------------------
         * PACKAGE.JSON
         * -------------------------------------------------
         */

        const contenuPackage =
    fs.readFileSync(
        "./package.json",
        "utf8"
    );


const packageJson =
    JSON.parse(
        contenuPackage
            .replace(
                /^\uFEFF/,
                ""
            )
            .trim()
    );


        const dependances = {

            ...(
                packageJson
                    .dependencies ||
                {}
            ),

            ...(
                packageJson
                    .devDependencies ||
                {}
            )

        };


        console.log("");
        console.log(
            "DEPENDANCES FICHIERS / STORAGE"
        );


        console.table(
            [
                {
                    package:
                        "multer",

                    installe:
                        dependances.multer ||
                        "NON"
                },

                {
                    package:
                        "@supabase/supabase-js",

                    installe:
                        dependances[
                            "@supabase/supabase-js"
                        ] ||
                        "NON"
                }
            ]
        );


        /*
         * -------------------------------------------------
         * VARIABLES D'ENVIRONNEMENT
         *
         * IMPORTANT :
         * on affiche seulement présence/absence,
         * jamais leurs valeurs.
         * -------------------------------------------------
         */

        console.log("");
        console.log(
            "VARIABLES STORAGE"
        );


        console.table(
            [
                {
                    variable:
                        "SUPABASE_URL",

                    presente:
                        ouiNon(
                            process.env
                                .SUPABASE_URL
                        )
                },

                {
                    variable:
                        "SUPABASE_SERVICE_ROLE_KEY",

                    presente:
                        ouiNon(
                            process.env
                                .SUPABASE_SERVICE_ROLE_KEY
                        )
                },

                {
                    variable:
                        "SUPABASE_ANON_KEY",

                    presente:
                        ouiNon(
                            process.env
                                .SUPABASE_ANON_KEY
                        )
                },

                {
                    variable:
                        "SUPABASE_STORAGE_BUCKET",

                    presente:
                        ouiNon(
                            process.env
                                .SUPABASE_STORAGE_BUCKET
                        )
                }
            ]
        );


        /*
         * -------------------------------------------------
         * TABLE PREUVES_COLLECTE
         * -------------------------------------------------
         */

        const table =
            await pool.query(`
                SELECT
                    to_regclass(
                        'public.preuves_collecte'
                    ) AS table_preuves;
            `);


        console.log("");
        console.log(
            "TABLE preuves_collecte :",
            table.rows[0]
                ?.table_preuves ||
            "ABSENTE"
        );


        const colonnes =
            await pool.query(`
                SELECT
                    column_name,
                    data_type,
                    is_nullable,
                    column_default

                FROM information_schema.columns

                WHERE table_schema =
                    'public'

                  AND table_name =
                    'preuves_collecte'

                ORDER BY
                    ordinal_position;
            `);


        console.log("");
        console.log(
            "COLONNES preuves_collecte"
        );


        if (
            colonnes.rows.length ===
            0
        ) {

            console.log(
                "[ERREUR] Table absente ou sans colonnes accessibles."
            );

        } else {

            console.table(
                colonnes.rows
            );

        }


        /*
         * -------------------------------------------------
         * CONTRAINTES
         * -------------------------------------------------
         */

        const contraintes =
            await pool.query(`
                SELECT
                    con.conname
                        AS nom,

                    con.contype
                        AS type,

                    pg_get_constraintdef(
                        con.oid
                    ) AS definition

                FROM pg_constraint con

                JOIN pg_class rel
                    ON rel.oid =
                        con.conrelid

                JOIN pg_namespace nsp
                    ON nsp.oid =
                        rel.relnamespace

                WHERE nsp.nspname =
                    'public'

                  AND rel.relname =
                    'preuves_collecte'

                ORDER BY
                    con.conname;
            `);


        console.log("");
        console.log(
            "CONTRAINTES preuves_collecte"
        );


        if (
            contraintes.rows.length >
            0
        ) {

            console.table(
                contraintes.rows
            );

        } else {

            console.log(
                "Aucune contrainte trouvée."
            );

        }


        /*
         * -------------------------------------------------
         * INDEX
         * -------------------------------------------------
         */

        const index =
            await pool.query(`
                SELECT
                    indexname,
                    indexdef

                FROM pg_indexes

                WHERE schemaname =
                    'public'

                  AND tablename =
                    'preuves_collecte'

                ORDER BY
                    indexname;
            `);


        console.log("");
        console.log(
            "INDEX preuves_collecte"
        );


        if (
            index.rows.length >
            0
        ) {

            console.table(
                index.rows
            );

        } else {

            console.log(
                "Aucun index trouvé."
            );

        }


        /*
         * -------------------------------------------------
         * STORAGE SUPABASE
         *
         * On vérifie seulement si les tables Storage
         * sont visibles depuis cette connexion PostgreSQL.
         * -------------------------------------------------
         */

        try {

            const storage =
                await pool.query(`
                    SELECT
                        to_regclass(
                            'storage.buckets'
                        ) AS buckets,

                        to_regclass(
                            'storage.objects'
                        ) AS objects;
                `);


            console.log("");
            console.log(
                "SCHEMA STORAGE SUPABASE"
            );


            console.table(
                storage.rows
            );


            if (
                storage.rows[0]
                    ?.buckets
            ) {

                try {

                    const buckets =
                        await pool.query(`
                            SELECT
                                id,
                                name,
                                public,
                                file_size_limit,
                                allowed_mime_types

                            FROM storage.buckets

                            ORDER BY name;
                        `);


                    console.log("");
                    console.log(
                        "BUCKETS EXISTANTS"
                    );


                    if (
                        buckets.rows.length >
                        0
                    ) {

                        console.table(
                            buckets.rows
                        );

                    } else {

                        console.log(
                            "Aucun bucket existant."
                        );

                    }


                } catch (
                    erreurBuckets
                ) {

                    console.log(
                        "[INFO] Buckets non lisibles avec cette connexion :",
                        erreurBuckets.message
                    );

                }

            }


        } catch (
            erreurStorage
        ) {

            console.log("");
            console.log(
                "[INFO] Storage Supabase non inspectable :",
                erreurStorage.message
            );

        }


        console.log("");
        console.log(
            "========================================"
        );

        console.log(
            "DIAGNOSTIC TERMINE"
        );

        console.log(
            "========================================"
        );


    } catch (erreur) {

        console.error("");
        console.error(
            "[ERREUR]",
            erreur.message
        );

    } finally {

        await pool.end();

    }

};


executer();