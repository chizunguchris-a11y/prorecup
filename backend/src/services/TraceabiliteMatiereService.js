import { randomUUID } from "node:crypto";
import QRCode from "qrcode";
import pool from "../config/db.js";
import repository from "../repositories/TraceabiliteMatiereRepository.js";
import ApiError from "../utils/ApiError.js";
import stockService from "./StockService.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const QR = /^PR-[CL]-[A-Z0-9-]{6,60}$/;

class TraceabiliteMatiereService {
    normaliserCode(code, nature) {
        const prefixe = nature === "lot" ? "PR-L-" : "PR-C-";
        const valeur = String(code || prefixe + randomUUID().replaceAll("-", "")).trim().toUpperCase();
        if (!QR.test(valeur) || !valeur.startsWith(prefixe)) throw new ApiError(400, `Le code doit commencer par ${prefixe}.`);
        return valeur;
    }

    normaliserCodes(codes) {
        if (!Array.isArray(codes) || !codes.length) throw new ApiError(400, "Scannez au moins un contenant.");
        const resultat = [...new Set(codes.map(code => String(code).trim().toUpperCase()).filter(Boolean))];
        if (resultat.some(code => !QR.test(code))) throw new ApiError(400, "Un code QR est invalide.");
        return resultat;
    }

    async creerContenant(organisationId, utilisateurId, donnees) {
        if (!["sac", "bac"].includes(donnees.type_contenant)) throw new ApiError(400, "Le type doit être sac ou bac.");
        const tare = donnees.tare_kg === null || donnees.tare_kg === undefined || donnees.tare_kg === ""
            ? null : Number(donnees.tare_kg);
        if (tare !== null && (!Number.isFinite(tare) || tare < 0)) throw new ApiError(400, "La tare est invalide.");
        const connexion = await pool.connect();
        try {
            await connexion.query("BEGIN");
            const refs = await repository.verifierReferences(organisationId, {
                siteId: donnees.site_courant_id || null, clientId: donnees.client_courant_id || null,
                typeDechetId: donnees.type_dechet_id || null
            }, connexion);
            if (!refs.site_ok || !refs.client_ok || !refs.type_ok) throw new ApiError(404, "Site, client ou matière introuvable dans votre organisation.");
            const contenant = await repository.creerContenant({ organisation_id: organisationId,
                type_contenant: donnees.type_contenant, code_qr: this.normaliserCode(donnees.code_qr, "contenant"),
                tare_kg: tare, site_courant_id: donnees.site_courant_id || null,
                client_courant_id: donnees.client_courant_id || null, type_dechet_id: donnees.type_dechet_id || null }, connexion);
            await repository.creerEvenement({ organisation_id: organisationId, contenant_id: contenant.id,
                type_evenement: "creation", operation_id: randomUUID(), site_id: contenant.site_courant_id,
                client_id: contenant.client_courant_id, utilisateur_id: utilisateurId,
                survenu_le: contenant.cree_le, details: { code_qr: contenant.code_qr, type: contenant.type_contenant } }, connexion);
            await connexion.query("COMMIT");
            return contenant;
        } catch (erreur) {
            await connexion.query("ROLLBACK");
            if (erreur.code === "23505") throw new ApiError(409, "Ce code QR existe déjà.");
            throw erreur;
        } finally { connexion.release(); }
    }

    async lister(organisationId) { return repository.listerUnites(organisationId); }

    async historique(organisationId, code) {
        const valeur = String(code || "").trim().toUpperCase();
        if (!QR.test(valeur)) throw new ApiError(400, "Le code QR est invalide.");
        const lignes = await repository.historique(organisationId, valeur);
        if (!lignes.length) throw new ApiError(404, "Ce contenant ou lot est introuvable.");
        const unite = { nature: lignes[0].nature, id: lignes[0].id, code_qr: lignes[0].code_qr };
        const filiation = unite.nature === "lot"
            ? await repository.listerContenantsLot(organisationId, unite.id) : [];
        return { unite, filiation, historique: lignes };
    }

    async etiquette(organisationId, code) {
        const resultat = await this.historique(organisationId, code);
        return { ...resultat.unite, svg: await QRCode.toString(resultat.unite.code_qr,
            { type: "svg", errorCorrectionLevel: "M", margin: 2, width: 320 }) };
    }

    async regrouper(organisationId, utilisateurId, donnees) {
        if (!UUID.test(String(donnees.operation_id || ""))) throw new ApiError(400, "L'identifiant d'opération est invalide.");
        if (!UUID.test(String(donnees.site_id || ""))) throw new ApiError(400, "Le site dépôt est obligatoire.");
        const codes = this.normaliserCodes(donnees.codes_qr).sort();
        const connexion = await pool.connect();
        try {
            await connexion.query("BEGIN");
            const dejaCree = await repository.trouverLotParOperation(organisationId, donnees.operation_id, connexion);
            if (dejaCree) {
                const memeSite = dejaCree.site_courant_id === donnees.site_id;
                const memesCodes = JSON.stringify(dejaCree.codes_contenants || []) === JSON.stringify(codes);
                const memeCodeLot = !donnees.code_qr ||
                    dejaCree.code_qr === this.normaliserCode(donnees.code_qr, "lot");
                const memePoids = donnees.poids_reel === undefined || donnees.poids_reel === null || donnees.poids_reel === "" ||
                    Number(dejaCree.poids_reel) === Number(donnees.poids_reel);
                if (!memeSite || !memesCodes || !memeCodeLot || !memePoids)
                    throw new ApiError(409, "Cet identifiant d'opération a déjà été utilisé avec d'autres données.");
                await connexion.query("COMMIT"); return dejaCree;
            }
            const refs = await repository.verifierReferences(organisationId, { siteId: donnees.site_id }, connexion);
            if (!refs.site_ok) throw new ApiError(404, "Le site dépôt est introuvable.");
            const contenants = await repository.trouverUnitesParCodes(organisationId, codes, connexion, true);
            if (contenants.length !== codes.length || contenants.some(item => item.nature !== "contenant"))
                throw new ApiError(404, "Un contenant est introuvable.");
            if (contenants.some(item => item.statut !== "recu_depot"))
                throw new ApiError(409, "Tous les contenants doivent être reçus au dépôt.");
            if (contenants.some(item => item.site_courant_id !== donnees.site_id))
                throw new ApiError(409, "Tous les contenants doivent être reçus dans ce dépôt.");
            const matieres = [...new Set(contenants.map(item => item.type_dechet_id).filter(Boolean))];
            if (matieres.length !== 1) throw new ApiError(409, "Les contenants doivent porter la même matière.");
            const poidsCalcule = contenants.reduce((somme, item) => somme + Number(item.poids_courant || 0), 0);
            const poidsReel = donnees.poids_reel === undefined || donnees.poids_reel === null || donnees.poids_reel === ""
                ? poidsCalcule : Number(donnees.poids_reel);
            if (!Number.isFinite(poidsReel) || poidsReel <= 0)
                throw new ApiError(400, "Le poids du lot est requis si les contenants n'ont pas été pesés séparément.");
            const lot = await repository.regrouperLot({ organisation_id: organisationId,
                utilisateur_id: utilisateurId, operation_id: donnees.operation_id, site_id: donnees.site_id,
                survenu_le: donnees.survenu_le || new Date().toISOString(), type_dechet_id: matieres[0],
                poids_reel: poidsReel,
                tare_kg: contenants.reduce((somme, item) => somme + Number(item.tare_kg || 0), 0),
                code_qr: this.normaliserCode(donnees.code_qr, "lot") }, contenants, connexion);
            await stockService.ajouterAuStock(organisationId, matieres[0], poidsReel, lot.id, connexion);
            await connexion.query("COMMIT");
            return lot;
        } catch (erreur) {
            await connexion.query("ROLLBACK");
            if (erreur.code === "23505") {
                const existant = await repository.trouverLotParOperation(organisationId, donnees.operation_id);
                if (existant) return existant;
                throw new ApiError(409, "Le code du lot existe déjà.");
            }
            throw erreur;
        }
        finally { connexion.release(); }
    }
}

export default new TraceabiliteMatiereService();
