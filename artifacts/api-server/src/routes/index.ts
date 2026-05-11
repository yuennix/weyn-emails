import { Router, type IRouter } from "express";
import healthRouter from "./health";
import subdomainsRouter from "./subdomains";
import emailsRouter from "./emails";
import addressesRouter from "./addresses";

const router: IRouter = Router();

router.use(healthRouter);
router.use(subdomainsRouter);
router.use(emailsRouter);
router.use(addressesRouter);

export default router;
