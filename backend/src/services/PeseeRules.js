export const respectePrecision = (valeur, precision) =>
    Number.isFinite(valeur) && Number.isFinite(precision) && precision > 0 &&
    Math.abs(valeur / precision - Math.round(valeur / precision)) < 1e-7;

export const calculerPoidsNet = (poidsBrut, tare) => {
    if (![poidsBrut, tare].every(Number.isFinite) || poidsBrut < 0 || tare < 0 || tare > poidsBrut)
        throw new Error("POIDS_INVALIDES");
    return Math.round((poidsBrut - tare) * 1000) / 1000;
};

export const calculerEcartRelatif = (poidsTerrain, poidsDepot, seuilPourcent = 5) => {
    if (![poidsTerrain, poidsDepot, seuilPourcent].every(Number.isFinite) ||
        poidsTerrain < 0 || poidsDepot < 0 || seuilPourcent < 0) return null;
    if (poidsTerrain === 0) return {
        pourcentage: poidsDepot === 0 ? 0 : null,
        anomalie: poidsDepot !== 0
    };
    const pourcentage = Math.round(Math.abs(poidsDepot - poidsTerrain) / poidsTerrain * 10000) / 100;
    return { pourcentage, anomalie: pourcentage > seuilPourcent };
};

const INSTANT_ISO_AVEC_FUSEAU =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|([+-])(\d{2}):(\d{2}))$/;

export const normaliserInstantIso = valeur => {
    if (typeof valeur !== "string") return null;
    const morceaux = valeur.match(INSTANT_ISO_AVEC_FUSEAU);
    if (!morceaux) return null;
    const [, annee, mois, jour, heure, minute, seconde, signe, heureFuseau, minuteFuseau] = morceaux;
    const joursDansMois = new Date(Date.UTC(Number(annee), Number(mois), 0)).getUTCDate();
    if (Number(mois) < 1 || Number(mois) > 12 || Number(jour) < 1 || Number(jour) > joursDansMois ||
        Number(heure) > 23 || Number(minute) > 59 || Number(seconde) > 59 ||
        (signe && (Number(heureFuseau) > 23 || Number(minuteFuseau) > 59))) return null;
    const instant = new Date(valeur);
    return Number.isFinite(instant.getTime()) ? instant.toISOString() : null;
};

export const doitSuperseder = (dateNouvelle, dateCourante) => {
    if (!dateCourante) return true;
    const nouvelle = new Date(dateNouvelle).getTime();
    const courante = new Date(dateCourante).getTime();
    return Number.isFinite(nouvelle) && Number.isFinite(courante) && nouvelle >= courante;
};

export const balanceCompatibleAvecUsage = (balance, contexte, type) => {
    if (!balance || !contexte || !["terrain", "depot"].includes(type)) return false;
    if (type === "terrain")
        return !balance.site_id &&
            (!balance.tricycle_id || balance.tricycle_id === contexte.tricycle_id);
    return !balance.tricycle_id &&
        (!balance.site_id || balance.site_id === contexte.site_id);
};
