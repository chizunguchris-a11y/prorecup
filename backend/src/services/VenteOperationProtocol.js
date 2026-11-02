import { createHash } from 'node:crypto';
import ApiError from '../utils/ApiError.js';
const UUID4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function operationUuid(value) {
    if (!UUID4.test(String(value || ''))) throw new ApiError(400, "Un operation_id UUID v4 stable est obligatoire pour la vente.");
    return value.toLowerCase();
}
export function canoniserVente(vente, quantite, prix, devise) {
    if (!vente.cree_par) throw new ApiError(400, "L'auteur authentifié est obligatoire.");
    const acheteur = String(vente.acheteur_nom || '').trim();
    const reference = vente.reference_vente == null ? null : String(vente.reference_vente).trim() || null;
    if (acheteur.length < 2 || acheteur.length > 150 || (reference && reference.length > 100))
        throw new ApiError(400, 'Acheteur ou référence de vente invalide.');
    if (!Number.isFinite(prix) || prix < 0 || prix >= 1e10 || Math.abs(prix-Math.round(prix*100)/100)>1e-9)
        throw new ApiError(400, 'Le prix doit être fini, non négatif et limité à deux décimales.');
    return { version:1, stock_id:String(vente.stock_id).toLowerCase(), quantite:quantite.toFixed(3),
        prix_unitaire:prix.toFixed(2), devise:devise || null, acheteur_nom:acheteur, reference_vente:reference };
}
export const empreinteVente = demande => createHash('sha256').update(JSON.stringify(
    Object.fromEntries(Object.keys(demande).sort().map(key => [key,demande[key]]))
)).digest('hex');
export function verifierOperation(operation, auteur, demande) {
    if (!operation || operation.auteur_id !== auteur || operation.empreinte !== empreinteVente(demande) ||
        Object.keys(operation.demande || {}).length !== Object.keys(demande).length ||
        Object.entries(demande).some(([key,value]) => operation.demande[key] !== value))
        throw new ApiError(409, 'Cet UUID de vente est déjà utilisé par une autre intention ou un autre auteur.');
    if (!operation.reponse || !operation.vente_id || operation.reponse.operation_id !== operation.operation_id ||
        operation.reponse.vente?.id !== operation.vente_id)
        throw new ApiError(503, 'Journal de vente incomplet : vérification nécessaire, aucune nouvelle écriture effectuée.');
    return operation.reponse;
}
