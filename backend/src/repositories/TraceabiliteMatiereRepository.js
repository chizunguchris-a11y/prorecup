import pool from "../config/db.js";

class TraceabiliteMatiereRepository {
    async verifierReferences(organisationId, { siteId = null, clientId = null, typeDechetId = null }, connexion = pool) {
        const resultat = await connexion.query(`SELECT
          ($2::uuid IS NULL OR EXISTS (SELECT 1 FROM sites_de_collecte s WHERE s.id=$2 AND s.organisation_id=$1)) AS site_ok,
          ($3::uuid IS NULL OR EXISTS (SELECT 1 FROM clients c WHERE c.id=$3 AND c.organisation_id=$1)) AS client_ok,
          ($4::uuid IS NULL OR EXISTS (SELECT 1 FROM types_dechets td WHERE td.id=$4)) AS type_ok,
          ($2::uuid IS NULL OR $3::uuid IS NULL OR EXISTS(SELECT 1 FROM client_sites cs
            WHERE cs.site_id=$2 AND cs.client_id=$3 AND cs.organisation_id=$1 AND cs.actif=TRUE)) AS site_client_ok`,
        [organisationId, siteId, clientId, typeDechetId]);
        return resultat.rows[0];
    }

    async lotDirectPourCollecte(organisationId, collecteId, connexion = pool) {
        const result = await connexion.query('SELECT id FROM lots WHERE organisation_id=$1 AND collecte_id=$2 LIMIT 1', [organisationId, collecteId]);
        return result.rows.length > 0;
    }

    async contenantsPourCollecte(organisationId, collecteId, connexion = pool) {
        const result = await connexion.query('SELECT id FROM contenants WHERE organisation_id=$1 AND collecte_origine_id=$2 LIMIT 1', [organisationId, collecteId]);
        return result.rows.length > 0;
    }

    async originesPourMiseAJour(organisationId, ids, connexion = pool) {
        const result = await connexion.query(`SELECT co.id, co.statut, co.poids_reel, co.type_dechet_id,
            EXISTS(SELECT 1 FROM missions_collectes mc WHERE mc.collecte_id=co.id) AS parcours_present,
            (NOT EXISTS(SELECT 1 FROM missions_collectes mc JOIN missions m ON m.id=mc.mission_id WHERE mc.collecte_id=co.id AND m.statut IN ('planifiee','en_cours')) AND EXISTS(
              SELECT 1 FROM missions_collectes mc JOIN missions m ON m.id=mc.mission_id AND m.organisation_id=$1
              WHERE mc.collecte_id=co.id AND m.statut='terminee'
                AND EXISTS(SELECT 1 FROM mission_evenements e WHERE e.mission_id=m.id AND e.collecte_id=co.id AND e.type_evenement='collecte_terminee')
                AND EXISTS(SELECT 1 FROM preuves_collecte p WHERE p.organisation_id=$1 AND p.mission_id=m.id AND p.collecte_id=co.id AND p.type_preuve='avant_collecte')
                AND EXISTS(SELECT 1 FROM preuves_collecte p WHERE p.organisation_id=$1 AND p.mission_id=m.id AND p.collecte_id=co.id AND p.type_preuve='apres_collecte')
                AND EXISTS(SELECT 1 FROM pesees p WHERE p.organisation_id=$1 AND p.mission_id=m.id AND p.collecte_id=co.id AND p.type='terrain')
            )) AS parcours_complet,
            EXISTS(SELECT 1 FROM lots l WHERE l.organisation_id=$1 AND l.collecte_id=co.id) AS lot_direct,
            EXISTS(SELECT 1 FROM contenants source JOIN lot_contenants lien ON lien.contenant_id=source.id JOIN lots parent ON parent.id=lien.lot_id
              WHERE source.collecte_origine_id=co.id AND (
                parent.poids_reel IS NULL OR parent.poids_reel<=0 OR parent.poids_reel='NaN'::numeric OR source.organisation_id<>$1 OR parent.organisation_id<>$1 OR parent.type_dechet_id IS DISTINCT FROM co.type_dechet_id OR
                EXISTS(SELECT 1 FROM lot_contenants lc JOIN contenants ct ON ct.id=lc.contenant_id WHERE lc.lot_id=parent.id AND
                  (ct.organisation_id<>$1 OR ct.poids_courant_kg IS NULL OR ct.poids_courant_kg<=0 OR ct.type_dechet_id IS DISTINCT FROM parent.type_dechet_id)) OR
                ABS(parent.poids_reel-(SELECT SUM(ct.poids_courant_kg) FROM lot_contenants lc JOIN contenants ct ON ct.id=lc.contenant_id WHERE lc.lot_id=parent.id))>0.0005
              )) AS provenance_non_reconciliee,
            (SELECT COALESCE(SUM(ct.poids_courant_kg),0) FROM contenants ct
             WHERE ct.organisation_id=$1 AND ct.collecte_origine_id=co.id
               AND EXISTS(SELECT 1 FROM lot_contenants lc JOIN lots l ON l.id=lc.lot_id AND l.organisation_id=$1 WHERE lc.contenant_id=ct.id)) AS deja_loti_kg
            FROM collectes co JOIN clients cl ON cl.id=co.client_id AND cl.organisation_id=$1
            JOIN sites_de_collecte s ON s.id=co.site_id AND s.organisation_id=$1
            WHERE co.id=ANY($2::uuid[]) ORDER BY co.id FOR UPDATE OF co`, [organisationId, ids]);
        return result.rows;
    }

    async mesuresContenants(organisationId, ids, connexion = pool) {
        const result = await connexion.query(`SELECT c.id, p.poids_net, p.tare, p.collecte_id, p.date_heure
          FROM contenants c
          JOIN LATERAL (
            SELECT p.* FROM pesees p JOIN pesees_unites pu ON pu.pesee_id=p.id AND pu.contenant_id=c.id
            WHERE p.organisation_id=$1 AND p.type='depot'
              AND NOT EXISTS(SELECT 1 FROM pesees_unites autre WHERE autre.pesee_id=p.id
                AND (autre.contenant_id IS DISTINCT FROM c.id OR autre.lot_id IS NOT NULL))
            ORDER BY p.date_heure DESC,p.cree_le DESC,p.id DESC LIMIT 1
          ) p ON true
          WHERE c.organisation_id=$1 AND c.id=ANY($2::uuid[])`, [organisationId, ids]);
        return result.rows;
    }

    async trouverContenantParCode(organisationId, code, connexion = pool) {
        const result = await connexion.query('SELECT * FROM contenants WHERE organisation_id=$1 AND code_qr=$2', [organisationId,code]);
        return result.rows[0] || null;
    }

    async creerContenant(donnees, connexion = pool) {
        const resultat = await connexion.query(`INSERT INTO contenants
          (organisation_id,type_contenant,code_qr,tare_kg,statut,site_courant_id,client_courant_id,type_dechet_id)
          VALUES ($1,$2,$3,$4,'disponible',$5,$6,$7) RETURNING *`,
        [donnees.organisation_id, donnees.type_contenant, donnees.code_qr, donnees.tare_kg,
            donnees.site_courant_id, donnees.client_courant_id, donnees.type_dechet_id]);
        return resultat.rows[0];
    }

    async creerEvenement(donnees, connexion = pool) {
        await connexion.query(`INSERT INTO tracabilite_matiere_evenements
          (organisation_id,contenant_id,lot_id,type_evenement,operation_id,collecte_id,mission_id,pesee_id,
           site_id,client_id,utilisateur_id,survenu_le,details)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::timestamptz,$13::jsonb)
          ON CONFLICT DO NOTHING`, [donnees.organisation_id, donnees.contenant_id || null,
            donnees.lot_id || null, donnees.type_evenement, donnees.operation_id,
            donnees.collecte_id || null, donnees.mission_id || null, donnees.pesee_id || null,
            donnees.site_id || null, donnees.client_id || null, donnees.utilisateur_id,
            donnees.survenu_le, JSON.stringify(donnees.details || {})]);
    }

    async regrouperLot(donnees, contenants, connexion = pool) {
        const lot = (await connexion.query(`INSERT INTO lots
          (organisation_id,collecte_id,type_dechet_id,poids_reel,quantite_restante_kg,statut_lot,code_qr,tare_kg,site_courant_id,client_courant_id,operation_id)
          VALUES ($1,NULL,$2,$3,$3,'en_stock',$4,$5,$6,NULL,$7) RETURNING *`,
        [donnees.organisation_id, donnees.type_dechet_id, donnees.poids_reel,
            donnees.code_qr, donnees.tare_kg, donnees.site_id, donnees.operation_id])).rows[0];
        for (const contenant of contenants) {
            await connexion.query(`INSERT INTO lot_contenants (lot_id,contenant_id) VALUES ($1,$2)`, [lot.id, contenant.id]);
            await connexion.query(`UPDATE contenants SET statut='dans_lot',site_courant_id=$1,
                modifie_le=CURRENT_TIMESTAMP WHERE id=$2 AND organisation_id=$3`,
            [donnees.site_id, contenant.id, donnees.organisation_id]);
            await this.creerEvenement({ ...donnees, contenant_id: contenant.id, lot_id: null,
                type_evenement: "regroupement_lot", details: { lot_id: lot.id, code_qr_lot: lot.code_qr } }, connexion);
        }
        await this.creerEvenement({ ...donnees, contenant_id: null, lot_id: lot.id,
            type_evenement: "creation", details: { codes_contenants: contenants.map(item => item.code_qr) } }, connexion);
        return lot;
    }

    async trouverLotParOperation(organisationId, operationId, connexion = pool) {
        const resultat = await connexion.query(`SELECT l.*,
            (SELECT e.utilisateur_id FROM tracabilite_matiere_evenements e WHERE e.lot_id=l.id AND e.organisation_id=$1 AND e.type_evenement='creation' ORDER BY e.cree_le LIMIT 1) AS createur_id,
            (SELECT e.survenu_le FROM tracabilite_matiere_evenements e WHERE e.lot_id=l.id AND e.organisation_id=$1 AND e.type_evenement='creation' ORDER BY e.cree_le LIMIT 1) AS date_regroupement,
            COALESCE(array_agg(c.code_qr ORDER BY c.code_qr)
              FILTER (WHERE c.code_qr IS NOT NULL), ARRAY[]::varchar[]) AS codes_contenants
            FROM lots l
            LEFT JOIN lot_contenants lc ON lc.lot_id=l.id
            LEFT JOIN contenants c ON c.id=lc.contenant_id AND c.organisation_id=$1
            WHERE l.organisation_id=$1 AND l.operation_id=$2
            GROUP BY l.id LIMIT 1`, [organisationId, operationId]);
        return resultat.rows[0] || null;
    }

    async listerUnites(organisationId, connexion = pool) {
        const resultat = await connexion.query(`SELECT 'contenant' AS nature,c.id,c.code_qr,c.type_contenant AS type,
            c.tare_kg,c.statut,c.poids_courant_kg AS poids_courant,c.collecte_origine_id,c.site_courant_id,
            c.client_courant_id,c.type_dechet_id,td.nom AS matiere,s.nom AS site_nom,cl.nom AS client_nom,c.cree_le,c.modifie_le,
            NULL::numeric AS quantite_restante_kg
          FROM contenants c LEFT JOIN types_dechets td ON td.id=c.type_dechet_id
          LEFT JOIN sites_de_collecte s ON s.id=c.site_courant_id AND s.organisation_id=$1 LEFT JOIN clients cl ON cl.id=c.client_courant_id AND cl.organisation_id=$1
          WHERE c.organisation_id=$1
          UNION ALL
          SELECT 'lot',l.id,l.code_qr,'lot',l.tare_kg,l.statut_lot,l.poids_reel,l.collecte_id,l.site_courant_id,
            l.client_courant_id,l.type_dechet_id,td.nom,s.nom,cl.nom,l.cree_le,l.modifie_le,l.quantite_restante_kg
          FROM lots l LEFT JOIN types_dechets td ON td.id=l.type_dechet_id
          LEFT JOIN sites_de_collecte s ON s.id=l.site_courant_id AND s.organisation_id=$1 LEFT JOIN clients cl ON cl.id=l.client_courant_id AND cl.organisation_id=$1
          WHERE l.organisation_id=$1 ORDER BY cree_le DESC`, [organisationId]);
        return resultat.rows;
    }

    async trouverUnitesParCodes(organisationId, codes, connexion = pool, verrouiller = false) {
        if (!codes.length) return [];
        const verrou = verrouiller ? " FOR UPDATE" : "";
        const contenants = await connexion.query(`SELECT 'contenant' AS nature,id,code_qr,tare_kg,statut,
            site_courant_id,client_courant_id,collecte_origine_id,type_dechet_id,poids_courant_kg AS poids_courant
            FROM contenants WHERE organisation_id=$1 AND code_qr=ANY($2::text[]) ORDER BY id${verrou}`, [organisationId, codes]);
        const lots = await connexion.query(`SELECT 'lot' AS nature,id,code_qr,tare_kg,statut_lot AS statut,
            site_courant_id,client_courant_id,collecte_id AS collecte_origine_id,type_dechet_id,poids_reel AS poids_courant
            FROM lots WHERE organisation_id=$1 AND code_qr=ANY($2::text[]) ORDER BY id${verrou}`, [organisationId, codes]);
        return [...contenants.rows, ...lots.rows];
    }

    async listerPourTerrain(organisationId, connexion = pool) {
        const resultat = await connexion.query(`SELECT code_qr,type_contenant AS type,tare_kg,statut,
            site_courant_id,client_courant_id,type_dechet_id FROM contenants
            WHERE organisation_id=$1 AND statut IN ('disponible','en_collecte') ORDER BY code_qr`, [organisationId]);
        return resultat.rows;
    }

    async lierPesee(peseeId, unites, contexte, connexion = pool) {
        for (const unite of unites) {
            const contenantId = unite.nature === "contenant" ? unite.id : null;
            const lotId = unite.nature === "lot" ? unite.id : null;
            await connexion.query(`INSERT INTO pesees_unites (pesee_id,contenant_id,lot_id)
                VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [peseeId, contenantId, lotId]);
            await connexion.query(`INSERT INTO tracabilite_matiere_evenements
                (organisation_id,contenant_id,lot_id,type_evenement,operation_id,collecte_id,mission_id,pesee_id,
                 site_id,client_id,utilisateur_id,survenu_le,details)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::timestamptz,$13::jsonb) ON CONFLICT DO NOTHING`,
            [contexte.organisation_id, contenantId, lotId, contexte.type === "terrain" ? "pesee_terrain" : "pesee_depot",
                contexte.operation_id, contexte.collecte_id, contexte.mission_id, peseeId, contexte.site_id,
                contexte.client_id, contexte.utilisateur_id, contexte.survenu_le, JSON.stringify({ code_qr: unite.code_qr })]);
            if (contexte.type === "depot") await this.creerEvenement({
                ...contexte, contenant_id: contenantId, lot_id: lotId, pesee_id: peseeId,
                type_evenement: "reception_depot", details: { code_qr: unite.code_qr }
            }, connexion);
            if (contenantId) await connexion.query(`UPDATE contenants SET statut=$1,
                collecte_origine_id=COALESCE(collecte_origine_id,$2),site_courant_id=$3,
                client_courant_id=CASE WHEN $10::text='terrain' THEN $4::uuid ELSE NULL::uuid END,
                type_dechet_id=COALESCE(type_dechet_id,$5),
                poids_courant_kg=CASE WHEN $9=1 THEN $6 ELSE NULL END,modifie_le=CURRENT_TIMESTAMP
                WHERE id=$7 AND organisation_id=$8 AND NOT EXISTS (
                  SELECT 1 FROM pesees_unites pu JOIN pesees p ON p.id=pu.pesee_id
                  WHERE pu.contenant_id=$7 AND p.organisation_id=$8 AND p.type=$10
                    AND p.date_heure > $11::timestamptz
                )`, [contexte.type === "terrain" ? "en_collecte" : "recu_depot",
                contexte.collecte_id, contexte.site_id, contexte.client_id, contexte.type_dechet_id,
                contexte.poids_net, contenantId, contexte.organisation_id, contexte.nombre_unites, contexte.type, contexte.survenu_le]);
        }
    }

    async listerCodesPesee(peseeId, connexion = pool) {
        const resultat = await connexion.query(`SELECT COALESCE(c.code_qr,l.code_qr) AS code_qr FROM pesees_unites pu
          LEFT JOIN contenants c ON c.id=pu.contenant_id LEFT JOIN lots l ON l.id=pu.lot_id
          WHERE pu.pesee_id=$1 ORDER BY code_qr`, [peseeId]);
        return resultat.rows.map(row => row.code_qr);
    }

    async historique(organisationId, code, connexion = pool) {
        const resultat = await connexion.query(`WITH unite AS (
            SELECT 'contenant' AS nature,id,code_qr,NULL::numeric AS poids_initial,
              poids_courant_kg AS quantite_restante_kg
            FROM contenants WHERE organisation_id=$1 AND code_qr=$2
            UNION ALL
            SELECT 'lot',id,code_qr,poids_reel,quantite_restante_kg
            FROM lots WHERE organisation_id=$1 AND code_qr=$2)
          SELECT u.nature,u.id,u.code_qr,u.poids_initial,u.quantite_restante_kg,
            e.type_evenement,e.survenu_le,e.collecte_id,e.mission_id,e.pesee_id,e.details,
            s.nom AS site_nom,cl.nom AS client_nom,p.poids_brut,p.tare,p.poids_net,p.type AS type_pesee
          FROM unite u LEFT JOIN tracabilite_matiere_evenements e
            ON e.organisation_id=$1
            AND (e.mission_id IS NULL OR EXISTS(SELECT 1 FROM missions m WHERE m.id=e.mission_id AND m.organisation_id=$1))
            AND (e.pesee_id IS NULL OR EXISTS(SELECT 1 FROM pesees pe WHERE pe.id=e.pesee_id AND pe.organisation_id=$1))
            AND (e.collecte_id IS NULL OR EXISTS(SELECT 1 FROM collectes co JOIN clients cl2 ON cl2.id=co.client_id AND cl2.organisation_id=$1 WHERE co.id=e.collecte_id))
            AND ((u.nature='contenant' AND e.contenant_id=u.id) OR (u.nature='lot' AND e.lot_id=u.id))
          LEFT JOIN sites_de_collecte s ON s.id=e.site_id AND s.organisation_id=$1 LEFT JOIN clients cl ON cl.id=e.client_id AND cl.organisation_id=$1
          LEFT JOIN pesees p ON p.id=e.pesee_id AND p.organisation_id=$1 ORDER BY e.survenu_le ASC,e.cree_le ASC`, [organisationId, code]);
        return resultat.rows;
    }

    async listerContenantsLot(organisationId, lotId, connexion = pool) {
        const resultat = await connexion.query(`SELECT c.id,c.code_qr,c.collecte_origine_id,
            c.poids_courant_kg,c.tare_kg,cl.nom AS client_nom,s.nom AS site_nom,td.nom AS matiere
          FROM lot_contenants lc JOIN lots l ON l.id=lc.lot_id AND l.organisation_id=$1
          JOIN contenants c ON c.id=lc.contenant_id AND c.organisation_id=$1
          LEFT JOIN collectes co ON co.id=c.collecte_origine_id
          LEFT JOIN clients cl ON cl.id=co.client_id AND cl.organisation_id=$1 LEFT JOIN sites_de_collecte s ON s.id=co.site_id AND s.organisation_id=$1
          LEFT JOIN types_dechets td ON td.id=c.type_dechet_id
          WHERE lc.lot_id=$2 AND (c.collecte_origine_id IS NULL OR EXISTS(
            SELECT 1 FROM collectes origine JOIN clients client_origine ON client_origine.id=origine.client_id AND client_origine.organisation_id=$1 WHERE origine.id=c.collecte_origine_id
          )) ORDER BY lc.ajoute_le,c.code_qr`, [organisationId, lotId]);
        return resultat.rows;
    }
}

export default new TraceabiliteMatiereRepository();
