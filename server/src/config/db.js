import mongoose from "mongoose";
import dns from "dns";

export const connectDB = async () => {
  const uri = process.env.MONGO_URI || process.env.DATABASE_URL;
  if (!uri) {
    console.error("[MongoDB] MONGO_URI or DATABASE_URL is not set in .env");
    process.exit(1);
  }
  try {
    // Force a public DNS resolver temporarily for the mongodb+srv:// lookup
    dns.setServers(["8.8.8.8", "1.1.1.1"]);

    await mongoose.connect(uri, { dbName: process.env.MONGO_DB_NAME || "cartguard" });
    console.log("[MongoDB] Connected:", mongoose.connection.host);

    // Reset back to default system resolvers so localhost and 127.0.0.1 resolve perfectly for fetch calls
    dns.setServers([]);
  } catch (err) {
    console.error("[MongoDB] Connection error:", err.message);
    try {
      dns.setServers([]);
    } catch (_) {}
    process.exit(1);
  }
};

export default connectDB;