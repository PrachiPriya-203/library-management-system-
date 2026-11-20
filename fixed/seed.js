// One-time script: copies your existing JSON data into MongoDB Atlas.
// Usage:  npm run seed      (needs MONGODB_URI in .env)
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

const DIR = path.join(__dirname, "data files");

(async () => {
    if (!process.env.MONGODB_URI) {
        console.error("❌ MONGODB_URI is missing. Create a .env file first (see .env.example).");
        process.exit(1);
    }

    const client = await new MongoClient(process.env.MONGODB_URI).connect();
    const store = client.db(process.env.DB_NAME || "library").collection("store");

    for (const name of ["users", "books", "requests"]) {
        const file = path.join(DIR, `${name}.json`);
        const data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
        await store.updateOne({ _id: name }, { $set: { data } }, { upsert: true });
        console.log(`✅ ${name}: ${data.length} records uploaded`);
    }

    await client.close();
    console.log("🎉 Done! Database is ready.");
})().catch(err => {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
});
