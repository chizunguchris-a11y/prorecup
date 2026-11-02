import './mission03.setup.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const {default:service}=await import('../src/services/LotService.js');
const {default:pool}=await import('../src/config/db.js');
const {default:collectes}=await import('../src/repositories/CollecteRepository.js');
const {default:lots}=await import('../src/repositories/LotRepository.js');
const {default:trace}=await import('../src/repositories/TraceabiliteMatiereRepository.js');
const {default:stock}=await import('../src/services/StockService.js');
test('une collecte de 19 kg ne doit pas créer un lot de 20 kg',async()=>{
 pool.connect=async()=>({query:async()=>({rows:[]}),release(){}});
 const source={id:'c',organisation_id:'org',statut:'valide',poids_reel:19,type_dechet_id:'mat'};
 collectes.trouverParId=collectes.trouverParIdPourOrganisation=async()=>source;
 lots.trouverParCollecteId=async()=>null;lots.creer=async data=>({id:'lot',...data});
 trace.creerEvenement=async()=>{};trace.originesPourMiseAJour=async()=>[source];trace.contenantsPourCollecte=async()=>false;
 stock.ajouterAuStock=async()=>({tracabilite_lots_active:true});
 await assert.rejects(service.creer({organisation_id:'org',collecte_id:'c',type_dechet_id:'mat',poids_reel:20}),error=>error.statut===409);
});
