/* =========================================================
   PRO RECUP
   IDENTITY / ACCOUNT RECOVERY FOUNDATION
   ========================================================= */


/* ---------------------------------------------------------
   Verified recovery channels
   --------------------------------------------------------- */

ALTER TABLE utilisateurs
ADD COLUMN IF NOT EXISTS
    email_verifie_le TIMESTAMPTZ;


ALTER TABLE utilisateurs
ADD COLUMN IF NOT EXISTS
    telephone_verifie_le TIMESTAMPTZ;


/* ---------------------------------------------------------
   Secure one-time identity tokens

   Supports:
   - password reset
   - email verification
   - phone verification
   - invitation
   - identifier recovery
   --------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS identity_recovery_tokens (

    id UUID PRIMARY KEY,

    utilisateur_id UUID NOT NULL,

    purpose VARCHAR(40) NOT NULL,

    channel VARCHAR(20) NOT NULL,

    token_hash CHAR(64),

    code_hash CHAR(64),

    destination_hint VARCHAR(120),

    expire_le TIMESTAMPTZ NOT NULL,

    utilise_le TIMESTAMPTZ,

    tentatives INTEGER NOT NULL
        DEFAULT 0,

    adresse_ip VARCHAR(64),

    user_agent VARCHAR(500),

    cree_le TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT
        fk_identity_recovery_utilisateur
        FOREIGN KEY (
            utilisateur_id
        )
        REFERENCES utilisateurs(id)
        ON DELETE CASCADE,

    CONSTRAINT
        ck_identity_recovery_purpose
        CHECK (
            purpose IN (
                'password_reset',
                'email_verification',
                'phone_verification',
                'invitation',
                'identifier_recovery'
            )
        ),

    CONSTRAINT
        ck_identity_recovery_channel
        CHECK (
            channel IN (
                'email',
                'sms'
            )
        ),

    CONSTRAINT
        ck_identity_recovery_secret
        CHECK (
            token_hash IS NOT NULL
            OR
            code_hash IS NOT NULL
        ),

    CONSTRAINT
        ck_identity_recovery_attempts
        CHECK (
            tentatives >= 0
        )
);


CREATE UNIQUE INDEX IF NOT EXISTS
    uq_identity_recovery_token_hash
ON identity_recovery_tokens(
    token_hash
)
WHERE token_hash IS NOT NULL;


CREATE INDEX IF NOT EXISTS
    idx_identity_recovery_user
ON identity_recovery_tokens(
    utilisateur_id
);


CREATE INDEX IF NOT EXISTS
    idx_identity_recovery_active
ON identity_recovery_tokens(
    utilisateur_id,
    purpose,
    expire_le
)
WHERE utilise_le IS NULL;


/* ---------------------------------------------------------
   Assisted recovery

   Used only when automatic recovery is impossible:
   - forgotten login email
   - lost email access
   - lost phone
   - lost both channels
   - locked / compromised account
   --------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS account_recovery_requests (

    id UUID PRIMARY KEY,

    utilisateur_id UUID,

    type VARCHAR(40) NOT NULL,

    nom_declare VARCHAR(150),

    organisation_declaree VARCHAR(180),

    telephone_contact VARCHAR(40),

    email_contact VARCHAR(254),

    message TEXT,

    statut VARCHAR(30) NOT NULL
        DEFAULT 'en_attente',

    adresse_ip VARCHAR(64),

    user_agent VARCHAR(500),

    cree_le TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    modifie_le TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    resolu_le TIMESTAMPTZ,

    CONSTRAINT
        fk_account_recovery_utilisateur
        FOREIGN KEY (
            utilisateur_id
        )
        REFERENCES utilisateurs(id)
        ON DELETE SET NULL,

    CONSTRAINT
        ck_account_recovery_type
        CHECK (
            type IN (
                'identifiant_oublie',
                'email_inaccessible',
                'telephone_inaccessible',
                'acces_total_perdu',
                'compte_bloque',
                'compte_compromis'
            )
        ),

    CONSTRAINT
        ck_account_recovery_statut
        CHECK (
            statut IN (
                'en_attente',
                'en_verification',
                'resolu',
                'refuse',
                'annule'
            )
        )
);


CREATE INDEX IF NOT EXISTS
    idx_account_recovery_status
ON account_recovery_requests(
    statut,
    cree_le
);


CREATE INDEX IF NOT EXISTS
    idx_account_recovery_user
ON account_recovery_requests(
    utilisateur_id
)
WHERE utilisateur_id IS NOT NULL;
