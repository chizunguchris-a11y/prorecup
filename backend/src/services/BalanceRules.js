const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const TYPES_BALANCE = ["numerique", "mecanique"];
export const STATUTS_BALANCE = ["active", "maintenance", "hors_service"];

export const normaliserBalance = (entree = {}) => {
    const numeroInterne = String(entree.numero_interne || "").trim();
    const type = String(entree.type || "numerique").trim().toLowerCase();
    const capacite = Number(entree.capacite_max_kg);
    const precision = Number(entree.precision_kg);
    const tricycleId = entree.tricycle_id || null;
    const siteId = entree.site_id || null;
    const dateCalibrage = entree.date_calibrage || null;
    const prochainCalibrage = entree.prochain_calibrage || null;
    if (!numeroInterne || numeroInterne.length > 100) throw new Error("NUMERO_INVALIDE");
    if (!TYPES_BALANCE.includes(type)) throw new Error("TYPE_INVALIDE");
    if (!Number.isFinite(capacite) || capacite <= 0 ||
        !Number.isFinite(precision) || precision <= 0 || precision > capacite)
        throw new Error("MESURES_INVALIDES");
    if (tricycleId && siteId) throw new Error("AFFECTATION_DOUBLE");
    if ((tricycleId && !UUID.test(tricycleId)) || (siteId && !UUID.test(siteId)))
        throw new Error("AFFECTATION_INVALIDE");
    if (dateCalibrage && Number.isNaN(Date.parse(dateCalibrage))) throw new Error("CALIBRAGE_INVALIDE");
    if (prochainCalibrage && Number.isNaN(Date.parse(prochainCalibrage))) throw new Error("CALIBRAGE_INVALIDE");
    if (dateCalibrage && prochainCalibrage && prochainCalibrage < dateCalibrage)
        throw new Error("CALIBRAGE_INVALIDE");
    return { numero_interne: numeroInterne, type, capacite_max_kg: capacite,
        precision_kg: precision, tricycle_id: tricycleId, site_id: siteId,
        date_calibrage: dateCalibrage, prochain_calibrage: prochainCalibrage };
};
