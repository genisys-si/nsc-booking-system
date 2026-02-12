import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import bcrypt from "bcryptjs";

export async function PATCH(
    req: NextRequest,
    { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 403 });
    }

    // IMPORTANT FIX: Await the params Promise
    const params = await paramsPromise;

    await dbConnect();

    try {
        const body = await req.json();
        const { name, phone, role, isActive, password, lastLogin } = body;

        // Optional: validate role
        if (role && !["user", "manager", "admin"].includes(role)) {
            return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        }

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone?.trim() || undefined;
        if (role !== undefined) updateData.role = role;
        if (isActive !== undefined) updateData.isActive = isActive;

        // Password reset (if provided)
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateData.password = hashedPassword;
            updateData.lastPasswordReset = new Date(); // optional tracking
        }

        // Prevent admins from demoting themselves (optional safety)
        if (session.user.id === params.id && role === "user") {
            return NextResponse.json(
                { error: "Cannot demote yourself to user" },
                { status: 403 }
            );
        }

        const updatedUser = await User.findByIdAndUpdate(
            params.id,
            { $set: updateData },
            { returnDocument: 'after', runValidators: true }
        ).select("name email phone role isActive lastLogin createdAt");

        if (!updatedUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            user: {
                id: updatedUser._id.toString(),
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                role: updatedUser.role,
                isActive: updatedUser.isActive,
                lastLogin: updatedUser.lastLogin?.toISOString() ?? null,
                createdAt: updatedUser.createdAt.toISOString(),
            },
        });
    } catch (error: any) {
        console.error("Update user error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update user" },
            { status: 500 }
        );
    }
}