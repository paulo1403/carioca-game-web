import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import Nodemailer from "next-auth/providers/nodemailer"
import { html, text } from "@/lib/email-template"
import nodemailer from "nodemailer"

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
            sendVerificationRequest: async ({ identifier: email, url, provider }) => {
                const { host } = new URL(url)
                const transport = nodemailer.createTransport(provider.server as any)

                await transport.sendMail({
                    to: email,
                    from: provider.from,
                    subject: `Inicia sesión en Carioca Game`,
                    text: text({ url, host, email }),
                    html: html({ url, host, email }),
                })
            },
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
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
            }
            return token
        },
        async session({ session, token }) {
            if (session.user && token.sub) {
                session.user.id = token.sub
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
