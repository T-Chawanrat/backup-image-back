import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import backupImageRoutes from "./routes/backupImage.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

dotenv.config({ quiet: true });

const app = express();

app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

app.use("/backup-images", backupImageRoutes);
app.use("/dashboard", dashboardRoutes);

const PORT = process.env.PORT || 8088;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
