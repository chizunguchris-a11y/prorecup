import repository from '../repositories/PortailClientRepository.js';
import ApiError from '../utils/ApiError.js';
const mesure = value => value == null || !Number.isFinite(Number(value)) || Number(value)<0 ? null : Number(value);
export function projectionClient(rows) {
    return rows.map(row => ({
        lot_id: row.lot_id, code_qr: row.code_qr, collecte_id: row.collecte_id,
        source_type: row.source_type, statut_lot: row.statut_lot,
        quantite_origine_kg: mesure(row.quantite_origine_kg),
        reste_attribuable_kg: row.source_type === 'collecte_directe' ? mesure(row.reste_attribuable_kg) : null,
        provenance_statut: mesure(row.quantite_origine_kg) === null ? 'a_reconcilier' : 'filiation_documentee',
        co2e_attribuable_kg: null
    }));
}
export async function consulterQr(utilisateurId, organisationId, code) {
    const normalized = String(code || '').trim().toUpperCase();
    if (!/^PR-L-[A-Z0-9-]{6,60}$/.test(normalized)) throw new ApiError(400, 'QR de lot invalide.');
    const rows = await repository.tracabiliteAutorisee(utilisateurId, organisationId, null, normalized);
    if (!rows.length) throw new ApiError(404, 'Lot introuvable.');
    return { contributions: projectionClient(rows), message: 'Seules les contributions de vos collectes autorisées sont présentées. Le reste d’un lot regroupé et le CO2e individuel ne sont pas attribués.' };
}
