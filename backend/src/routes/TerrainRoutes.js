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

import terrainMissionController
    from "../controllers/TerrainMissionController.js";

import authMiddleware
    from "../middlewares/authMiddleware.js";

import terrainContextMiddleware
    from "../middlewares/terrainContextMiddleware.js";

import terrainController
    from "../controllers/TerrainController.js";


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


router.post(
    "/missions/:id/demarrer",
    authMiddleware,
    terrainContextMiddleware,
    terrainMissionController.demarrer
);


router.post(
    "/missions/:id/collectes/:collecteId/arrivee",
    authMiddleware,
    terrainContextMiddleware,
    terrainCollecteController.arrivee
);


router.post(
    "/missions/:id/collectes/:collecteId/demarrer",
    authMiddleware,
    terrainContextMiddleware,
    terrainCollecteController.demarrer
);


router.post(
    "/missions/:id/collectes/:collecteId/terminer",
    authMiddleware,
    terrainContextMiddleware,
    terrainCollecteController.terminer
);


router.post(
    "/missions/:id/terminer",
    authMiddleware,
    terrainContextMiddleware,
    terrainMissionController.terminer
);


router.post(
    "/missions/:id/incidents",
    authMiddleware,
    terrainContextMiddleware,
    terrainIncidentController.signaler
);


router.get(
    "/missions/:id/collectes/:collecteId/preuves/:preuveId/url",
    authMiddleware,
    terrainContextMiddleware,
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
    terrainPreuveUpload.single(
        "fichier"
    ),
    terrainPreuveController.creer
);


export default router;