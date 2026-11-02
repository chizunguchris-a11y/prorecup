import { kilos, grammes, instant } from './TracabiliteRules.js';
import { randomUUID } from "node:crypto";
import QRCode from "qrcode";
import pool from "../config/db.js";
import repository from "../repositories/TraceabiliteMatiereRepository.js";
import ApiError from "../utils/ApiError.js";
import stockService from "./StockService.js";
import venteLotRepository from "../repositories/VenteLotRepository.js";

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
        if (!resultat.length || resultat.length > 200 || resultat.some(code => !QR.test(code))) throw new ApiError(400, "Un code QR est invalide.");
        return resultat;
    }

    async creerContenant(organisationId, utilisateurId, donnees) {
        if (!["sac", "bac"].includes(donnees.type_contenant)) throw new ApiError(400, "Le type doit être sac ou bac.");
        const tare = donnees.tare_kg === null || donnees.tare_kg === undefined || donnees.tare_kg === ""
            ? null : kilos(donnees.tare_kg, false);
        if (tare !== null && (!Number.isFinite(tare) || tare < 0)) throw new ApiError(400, "La tare est invalide.");
        const connexion = await pool.connect();
        try {
            await connexion.query("BEGIN");
            if (donnees.code_qr) {
                const code = this.normaliserCode(donnees.code_qr, 'contenant');
                await connexion.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [code]);
                const existing = await repository.trouverContenantParCode(organisationId, code, connexion);
                if (existing) {
                    if (existing.type_contenant !== donnees.type_contenant ||
                        (existing.tare_kg == null ? null : Number(existing.tare_kg)) !== tare ||
                        (existing.site_courant_id || null) !== (donnees.site_courant_id || null) ||
                        (existing.client_courant_id || null) !== (donnees.client_courant_id || null) ||
                        (existing.type_dechet_id || null) !== (donnees.type_dechet_id || null))
                        throw new ApiError(409, 'Ce QR est déjà lié à un contenant avec des données différentes.');
                    await connexion.query('COMMIT');return existing;
                }
            }
            const refs = await repository.verifierReferences(organisationId, {
                siteId: donnees.site_courant_id || null, clientId: donnees.client_courant_id || null,
                typeDechetId: donnees.type_dechet_id || null
            }, connexion);
            if (!refs.site_ok || !refs.client_ok || !refs.type_ok) throw new ApiError(404, "Site, client ou matière introuvable dans votre organisation.");
            if (donnees.site_courant_id && donnees.client_courant_id && refs.site_client_ok !== true)
                throw new ApiError(409, 'Ce site n’est pas associé à ce client.');
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
        const unite = {
            nature: lignes[0].nature,
            id: lignes[0].id,
            code_qr: lignes[0].code_qr,
            poids_initial: lignes[0].poids_initial,
            quantite_restante_kg: lignes[0].quantite_restante_kg
        };
        const filiation = unite.nature === "lot"
            ? await repository.listerContenantsLot(organisationId, unite.id) : [];
        const ventes = unite.nature === "lot"
            ? await venteLotRepository.listerParLot(unite.id, organisationId) : [];
        return { unite, filiation, ventes, historique: lignes };
    }

    async etiquette(organisationId, code) {
        const resultat = await this.historique(organisationId, code);
        return { ...resultat.unite, svg: await QRCode.toString(resultat.unite.code_qr,
            { type: "svg", errorCorrectionLevel: "M", margin: 2, width: 320 }) };
    }

    verifierRegroupementExistant(lot, donnees, codes, utilisateurId) {
        if (lot.site_courant_id !== donnees.site_id || JSON.stringify(lot.codes_contenants || []) !== JSON.stringify(codes) ||
            (donnees.code_qr && lot.code_qr !== this.normaliserCode(donnees.code_qr, 'lot')) ||
            (donnees.poids_reel != null && donnees.poids_reel !== '' && grammes(lot.poids_reel) !== grammes(kilos(donnees.poids_reel))) ||
            lot.createur_id !== utilisateurId ||
            (donnees.survenu_le && Date.parse(lot.date_regroupement) !== Date.parse(instant(donnees.survenu_le))))
            throw new ApiError(409, "Cet identifiant d'opération a déjà été utilisé avec d'autres données.");
    }

    async regrouper(organisationId, utilisateurId, donnees) {
        if (!UUID.test(String(donnees.operation_id || ""))) throw new ApiError(400, "L'identifiant d'opération est invalide.");
        if (!UUID.test(String(donnees.site_id || ""))) throw new ApiError(400, "Le site dépôt est obligatoire.");
        const codes = this.normaliserCodes(donnees.codes_qr).sort();
        const connexion = await pool.connect();
        try {
            await connexion.query("BEGIN");
            await connexion.query("SET LOCAL lock_timeout = '5s'");
            await connexion.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [donnees.operation_id]);
            const dejaCree = await repository.trouverLotParOperation(organisationId, donnees.operation_id, connexion);
            if (dejaCree) {
                this.verifierRegroupementExistant(dejaCree, donnees, codes, utilisateurId);
                await connexion.query("COMMIT"); return dejaCree;
            }
            const refs = await repository.verifierReferences(organisationId, { siteId: donnees.site_id }, connexion);
            if (!refs.site_ok) throw new ApiError(404, "Le site dépôt est introuvable.");
            let contenants = await repository.trouverUnitesParCodes(organisationId, codes, connexion, false);
            if (contenants.length !== codes.length || contenants.some(item => item.nature !== "contenant"))
                throw new ApiError(404, "Un contenant est introuvable.");
            if (contenants.some(item => item.statut !== "recu_depot"))
                throw new ApiError(409, "Tous les contenants doivent être reçus au dépôt.");
            if (contenants.some(item => item.site_courant_id !== donnees.site_id))
                throw new ApiError(409, "Tous les contenants doivent être reçus dans ce dépôt.");
            const matieres = [...new Set(contenants.map(item => item.type_dechet_id).filter(Boolean))];
            if (matieres.length !== 1) throw new ApiError(409, "Les contenants doivent porter la même matière.");
            if (contenants.some(item => !item.collecte_origine_id || !item.type_dechet_id || item.poids_courant == null))
                throw new ApiError(409, 'Provenance ou poids individuel manquant : réconciliation nécessaire avant regroupement.');
            const origines = await repository.originesPourMiseAJour(organisationId,
                [...new Set(contenants.map(item => item.collecte_origine_id))].sort(), connexion);
            const verrouilles = await repository.trouverUnitesParCodes(organisationId, codes, connexion, true);
            if (verrouilles.length !== contenants.length || verrouilles.some(item =>
                item.nature !== 'contenant' || item.statut !== 'recu_depot' || item.site_courant_id !== donnees.site_id ||
                item.type_dechet_id !== matieres[0] || item.poids_courant == null ||
                item.collecte_origine_id !== contenants.find(old => old.id === item.id)?.collecte_origine_id))
                throw new ApiError(409, 'Les contenants ont changé pendant le regroupement. Relisez leur état.');
            contenants = verrouilles;
            const mesures = await repository.mesuresContenants(organisationId, contenants.map(item => item.id), connexion);
            for (const item of contenants) {
                const mesure = mesures.find(row => row.id === item.id);
                if (!mesure || mesure.collecte_id !== item.collecte_origine_id || grammes(mesure.poids_net) !== grammes(kilos(item.poids_courant)))
                    throw new ApiError(409, 'Chaque contenant doit avoir une pesée dépôt individuelle cohérente.');
            }
            for (const id of new Set(contenants.map(item => item.collecte_origine_id))) {
                const origine = origines.find(row => row.id === id);
                const demande = contenants.filter(item => item.collecte_origine_id === id).reduce((sum,item) => sum + grammes(item.poids_courant),0);
                if (!origine || origine.provenance_non_reconciliee || (origine.parcours_present && !origine.parcours_complet) || origine.statut !== 'valide' || origine.type_dechet_id !== matieres[0] || origine.lot_direct ||
                    demande + grammes(origine.deja_loti_kg) > grammes(kilos(origine.poids_reel)))
                    throw new ApiError(409, 'La quantité et la provenance validées de la collecte ne permettent pas ce regroupement.');
            }
            const poidsCalcule = contenants.reduce((somme, item) => somme + grammes(item.poids_courant), 0) / 1000;
            const poidsReel = donnees.poids_reel === undefined || donnees.poids_reel === null || donnees.poids_reel === ""
                ? poidsCalcule : kilos(donnees.poids_reel);
            kilos(poidsReel);
            if (grammes(poidsReel) !== grammes(poidsCalcule))
                throw new ApiError(409, 'Le poids du lot doit égaler la somme de ses contenants mesurés.');
            const survenuLe = instant(donnees.survenu_le || new Date().toISOString());
            if (mesures.some(mesure => !Number.isFinite(Date.parse(mesure.date_heure)) || Date.parse(mesure.date_heure) > Date.parse(survenuLe)))
                throw new ApiError(409, 'Le regroupement doit être postérieur aux pesées dépôt de ses contenants.');
            const lot = await repository.regrouperLot({ organisation_id: organisationId,
                utilisateur_id: utilisateurId, operation_id: donnees.operation_id, site_id: donnees.site_id,
                survenu_le: survenuLe, type_dechet_id: matieres[0],
                poids_reel: poidsReel,
                tare_kg: mesures.reduce((somme, item) => somme + grammes(kilos(item.tare, false)), 0) / 1000,
                code_qr: this.normaliserCode(donnees.code_qr, "lot") }, contenants, connexion);
            const stock = await stockService.ajouterAuStock(
                organisationId,
                matieres[0],
                poidsReel,
                lot.id,
                connexion
            );
            if (stock.tracabilite_lots_active !== true) {
                lot.quantite_restante_kg = null;
            }
            await connexion.query("COMMIT");
            return lot;
        } catch (erreur) {
            await connexion.query("ROLLBACK");
            if (erreur.code === "23505") {
                const existant = await repository.trouverLotParOperation(organisationId, donnees.operation_id);
                if (existant) {
                    this.verifierRegroupementExistant(existant, donnees, codes, utilisateurId);
                    return existant;
                }
                throw new ApiError(409, "Le code du lot existe déjà.");
            }
            throw erreur;
        }
        finally { connexion.release(); }
    }
}

export default new TraceabiliteMatiereService();
