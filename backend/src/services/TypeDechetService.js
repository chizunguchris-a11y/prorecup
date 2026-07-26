import typeDechetRepository
    from "../repositories/TypeDechetRepository.js";

class TypeDechetService {

    async lister() {

        return await typeDechetRepository.lister();

    }

}

export default new TypeDechetService();