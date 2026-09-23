import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import roleMiddleware from "../middlewares/roleMiddleware.js";
import balanceController from "../controllers/BalanceController.js";

const router = express.Router();
const administrer = roleMiddleware(["manager", "admin"]);

router.get("/", authMiddleware, administrer, balanceController.lister);
router.post("/", authMiddleware, administrer, balanceController.creer);
router.put("/:id", authMiddleware, administrer, balanceController.modifier);
router.patch("/:id/statut", authMiddleware, administrer, balanceController.modifierStatut);

export default router;
