import pool from "../config/db.js";

class ClientOnboardingRepository {
    async creer(donnees, connexion = pool) {
        const resultat = await connexion.query(`
            INSERT INTO client_onboarding_requests (
                organisation_nom, nom_contact, email_contact, telephone_contact,
                pays, ville, identifiant_legal, message, adresse_ip, user_agent
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            RETURNING id, statut, cree_le;
        `, [
            donnees.organisationNom, donnees.nomContact, donnees.emailContact,
            donnees.telephoneContact || null, donnees.pays, donnees.ville || null,
            donnees.identifiantLegal || null, donnees.message || null,
            donnees.adresseIp || null, donnees.userAgent || null
        ]);
        return resultat.rows[0];
    }

    async lister({ statut, page = 1, limite = 50 }, connexion = pool) {
        const offset = (page - 1) * limite;
        const valeurs = [];
        let condition = "";
        if (statut) { valeurs.push(statut); condition = `WHERE statut = $${valeurs.length}`; }
        valeurs.push(limite, offset);
        const resultat = await connexion.query(`
            SELECT id, organisation_nom, nom_contact, email_contact, telephone_contact,
                   pays, ville, identifiant_legal, message, statut, notes_internes,
                   traite_par, cree_le, modifie_le
            FROM client_onboarding_requests
            ${condition}
            ORDER BY cree_le DESC
            LIMIT $${valeurs.length - 1} OFFSET $${valeurs.length};
        `, valeurs);
        return resultat.rows;
    }

    async modifierStatut(id, statut, notesInternes, utilisateurId, connexion = pool) {
        const resultat = await connexion.query(`
            UPDATE client_onboarding_requests
            SET statut = $1, notes_internes = $2, traite_par = $3, modifie_le = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING id, statut, modifie_le;
        `, [statut, notesInternes || null, utilisateurId, id]);
        return resultat.rows[0] || null;
    }
}

export default new ClientOnboardingRepository();
