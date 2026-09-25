const DEFAULT_DELAYS_MS = [500, 1500];

export const isTransientConnectionError = error => {
    const code = String(error?.code || "").toUpperCase();
    const message = String(error?.message || "").toLowerCase();

    return [
        "ETIMEDOUT",
        "ECONNRESET",
        "ECONNREFUSED",
        "EPIPE",
        "57P01",
        "57P02",
        "57P03"
    ].includes(code) ||
        /connection.*(?:timeout|terminated|closed|reset|refused)/i.test(message) ||
        /timeout.*connection/i.test(message);
};

const wait = milliseconds =>
    new Promise(resolve => setTimeout(resolve, milliseconds));

/**
 * Ouvre une nouvelle connexion et démarre une transaction avant toute écriture.
 * Les tentatives ne couvrent volontairement pas les opérations métier suivantes :
 * le code appelant reçoit le client une seule fois, après BEGIN réussi.
 */
export async function beginTransactionWithRetry(
    pool,
    {
        delaysMs = DEFAULT_DELAYS_MS,
        sleep = wait,
        onRetry = () => {}
    } = {}
) {
    const attempts = delaysMs.length + 1;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        let client;
        let stage = "connexion";

        try {
            client = await pool.connect();
            stage = "BEGIN";
            await client.query("BEGIN");
            return client;
        } catch (error) {
            if (client) {
                client.release(true);
            }

            const retry =
                attempt < attempts &&
                isTransientConnectionError(error);

            if (!retry) {
                const wrapped = new Error(
                    `Ouverture transaction impossible (${stage}, tentative ${attempt}/${attempts}) : ` +
                    (error?.message || "erreur inconnue")
                );
                wrapped.cause = error;
                wrapped.stage = stage;
                wrapped.attempt = attempt;
                throw wrapped;
            }

            const delayMs = delaysMs[attempt - 1];
            onRetry({ attempt, attempts, delayMs, stage, error });
            await sleep(delayMs);
        }
    }

    throw new Error("Ouverture transaction impossible.");
}

export const __test = {
    DEFAULT_DELAYS_MS
};
