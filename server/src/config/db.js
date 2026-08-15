import mongoose from "mongoose";
import dns from "dns";

// Force a public DNS resolver for the mongodb+srv:// lookup — Node's resolver
// can fail SRV queries against IPv6 link-local / router DNS servers even when
// the OS resolver (nslookup) succeeds.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

export const connectDB = async () => {
  const uri = process.env.MONGO_URI || process.env.DATABASE_URL;
  if (!uri) {
    console.error("[MongoDB] MONGO_URI or DATABASE_URL is not set in .env");
    process.exit(1);
  }
  try {
    await mongoose.connect(uri, { dbName: process.env.MONGO_DB_NAME || "cartguard" });
    console.log("[MongoDB] Connected:", mongoose.connection.host);
  } catch (err) {
    console.error("[MongoDB] Connection error:", err.message);
    process.exit(1);
  }
};

export default connectDB;