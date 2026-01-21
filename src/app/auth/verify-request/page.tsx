"use client"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Mail, CheckCircle, ArrowLeft, Sparkles } from "lucide-react"
import Link from "next/link"

function VerifyRequestContent() {
    const searchParams = useSearchParams()
    const email = searchParams.get("email") || "tu correo"

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse"></div>
            </div>

            <div className="z-10 w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 md:p-10 rounded-3xl shadow-2xl flex flex-col items-center animate-in zoom-in-95 fade-in duration-500">
                {/* Icon with animation */}
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
                    <div className="relative w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center border-4 border-slate-900 shadow-xl">
                        <Mail className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-4 border-slate-900 animate-bounce">
                        <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 text-center">
                    ¡Revisa tu correo!
                </h1>

                {/* Description */}
                <p className="text-slate-400 text-center mb-6 text-sm md:text-base">
                    Hemos enviado un enlace mágico a
                </p>

                {/* Email display */}
                <div className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-4 mb-6">
                    <p className="text-blue-400 font-mono text-sm md:text-base text-center break-all">
                        {email}
                    </p>
                </div>

                {/* Instructions */}
                <div className="w-full space-y-3 mb-8">
                    <div className="flex items-start gap-3 text-slate-300 text-sm">
                        <div className="w-6 h-6 bg-blue-600/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-blue-400 font-bold text-xs">1</span>
                        </div>
                        <p>Abre tu bandeja de entrada</p>
                    </div>
                    <div className="flex items-start gap-3 text-slate-300 text-sm">
                        <div className="w-6 h-6 bg-blue-600/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-blue-400 font-bold text-xs">2</span>
                        </div>
                        <p>Busca el correo de <span className="text-blue-400 font-semibold">Carioca Game</span></p>
                    </div>
                    <div className="flex items-start gap-3 text-slate-300 text-sm">
                        <div className="w-6 h-6 bg-blue-600/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-blue-400 font-bold text-xs">3</span>
                        </div>
                        <p>Haz clic en el enlace para acceder</p>
                    </div>
                </div>

                {/* Tips */}
                <div className="w-full bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-2">
                        <Sparkles className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                        <div className="text-xs text-yellow-200/80">
                            <p className="font-semibold mb-1">💡 Consejo:</p>
                            <p>Si no ves el correo, revisa tu carpeta de spam o promociones</p>
                        </div>
                    </div>
                </div>

                {/* Back button */}
                <Link
                    href="/login"
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Volver al inicio
                </Link>
            </div>

            {/* Footer */}
            <p className="mt-8 text-slate-700 text-xs z-10">
                El enlace expira en 24 horas
            </p>
        </div>
    )
}

export default function VerifyRequestPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Cargando...</div>}>
            <VerifyRequestContent />
        </Suspense>
    )
}
