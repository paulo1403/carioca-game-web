import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import Nodemailer from "next-auth/providers/nodemailer"

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
        Nodemailer({
            server: {
                host: process.env.EMAIL_HOST,
                port: 465,
                secure: true, // true para puerto 465
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            },
            from: process.env.EMAIL_FROM,
        }),
    ],
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const isApiRoute = nextUrl.pathname.startsWith('/api')
            const isAuthRoute = nextUrl.pathname.startsWith('/api/auth')
            const isPublicRoute = ['/login'].includes(nextUrl.pathname)

            if (isAuthRoute) return true

            if (isLoggedIn && nextUrl.pathname === '/login') {
                return Response.redirect(new URL('/', nextUrl))
            }

            return isLoggedIn || isPublicRoute
        },
        async session({ session, user }) {
            if (session.user && user) {
                session.user.id = user.id
            }
            return session
        },
    },
    pages: {
        signIn: "/login",
    },
    debug: true,
})
