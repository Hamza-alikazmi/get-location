// server.js
import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI is missing");
  process.exit(1);
}

const client = new MongoClient(MONGO_URI);
let db, collection;

// Connect once at startup
(async () => {
  try {
    await client.connect();
    db = client.db("locationDB");
    collection = db.collection("locations");
    console.log("MongoDB connected");
  } catch (e) {
    console.error("MongoDB connection error:", e);
    process.exit(1);
  }
})();

// ---------- Middleware ----------
app.use(express.json());
app.use(express.static("pages")); // serve static files from pages/

// ---------- Helper: serve HTML ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function servePage(pageName) {
  return (req, res) => {
    res.sendFile(resolve(__dirname, "pages", pageName));
  };
}

// ---------- Routes ----------
app.get("/", servePage("index.html"));
app.get("/list", servePage("list.html"));
app.get("/about", servePage("about.html"));

// API: save location
app.post("/api/save", async (req, res) => {
  try {
    const { lat, long } = req.body;
    if (!lat || !long) return res.status(400).json({ error: "lat & long required" });

    const ip =
      (req.headers["x-forwarded-for"] || "").split(",").shift().trim() ||
      req.headers["x-real-ip"] ||
      req.socket.remoteAddress ||
      "unknown";

    await collection.insertOne({
      ip,
      lat: parseFloat(lat),
      long: parseFloat(long),
      time: new Date(),
    });

    res.json({ message: "Location saved!" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to save" });
  }
});

// API: get all locations
app.get("/api/data", async (req, res) => {
  try {
    const data = await collection.find().sort({ time: -1 }).toArray();
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch" });
  }
});

// ---------- 404 ----------
app.use((req, res) => {
  res.status(404).send("Not found");
});

// ---------- Local start ----------

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
            


// ---------- Vercel adapter ----------