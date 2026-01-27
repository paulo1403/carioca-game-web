"use client";
import { Loader2, Lock, LucideGamepad2, LucideShieldCheck, Mail, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleCredentialsAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);

    try {
      if (isRegistering) {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Error al registrarse");
        }

        toast({
          title: "¡Éxito!",
          description: "Cuenta creada. Iniciando sesión...",
          type: "success",
        });
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast({
          title: "Error de autenticación",
          description: isRegistering
            ? "Error al entrar tras el registro."
            : "Correo o contraseña incorrectos.",
          type: "error",
        });
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (error: any) {
      toast({
        title: "Atención",
        description: error.message,
        type: "error",
      });
    } finally {
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
          {isRegistering ? "Crear Cuenta" : "¡Bienvenido!"}
        </h1>
        <p className="text-slate-400 mb-8 text-center text-sm">
          {isRegistering
            ? "Regístrate para guardar tu progreso"
            : "Ingresa para jugar a la Carioca"}
        </p>

        <div className="w-full space-y-4">
          <form onSubmit={handleCredentialsAuth} className="flex flex-col gap-3">
            {isRegistering && (
              <div className="relative group">
                <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre (opcional)"
                  className="w-full bg-slate-950/50 border border-slate-700 text-white py-3 pl-11 pr-4 rounded-xl outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600 text-sm"
                />
              </div>
            )}
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
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
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
              ) : isRegistering ? (
                "Crear cuenta"
              ) : (
                "Iniciar Sesión"
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors font-medium text-center mt-1"
            >
              {isRegistering
                ? "¿Ya tienes cuenta? Inicia sesión"
                : "¿No tienes cuenta? Regístrate aquí"}
            </button>
          </form>
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
  );
}
