(function () {
    'use strict';
    let running = null;
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const cle = () => {
        const user = ProRecup.obtenirUtilisateur();
        const org = user?.organisation_id || user?.organisationId;
        if (!user?.id || !org) throw new Error('Reconnectez-vous pour confirmer le propriétaire de la vente.');
        return 'prorecup-vente-v1:' + String(org).toLowerCase() + ':' + String(user.id).toLowerCase();
    };
    const normaliser = data => ({ stock_id:String(data.stock_id || '').toLowerCase(), quantite:Number(data.quantite),
        prix_unitaire:Number(data.prix_unitaire), devise:String(data.devise || '').trim().toUpperCase(),
        acheteur_nom:String(data.acheteur_nom || '').trim(), reference_vente:String(data.reference_vente || '').trim() || null });
    const lire = () => {
        const raw = localStorage.getItem(cle());
        if (!raw) return null;
        const saved = JSON.parse(raw);
        if (saved.version !== 1 || !uuid.test(saved.payload?.operation_id || '') ||
            saved.empreinte !== JSON.stringify(normaliser(saved.payload)))
            throw new Error('Tentative locale invalide : conservez-la et faites vérifier son état.');
        return saved;
    };
    const preparer = data => {
        const params = normaliser(data);
        if (!params.stock_id || !Number.isFinite(params.quantite) || params.quantite<=0 ||
            !Number.isFinite(params.prix_unitaire) || params.prix_unitaire<0 ||
            !/^[A-Z]{3}$/.test(params.devise) || params.acheteur_nom.length<2)
            throw new Error('Paramètres de vente invalides.');
        const previous = lire();
        const empreinte = JSON.stringify(params);
        if (previous) {
            if (previous.empreinte !== empreinte) throw new Error('Une vente attend confirmation. Reprenez la tentative d’origine.');
            return previous.payload;
        }
        const saved = { version:1, empreinte, payload:{...params,operation_id:crypto.randomUUID()}, cree_le:new Date().toISOString() };
        localStorage.setItem(cle(),JSON.stringify(saved));
        return saved.payload;
    };
    const envoyer = () => {
        const key = cle();
        if (running) {
            if (running.key !== key) return Promise.reject(new Error('Un envoi appartient à un autre compte. Attendez sa fin.'));
            return running.promise;
        }
        const run = async () => {
            const saved = lire();
            if (!saved) throw new Error('Aucune vente en attente.');
            let timeout;
            try {
                const expiration = new Promise((_,reject) => { timeout=setTimeout(() => reject(new Error('Résultat incertain : la même vente reste conservée pour reprise.')),35000); });
                const response = await Promise.race([ProRecup.requete('/api/ventes', {method:'POST',body:JSON.stringify(saved.payload),timeout:30000}),expiration]);
                if (cle() !== key) throw new Error('Le compte a changé. La tentative d’origine reste conservée.');
                const data=response?.data, vente=data?.vente, p=saved.payload;
                if (data?.operation_id !== p.operation_id || vente?.operation_id !== p.operation_id || !vente?.id ||
                    String(vente.stock_id).toLowerCase() !== p.stock_id || Number(vente.quantite)!==p.quantite ||
                    Number(vente.prix_unitaire)!==p.prix_unitaire || vente.devise!==p.devise ||
                    vente.acheteur_nom!==p.acheteur_nom || (vente.reference_vente || null)!==p.reference_vente)
                    throw new Error('Reçu de vente non confirmé. Réessayez la même opération, sans changer ses paramètres.');
                localStorage.removeItem(key);
                return response;
            } finally { clearTimeout(timeout); }
        };
        const promise=run().finally(()=>{running=null});running={key,promise};return promise;
    };
    window.ProRecupVenteOperation = {cle,lire,preparer,envoyer};
})();
