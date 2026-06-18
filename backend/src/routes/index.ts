import { Router } from "express";
import channelsRouter from "./channels";
import programsRouter from "./programs";

const apiRouter = Router();

apiRouter.use("/channels", channelsRouter);
apiRouter.use("/programs", programsRouter);

export default apiRouter;
