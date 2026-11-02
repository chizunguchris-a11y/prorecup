// Journal doubled only for inherited FIFO/carbon unit tests. Real idempotence is tested on PostgreSQL.
import operations from '../src/repositories/VenteOperationRepository.js';
export function doublerJournalVente() {
    const original={reserver:operations.reserver,terminer:operations.terminer};
    operations.reserver=async()=>true;
    operations.terminer=async(org,op,author,id,response)=>JSON.parse(JSON.stringify(response));
    return ()=>Object.assign(operations,original);
}
