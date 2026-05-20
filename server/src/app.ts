import express from "express";
import { router } from "./api/router";

const app = express();

app.use(express.json());
app.use(router);

export { app };
