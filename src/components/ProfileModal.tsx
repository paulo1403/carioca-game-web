"use client"

import { useState, useEffect } from "react"
import { X, User, Loader2, Save, Trophy, Lock, Key } from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "@/hooks/use-toast"

interface ProfileModalProps {
    isOpen: boolean
    onClose: () => void
}

interface UserStats {
    user: {
        name: string
        email: string
        memberSince: string
    }
    stats: {
        gamesPlayed: number
        gamesWon: number
        winRate: number
        totalScore: number
        avgScore: number
        elo: number
        recentGamesCount: number
    }
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    const { data: session, update } = useSession()
    const [name, setName] = useState(session?.user?.name || "")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [stats, setStats] = useState<UserStats | null>(null)
    const [loadingStats, setLoadingStats] = useState(false)

    // Fetch stats when modal opens
    useEffect(() => {
        if (isOpen && !stats) {
            setLoadingStats(true)
            fetch('/api/user/stats')
                .then(res => res.json())
                .then(data => setStats(data))
                .catch(err => console.error('Failed to load stats:', err))
                .finally(() => setLoadingStats(false))
        }
    }, [isOpen, stats])

    if (!isOpen) return null

    const handleSave = async () => {
        if (name.length < 2) {
            toast({ title: "Atención", description: "El nombre debe tener al menos 2 caracteres", type: "warning" })
            return
        }

        setIsLoading(true)
        try {
            // Update Name
            if (name !== session?.user?.name) {
                const response = await fetch("/api/user/update", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name }),
                })
                if (!response.ok) throw new Error("Error al actualizar nombre")
            }

            // Update Password if provided
            if (password) {
                if (password.length < 6) {
                    throw new Error("La contraseña debe tener al menos 6 caracteres")
                }
                const passResponse = await fetch("/api/user/set-password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ password }),
                })
                if (!passResponse.ok) throw new Error("Error al actualizar contraseña")

                setPassword("")
            }

            // Update session client-side
            await update({
                ...session,
                user: {
                    ...session?.user,
                    name,
                    hasPassword: password ? true : session?.user?.hasPassword
                }
            })

            toast({ title: "¡Éxito!", description: "Perfil actualizado correctamente", type: "success" })
            onClose()
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Hubo un problema al guardar los cambios", type: "error" })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                            <User className="w-5 h-5 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Mi Perfil</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                            Nombre Público
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Tu nombre en el juego"
                            className="w-full bg-slate-950/50 border border-slate-700 text-white p-4 rounded-xl outline-none focus:border-blue-500 transition-all shadow-inner"
                        />
                        <p className="text-[10px] text-slate-600 ml-1">
                            Este nombre será visible para otros jugadores.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Lock className="w-3 h-3" />
                            {session?.user?.hasPassword ? "Cambiar Contraseña" : "Establecer Contraseña"}
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Nueva contraseña..."
                            className="w-full bg-slate-950/50 border border-slate-700 text-white p-4 rounded-xl outline-none focus:border-blue-500 transition-all shadow-inner"
                        />
                        <p className="text-[10px] text-slate-600 ml-1">
                            {session?.user?.hasPassword
                                ? "Deja en blanco para no cambiarla."
                                : "Añade una contraseña para no depender de correos."}
                        </p>
                    </div>

                    {/* Statistics Section */}
                    <div className="border-t border-slate-800 pt-6">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Trophy className="w-4 h-4" />
                            Estadísticas
                        </h3>

                        {loadingStats ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
                            </div>
                        ) : stats ? (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-center">
                                    <div className="text-2xl font-bold text-blue-400">
                                        {stats.stats.gamesPlayed}
                                    </div>
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">
                                        Partidas
                                    </div>
                                </div>
                                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-center">
                                    <div className="text-2xl font-bold text-green-400">
                                        {stats.stats.gamesWon}
                                    </div>
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">
                                        Ganadas
                                    </div>
                                </div>
                                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-center">
                                    <div className="text-2xl font-bold text-yellow-400">
                                        {stats.stats.winRate}%
                                    </div>
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">
                                        Win Rate
                                    </div>
                                </div>
                                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-center">
                                    <div className="text-2xl font-bold text-purple-400">
                                        {stats.stats.elo}
                                    </div>
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">
                                        ELO
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-600 text-center py-4">
                                No se pudieron cargar las estadísticas
                            </p>
                        )}
                    </div>

                    <div className="space-y-4 pt-2">
                        <button
                            onClick={handleSave}
                            disabled={isLoading || name === session?.user?.name}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Guardar Cambios
                                </>
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full text-slate-500 hover:text-slate-300 font-semibold text-sm transition-colors py-2"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
