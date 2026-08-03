import { Router } from "express";
import healthRouter from "./health";
import uploadRouter from "./upload";
import alertsRouter from "./alerts";
import ttsRouter from "./tts";

const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(uploadRouter);
apiRouter.use(alertsRouter);
apiRouter.use(ttsRouter);

export default apiRouter;
