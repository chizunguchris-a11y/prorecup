import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {canoniserVente,empreinteVente,operationUuid,verifierOperation} from '../src/services/VenteOperationProtocol.js';
test('M04 protocole : empreinte independante de l’ordre JSONB, parametres tous verifies',()=>{
 const demande=canoniserVente({cree_par:'auteur',stock_id:'stock',acheteur_nom:'Client'},7,2,'CDF');
 const reordered=Object.fromEntries(Object.entries(demande).reverse());assert.equal(empreinteVente(demande),empreinteVente(reordered));
 const id=randomUUID(),op={operation_id:id,auteur_id:'auteur',demande:reordered,empreinte:empreinteVente(demande),vente_id:'vente',reponse:{operation_id:id,vente:{id:'vente'}}};
 assert.deepEqual(verifierOperation(op,'auteur',demande),op.reponse);
 for(const change of [{quantite:'8.000'},{prix_unitaire:'3.00'},{devise:'USD'},{reference_vente:'autre'},{acheteur_nom:'Autre'},{stock_id:'autre'}])
  assert.throws(()=>verifierOperation(op,'auteur',{...demande,...change}),e=>e.statut===409);
 assert.throws(()=>verifierOperation(op,'autre',demande),e=>e.statut===409);
 assert.throws(()=>verifierOperation({...op,reponse:null},'auteur',demande),e=>e.statut===503);
});
test('M04 protocole : UUID stable obligatoire et prix representable',()=>{
 const id=randomUUID();assert.equal(operationUuid(id.toUpperCase()),id);
 for(const v of [null,'','pas-un-uuid'])assert.throws(()=>operationUuid(v),e=>e.statut===400);
 for(const prix of [NaN,Infinity,-1,1.123,1e10])assert.throws(()=>canoniserVente({cree_par:'a',stock_id:'s',acheteur_nom:'Client'},7,prix,'CDF'),e=>e.statut===400);
});
