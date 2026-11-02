import ApiError from '../utils/ApiError.js';

// Called under the mission row lock and in the same transaction as the write.
export async function verifierEtape(connexion, missionId, collecteId, action, instant) {
    const { rows } = await connexion.query(`
        SELECT
          (SELECT MIN(survenu_le) FROM mission_evenements WHERE mission_id=$1 AND collecte_id=$2 AND type_evenement='collecte_demarree') AS debut,
          (SELECT MAX(survenu_le) FROM mission_evenements WHERE mission_id=$1 AND collecte_id=$2 AND type_evenement='collecte_terminee') AS fin,
          (SELECT MIN(pris_le) FROM preuves_collecte WHERE mission_id=$1 AND collecte_id=$2 AND type_preuve='avant_collecte') AS avant,
          (SELECT MAX(date_heure) FROM pesees WHERE mission_id=$1 AND collecte_id=$2 AND type='terrain') AS pesee
    `, [missionId, collecteId]);
    const etape = rows[0] || {};
    const date = Date.parse(instant);
    const requis = action === 'apres_collecte' ? ['fin'] :
        action === 'terminer_collecte' ? ['debut', 'avant', 'pesee'] :
        action === 'enregistrer_pesee' ? ['debut', 'avant'] : ['debut'];
    if (!Number.isFinite(date) || requis.some(key => !etape[key] || !Number.isFinite(Date.parse(etape[key])) || Date.parse(etape[key]) > date))
        throw new ApiError(409, 'Les étapes précédentes et leur chronologie doivent être validées avant cette action.');
    if (action === 'enregistrer_pesee' && etape.fin)
        throw new ApiError(409, 'Une collecte terminée ne peut plus recevoir de nouvelle pesée terrain.');
    if (action === 'avant_collecte' && etape.fin && date > Date.parse(etape.fin))
        throw new ApiError(409, 'La preuve avant collecte ne peut pas être postérieure à sa fin.');
}

export async function verifierFinMission(connexion, missionId, instant) {
    const { rows } = await connexion.query(`
      SELECT COUNT(*)::integer AS incompletes
      FROM missions_collectes mc
      WHERE mc.mission_id=$1 AND (
        NOT EXISTS (SELECT 1 FROM preuves_collecte p WHERE p.mission_id=mc.mission_id AND p.collecte_id=mc.collecte_id AND p.type_preuve='avant_collecte' AND p.pris_le <= $2::timestamptz)
        OR NOT EXISTS (SELECT 1 FROM preuves_collecte p WHERE p.mission_id=mc.mission_id AND p.collecte_id=mc.collecte_id AND p.type_preuve='apres_collecte' AND p.pris_le <= $2::timestamptz)
        OR NOT EXISTS (SELECT 1 FROM pesees p WHERE p.mission_id=mc.mission_id AND p.collecte_id=mc.collecte_id AND p.type='terrain' AND p.date_heure <= $2::timestamptz)
        OR NOT EXISTS (SELECT 1 FROM mission_evenements e WHERE e.mission_id=mc.mission_id AND e.collecte_id=mc.collecte_id AND e.type_evenement='collecte_terminee' AND e.survenu_le <= $2::timestamptz)
      )
    `, [missionId, instant]);
    if (!rows[0] || Number(rows[0].incompletes) > 0)
        throw new ApiError(409, 'Les preuves avant/après, pesées et fins de collecte doivent être synchronisées avant la fin de mission.');
}

export function verifierReplay(evenement, donnees) {
    const egalNombre = (a, b) => (a == null || a === '' ? null : Number(a)) === (b == null || b === '' ? null : Number(b));
    if (Date.parse(evenement.survenu_le) !== Date.parse(donnees.survenu_le) ||
        ['latitude', 'longitude', 'precision_gps'].some(key => !egalNombre(evenement[key], donnees[key])) ||
        (donnees.resultat_terrain !== undefined && (
            evenement.contexte?.resultat_terrain !== donnees.resultat_terrain ||
            !egalNombre(evenement.contexte?.poids_reel_kg, donnees.poids_reel) ||
            (evenement.contexte?.motif_terrain || null) !== (donnees.motif_terrain?.trim() || null))))
        throw new ApiError(409, 'Cet identifiant est déjà lié à des données différentes.');
    if (donnees.categorie !== undefined && (
        evenement.contexte?.categorie !== String(donnees.categorie).trim().toLowerCase() ||
        evenement.contexte?.gravite !== String(donnees.gravite).trim().toLowerCase() ||
        evenement.contexte?.bloquant !== (donnees.bloquant === true) ||
        (evenement.collecte_id || null) !== (donnees.collecte_id || null) ||
        evenement.observations !== String(donnees.description || '').trim()))
        throw new ApiError(409, 'Cet identifiant est déjà lié à un autre signalement.');
}
