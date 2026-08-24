import { Router } from "express";
import { dispatchService, listServices } from "../modules/service-gateway/service-gateway.controller";

const router = Router();

// Centralized service dispatch endpoint
router.post("/", dispatchService);

// Dev/Diagnostic list of services
router.get("/registry", listServices);

export default router;
