import dotenv from "dotenv";
import connectDB from "../config/db.js";
import User from "../models/User.js";

dotenv.config();

// Default password for all seeded accounts -- change after first login.
const DEFAULT_PASSWORD = "Mahesh@2005";

const USERS = [
  { name: "Mahesh Choudare", email: "maheshchoudare21@gmail.com", role: "admin" },
  { name: "User One",        email: "23hp1a0548@gmail.com",       role: "user" },
  { name: "User Two",        email: "23hp1a0549@gmail.com",       role: "user" },
];

const run = async () => {
  await connectDB();

  for (const u of USERS) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      existing.role = u.role;
      existing.name = u.name;
      existing.password = DEFAULT_PASSWORD; // reset to the current default on every seed run
      await existing.save();
      console.log(`Updated existing user: ${u.email} (${u.role}) - password reset`);
    } else {
      await User.create({ ...u, password: DEFAULT_PASSWORD });
      console.log(`Created user: ${u.email} (${u.role})`);
    }
  }

  console.log(`\nAll seeded accounts use the password: ${DEFAULT_PASSWORD}`);
  console.log("Change it after first login.");
  process.exit();
};

run();