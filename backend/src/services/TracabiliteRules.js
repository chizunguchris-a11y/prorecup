import ApiError from '../utils/ApiError.js';
export function kilos(valeur, positif = true) {
    const n = Number(valeur);
    if (valeur == null || typeof valeur === 'boolean' || String(valeur).trim() === '' ||
        !Number.isFinite(n) || (positif ? n <= 0 : n < 0) || n >= 1e9 ||
        Math.abs(n - Math.round(n * 1000) / 1000) > 1e-9)
        throw new ApiError(400, 'Quantité invalide : kilogrammes finis, positifs et trois décimales au maximum.');
    return Math.round(n * 1000) / 1000;
}
export const grammes = valeur => Math.round(kilos(valeur, false) * 1000);
export function instant(valeur) {
    const date = new Date(valeur);
    if (typeof valeur !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(valeur) ||
        !Number.isFinite(date.getTime()) || date.getTime() > Date.now() + 300000)
        throw new ApiError(400, 'Instant de traçabilité invalide.');
    return date.toISOString();
}
