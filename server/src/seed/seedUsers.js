import dotenv from "dotenv";
import connectDB from "../config/db.js";
import User from "../models/User.js";

dotenv.config();

// Default password for all seeded accounts -- change after first login.
const DEFAULT_PASSWORD = "Mahesh@2005";

const USERS = [
  { name: "Mahesh Choudare", email: "maheshchoudare21@gmail.com", role: "admin", phone: "6305768615" },
  { name: "User One",        email: "23hp1a0548@gmail.com",       role: "user",  phone: "6305768615" },
  { name: "User Two",        email: "23hp1a0549@gmail.com",       role: "user",  phone: "6305768615" },
];

const run = async () => {
  await connectDB();

  for (const u of USERS) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      existing.role = u.role;
      existing.name = u.name;
      existing.phone = u.phone;
      existing.password = DEFAULT_PASSWORD; // reset to the current default on every seed run
      await existing.save();
      console.log(`Updated existing user: ${u.email} (${u.role}) - password reset`);
    } else {
      await User.create({ ...u, password: DEFAULT_PASSWORD });
      console.log(`Created user: ${u.email} (${u.role})`);
    }
  }

  // Update all swathi duplicate accounts to set their phone number
  const swathiUsers = await User.find({ email: /swathi/i });
  for (const s of swathiUsers) {
    s.phone = "6305768615";
    await s.save();
    console.log(`Migrated Swathi user: ${s._id} with phone 6305768615`);
  }

  console.log(`\nAll seeded accounts use the password: ${DEFAULT_PASSWORD}`);
  console.log("Change it after first login.");
  process.exit();
};

run();