import { db, pool } from "./index";
import { users } from "./schema";
import { hashPassword } from "../utils/password";
import { config } from "../config/env";

async function seed() {
    console.log("🌱 Seeding database...");

    const adminPassword = await hashPassword(config.adminPassword);
    const userPassword = await hashPassword("password123");

    try {
        // Insert Admin
        await db.insert(users).values({
            name: "Admin",
            email: config.adminEmail,
            password: adminPassword,
            role: "admin",
            isActive: true,
            mobile: "1234567890",
            companyName: "Morex Technology",
            companyAddress: "123 Admin St",
            domain: "morex.com",
            numberOfUsers: 10,
            planType: "pro",
            subscriptionDuration: "1year",
            accountStatus: "active",
            renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        }).onConflictDoNothing();

        // Insert Dummy User
        await db.insert(users).values({
            name: "User",
            email: "user@morex.com",
            password: userPassword,
            role: "user",
            isActive: true,
            mobile: "0987654321",
            companyName: "Dummy Co",
            companyAddress: "456 User St",
            domain: "dummy.com",
            numberOfUsers: 5,
            planType: "basic",
            subscriptionDuration: "monthly",
            accountStatus: "active",
            renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }).onConflictDoNothing();

        console.log("✅ Seeding completed successfully!");
    } catch (error) {
        console.error("❌ Seeding failed:", error);
    } finally {
        await pool.end();
    }
}

seed();
