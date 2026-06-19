import { Router } from "express";
import channelsRouter from "./channels";
import programsRouter from "./programs";
import settingsRouter from "./settings";

const apiRouter = Router();

apiRouter.use("/channels", channelsRouter);
apiRouter.use("/programs", programsRouter);
apiRouter.use(settingsRouter);

export default apiRouter;
