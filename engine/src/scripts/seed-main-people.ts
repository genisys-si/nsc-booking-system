//How to RUN THIS
//npx ts-node src/scripts/seed-main-people.ts
import dbConnect from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";

async function seed() {
  await dbConnect();

  const users = [
    {
      name: "Admin User",
      email: "admin@nsc.sb",
      password: "adminSecure2026!",
      role: "admin",
    },
    {
      name: "Stadium Manager",
      email: "stadium@nsc.sb",
      password: "manager123!",
      role: "manager",
    },
  ];

  for (const u of users) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      console.log(`User ${u.email} already exists → skipping`);
      continue;
    }

    const hashed = await bcrypt.hash(u.password, 10);
    await User.create({ ...u, password: hashed });
    console.log(`Created user: ${u.email}`);
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});