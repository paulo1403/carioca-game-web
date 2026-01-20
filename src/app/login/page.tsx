"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { LucideShieldCheck, LucideGamepad2, Loader2, Mail } from "lucide-react"

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleEmailSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setIsLoading(true);
        try {
            await signIn("nodemailer", {
                email,
                redirect: false
            });
            // Redirect to custom verify page
            router.push(`/auth/verify-request?email=${encodeURIComponent(email)}`);
        } catch (error) {
            console.error(error);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full"></div>
            </div>

            <div className="z-10 w-full max-w-sm bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-600/20 flex items-center justify-center rounded-2xl mb-6 border border-blue-500/30">
                    <LucideGamepad2 className="w-8 h-8 text-blue-400" />
                </div>

                <h1 className="text-3xl font-bold text-white mb-2 text-center">
                    ¡Bienvenido!
                </h1>
                <p className="text-slate-400 mb-8 text-center text-sm">
                    Ingresa tu email para acceder o crear tu cuenta
                </p>

                <div className="w-full space-y-4">
                    <form onSubmit={handleEmailSignIn} className="flex flex-col gap-3">
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tu@email.com"
                                required
                                className="w-full bg-slate-950/50 border border-slate-700 text-white py-3 pl-11 pr-4 rounded-xl outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600 text-sm"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                "Enviar Magic Link"
                            )}
                        </button>
                        <p className="text-[10px] text-slate-600 text-center">
                            Te enviaremos un enlace seguro a tu correo
                        </p>
                    </form>

                    <div className="flex items-center gap-4 my-2">
                        <div className="h-px flex-1 bg-slate-800"></div>
                        <span className="text-slate-600 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">O continúa con</span>
                        <div className="h-px flex-1 bg-slate-800"></div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => signIn("google", { callbackUrl: "/" })}
                            className="flex items-center justify-center gap-3 bg-slate-800/50 hover:bg-slate-800 text-slate-300 font-semibold py-3 px-4 rounded-xl border border-slate-700/50 transition-all active:scale-[0.98] text-sm"
                        >
                            <img src="https://authjs.dev/img/providers/google.svg" className="w-4 h-4" alt="Google" />
                            Google
                        </button>
                        <button
                            onClick={() => signIn("github", { callbackUrl: "/" })}
                            className="flex items-center justify-center gap-3 bg-slate-800/50 hover:bg-slate-800 text-slate-300 font-semibold py-3 px-4 rounded-xl border border-slate-700/50 transition-all active:scale-[0.98] text-sm"
                        >
                            <img src="https://authjs.dev/img/providers/github.svg" className="w-4 h-4 invert" alt="GitHub" />
                            GitHub
                        </button>
                    </div>
                </div>

                <div className="mt-8 flex items-center gap-2 text-slate-600 text-[10px] font-medium uppercase tracking-tight">
                    <LucideShieldCheck className="w-3 h-3" />
                    <span>Seguridad por Auth.js</span>
                </div>
            </div>

            <footer className="mt-8 text-slate-700 text-xs z-10 font-medium">
                &copy; {new Date().getFullYear()} CARIOCA ONLINE
            </footer>
        </div>
    )
}
