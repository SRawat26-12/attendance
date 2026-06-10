const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const connectDB = require("./src/config/db");
const app = express();

// 3. Ab database connect karein
connectDB();

// Middleware
app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const PORT = process.env.PORT;
const routes = require("./src/routes/index.routes");
app.use("/api", routes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});