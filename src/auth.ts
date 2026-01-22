import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),
    providers: [
        Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
        }),
        GitHub({
            clientId: process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET,
        }),
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string }
                })

                if (!user || !user.password) return null

                const isPasswordValid = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                )

                if (!isPasswordValid) return null

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                }
            }
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const isApiRoute = nextUrl.pathname.startsWith('/api')
            const isAuthRoute = nextUrl.pathname.startsWith('/api/auth')
            const isAuthPage = nextUrl.pathname.startsWith('/auth')
            const isPublicRoute = ['/login'].includes(nextUrl.pathname)

            if (isAuthRoute || isAuthPage) return true

            if (isLoggedIn && nextUrl.pathname === '/login') {
                return Response.redirect(new URL('/', nextUrl))
            }

            return isLoggedIn || isPublicRoute
        },
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id
                // Check if user has password
                const dbUser = await prisma.user.findUnique({
                    where: { id: user.id },
                    select: { password: true }
                })
                token.hasPassword = !!dbUser?.password
            }
            if (trigger === "update" && session?.user) {
                token.name = session.user.name
                if (session.user.hasPassword !== undefined) {
                    token.hasPassword = session.user.hasPassword
                }
            }
            return token
        },
        async session({ session, token }) {
            if (session.user && token.sub) {
                session.user.id = token.sub
                session.user.hasPassword = token.hasPassword as boolean
            }
            return session
        },
    },
    pages: {
        signIn: "/login",
        verifyRequest: "/auth/verify-request",
    },
    debug: true,
})
