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

export const doitSuperseder = (dateNouvelle, dateCourante) => {
    if (!dateCourante) return true;
    const nouvelle = new Date(dateNouvelle).getTime();
    const courante = new Date(dateCourante).getTime();
    return Number.isFinite(nouvelle) && Number.isFinite(courante) && nouvelle >= courante;
};
