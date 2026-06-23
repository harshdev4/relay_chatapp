import express from "express";
import dotenv from "dotenv";
dotenv.config();

import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";

import connectDB from "./config/db.config.js";
import { initSocket } from "./sockets/index.js";

import authRoute from "./routes/AuthRoute.js";
import userRoute from "./routes/UserRoute.js";
import conversationRoute from "./routes/ConversationRoute.js";
import aiRoute from "./routes/AIRoute.js";

const app = express();
const httpServer = http.createServer(app);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/conversations", conversationRoute);
app.use("/api/ai", aiRoute);

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

initSocket(httpServer, app);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
  });
});
