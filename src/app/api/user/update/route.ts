import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function PATCH(req: Request) {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const { name } = await req.json()

        if (!name || name.length < 2) {
            return new NextResponse("Invalid name", { status: 400 })
        }

        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: { name },
        })

        return NextResponse.json(updatedUser)
    } catch (error) {
        console.error("[USER_UPDATE_ERROR]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
