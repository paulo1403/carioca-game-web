import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const { password } = await request.json()
        if (!password || password.length < 6) {
            return NextResponse.json(
                { error: "La contraseña debe tener al menos 6 caracteres" },
                { status: 400 }
            )
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        await prisma.user.update({
            where: { id: session.user.id },
            data: { password: hashedPassword }
        })

        return NextResponse.json({ success: true, message: "Contraseña establecida correctamente" })
    } catch (error) {
        console.error("Error al establecer contraseña:", error)
        return NextResponse.json({ error: "Error interno" }, { status: 500 })
    }
}
