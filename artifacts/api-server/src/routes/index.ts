import { Router, type IRouter } from "express";
import healthRouter from "./health";
import subdomainsRouter from "./subdomains";
import emailsRouter from "./emails";
import addressesRouter from "./addresses";
import webhookRouter from "./webhook";

const router: IRouter = Router();

router.use(healthRouter);
router.use(subdomainsRouter);
router.use(emailsRouter);
router.use(addressesRouter);
router.use(webhookRouter);

export default router;
