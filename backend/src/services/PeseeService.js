import pool from "../config/db.js";
import peseeRepository from "../repositories/PeseeRepository.js";
import ApiError from "../utils/ApiError.js";
import { calculerPoidsNet, doitSuperseder, normaliserInstantIso, respectePrecision } from "./PeseeRules.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class PeseeService {
    validerUuid(valeur, nom) {
        if (!UUID.test(String(valeur || ""))) throw new ApiError(400, `${nom} est invalide.`);
    }

    normaliser(donnees, balance, type) {
        const poidsBrut = Number(donnees.poids_brut);
        const tare = Number(donnees.tare);
        let poidsNet;
        try {
            poidsNet = calculerPoidsNet(poidsBrut, tare);
        } catch {
            throw new ApiError(400, "Le poids brut et la tare sont invalides.");
        }
        if (poidsBrut > Number(balance.capacite_max_kg))
            throw new ApiError(400, "Le poids brut dépasse la capacité maximale de la balance.");
        const precision = Number(balance.precision_kg);
        if (!respectePrecision(poidsBrut, precision) || !respectePrecision(tare, precision))
            throw new ApiError(400, `Les poids doivent respecter la précision de ${precision} kg de la balance.`);
        const dateHeure = normaliserInstantIso(donnees.date_heure);
        if (!dateHeure || new Date(dateHeure).getTime() > Date.now() + 5 * 60 * 1000)
            throw new ApiError(400, "La date et l'heure de pesée sont invalides.");
        const latitude = donnees.latitude === undefined || donnees.latitude === null ? null : Number(donnees.latitude);
        const longitude = donnees.longitude === undefined || donnees.longitude === null ? null : Number(donnees.longitude);
        const precisionGps = donnees.precision_gps === undefined || donnees.precision_gps === null ? null : Number(donnees.precision_gps);
        if (type === "terrain" && (latitude === null || longitude === null))
            throw new ApiError(400, "Le GPS est obligatoire pour une pesée terrain.");
        if ((latitude !== null && (!Number.isFinite(latitude) || Math.abs(latitude) > 90)) ||
            (longitude !== null && (!Number.isFinite(longitude) || Math.abs(longitude) > 180)) ||
            (precisionGps !== null && (!Number.isFinite(precisionGps) || precisionGps < 0)))
            throw new ApiError(400, "Les coordonnées GPS sont invalides.");
        return { poidsBrut, tare, poidsNet,
            dateHeure, latitude, longitude, precisionGps };
    }

    async listerBalances(organisationId) {
        return peseeRepository.listerBalances(organisationId);
    }

    async enregistrer(missionId, collecteId, identite, donnees, type = "terrain") {
        [missionId, collecteId, donnees.operation_id, donnees.balance_id].forEach((valeur, index) =>
            this.validerUuid(valeur, ["La mission", "La collecte", "L'opération", "La balance"][index]));
        const connexion = await pool.connect();
        try {
            await connexion.query("BEGIN");
            const existante = await peseeRepository.trouverParOperation(
                donnees.operation_id, identite.organisation_id, connexion);
            if (existante) {
                if (existante.mission_id !== missionId || existante.collecte_id !== collecteId ||
                    existante.utilisateur_id !== identite.utilisateur_id || existante.type !== type ||
                    existante.balance_id !== donnees.balance_id ||
                    Number(existante.poids_brut) !== Number(donnees.poids_brut) ||
                    Number(existante.tare) !== Number(donnees.tare) ||
                    new Date(existante.date_heure).getTime() !== new Date(donnees.date_heure).getTime())
                    throw new ApiError(409, "Cet identifiant d'opération a déjà été utilisé.");
                await connexion.query("COMMIT");
                return { deja_traitee: true, pesee: existante };
            }
            const contexte = await peseeRepository.trouverContexte(
                missionId, collecteId, identite.organisation_id,
                type === "terrain" ? identite.agent_id : null, connexion);
            if (!contexte) throw new ApiError(404, "Mission ou collecte introuvable pour cet utilisateur.");
            if (type === "terrain" && contexte.mission_statut !== "en_cours")
                throw new ApiError(409, "La mission doit être en cours pour enregistrer la pesée terrain.");
            const balance = await peseeRepository.trouverBalance(donnees.balance_id, identite.organisation_id, connexion);
            if (!balance || balance.statut !== "active") throw new ApiError(409, "Cette balance n'est pas disponible.");
            if (balance.tricycle_id && balance.tricycle_id !== contexte.tricycle_id)
                throw new ApiError(409, "Cette balance est affectée à un autre tricycle.");
            if (balance.site_id && balance.site_id !== contexte.site_id)
                throw new ApiError(409, "Cette balance est affectée à un autre site.");
            const valeurs = this.normaliser(donnees, balance, type);
            if (type === "terrain") {
                if (!contexte.collecte_demarree_le)
                    throw new ApiError(409, "La collecte doit être démarrée avant la pesée.");
                if (new Date(valeurs.dateHeure) < new Date(contexte.collecte_demarree_le))
                    throw new ApiError(409, "La pesée ne peut pas précéder le démarrage de la collecte.");
            }
            const derniere = await peseeRepository.trouverDerniere(
                collecteId, identite.organisation_id, type, connexion);
            const devientCourante = doitSuperseder(valeurs.dateHeure, derniere?.date_heure);
            let pesee = await peseeRepository.creer({
                organisation_id: identite.organisation_id, collecte_id: collecteId,
                mission_id: missionId, agent_id: contexte.agent_id,
                utilisateur_id: identite.utilisateur_id, balance_id: balance.id,
                poids_brut: valeurs.poidsBrut, tare: valeurs.tare,
                date_heure: valeurs.dateHeure, latitude: valeurs.latitude,
                longitude: valeurs.longitude, precision_gps: valeurs.precisionGps,
                operation_id: donnees.operation_id, type,
                remplace_pesee_id: devientCourante ? derniere?.id || null : null
            }, connexion);
            if (!pesee) pesee = await peseeRepository.trouverParOperation(
                donnees.operation_id, identite.organisation_id, connexion);
            if (!pesee) throw new ApiError(409, "Cet identifiant d'opération est déjà utilisé.");
            if (type === "terrain" && devientCourante) await peseeRepository.mettreAJourPoidsCompatible(
                collecteId, valeurs.poidsNet, identite.utilisateur_id, valeurs.dateHeure, connexion);
            await connexion.query("COMMIT");
            return { deja_traitee: false, est_courante: devientCourante,
                pesee: { ...pesee, poids_net: valeurs.poidsNet },
                avertissement_calibrage: balance.prochain_calibrage &&
                    new Date(balance.prochain_calibrage) < new Date() ? "calibrage_expire" : null };
        } catch (erreur) {
            await connexion.query("ROLLBACK");
            throw erreur;
        } finally {
            connexion.release();
        }
    }
}

export default new PeseeService();
