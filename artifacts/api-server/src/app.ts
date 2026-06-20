import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Serve Mini App static files
// __dirname in dev = artifacts/api-server/src, in prod = artifacts/api-server/dist
// go up to workspace root then into bot/webapp
const webappDir = path.resolve(__dirname, "../../../bot/webapp");
app.use("/webapp", express.static(webappDir));
// Redirect root to webapp
app.get("/", (_req, res) => { res.redirect(301, "/webapp/"); });
// Fallback static serve at root for direct asset requests
app.use("/", express.static(webappDir));

export default app;
