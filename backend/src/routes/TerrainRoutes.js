import express
    from "express";

import terrainJourneeController
    from "../controllers/TerrainJourneeController.js";

import terrainPreuveController
    from "../controllers/TerrainPreuveController.js";

import terrainPreuveUpload
    from "../middlewares/terrainPreuveUpload.js";

import terrainIncidentController
    from "../controllers/TerrainIncidentController.js";

import terrainCollecteController
    from "../controllers/TerrainCollecteController.js";

import terrainPeseeController
    from "../controllers/TerrainPeseeController.js";

import terrainMissionController
    from "../controllers/TerrainMissionController.js";

import authMiddleware
    from "../middlewares/authMiddleware.js";

import terrainContextMiddleware
    from "../middlewares/terrainContextMiddleware.js";

import terrainController
    from "../controllers/TerrainController.js";

import validationMiddleware
    from "../middlewares/validationMiddleware.js";

import {
    missionIdValidator,
    missionCollecteIdsValidator,
    preuveIdsValidator,
    actionMissionValidator,
    arriveeCollecteValidator,
    actionCollecteValidator,
    finCollecteValidator,
    peseeTerrainValidator,
    incidentTerrainValidator,
    preuveTerrainValidator
} from "../validators/terrainValidator.js";


const router =
    express.Router();


router.get(
    "/me",
    authMiddleware,
    terrainContextMiddleware,
    terrainController.me
);


router.get(
    "/journee",
    authMiddleware,
    terrainContextMiddleware,
    terrainJourneeController.obtenir
);


router.get(
    "/balances",
    authMiddleware,
    terrainContextMiddleware,
    terrainPeseeController.listerBalances
);


router.post(
    "/missions/:id/demarrer",
    authMiddleware,
    terrainContextMiddleware,
    missionIdValidator,
    actionMissionValidator,
    validationMiddleware,
    terrainMissionController.demarrer
);


router.post(
    "/missions/:id/collectes/:collecteId/arrivee",
    authMiddleware,
    terrainContextMiddleware,
    missionCollecteIdsValidator,
    arriveeCollecteValidator,
    validationMiddleware,
    terrainCollecteController.arrivee
);


router.post(
    "/missions/:id/collectes/:collecteId/demarrer",
    authMiddleware,
    terrainContextMiddleware,
    missionCollecteIdsValidator,
    actionCollecteValidator,
    validationMiddleware,
    terrainCollecteController.demarrer
);


router.post(
    "/missions/:id/collectes/:collecteId/terminer",
    authMiddleware,
    terrainContextMiddleware,
    missionCollecteIdsValidator,
    finCollecteValidator,
    validationMiddleware,
    terrainCollecteController.terminer
);


router.post(
    "/missions/:id/collectes/:collecteId/pesees",
    authMiddleware,
    terrainContextMiddleware,
    missionCollecteIdsValidator,
    peseeTerrainValidator,
    validationMiddleware,
    terrainPeseeController.creer
);


router.post(
    "/missions/:id/terminer",
    authMiddleware,
    terrainContextMiddleware,
    missionIdValidator,
    actionMissionValidator,
    validationMiddleware,
    terrainMissionController.terminer
);


router.post(
    "/missions/:id/incidents",
    authMiddleware,
    terrainContextMiddleware,
    missionIdValidator,
    incidentTerrainValidator,
    validationMiddleware,
    terrainIncidentController.signaler
);


router.get(
    "/missions/:id/collectes/:collecteId/preuves/:preuveId/url",
    authMiddleware,
    terrainContextMiddleware,
    preuveIdsValidator,
    validationMiddleware,
    terrainPreuveController.url
);


/*
 * Route temporaire de compatibilité.
 *
 * Elle pointe encore vers la même V2
 * pendant nos derniers tests.
 */
router.get(
    "/journee-v2",
    authMiddleware,
    terrainContextMiddleware,
    terrainJourneeController.obtenir
);


router.post(
    "/missions/:id/collectes/:collecteId/preuves",
    authMiddleware,
    terrainContextMiddleware,
    missionCollecteIdsValidator,
    validationMiddleware,
    terrainPreuveUpload.single(
        "fichier"
    ),
    preuveTerrainValidator,
    validationMiddleware,
    terrainPreuveController.creer
);


export default router;
