import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiRouter from "./ai";
import userRouter from "./user";
import adminRouter from "./admin";
import paymentRouter from "./payment";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/ai", aiRouter);
router.use("/user", userRouter);
router.use("/admin", adminRouter);
router.use("/payment", paymentRouter);

export default router;
