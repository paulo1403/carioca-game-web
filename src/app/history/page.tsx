'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Calendar, Users, History as HistoryIcon, Loader2 } from 'lucide-react';

interface GameHistoryItem {
  id: string;
  gameSessionId: string;
  winnerId: string | null;
  participants: Array<{ id: string; name: string; score: number }>;
  playedAt: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<GameHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/history')
      .then(res => res.json())
      .then(data => {
        setHistory(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-colors border border-slate-700">
            <ArrowLeft className="w-6 h-6 text-slate-300" />
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-100">
            <HistoryIcon className="w-8 h-8 text-blue-500" />
            Historial de Partidas
          </h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500/50" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-800">
            <HistoryIcon className="w-16 h-16 mx-auto mb-4 text-slate-700" />
            <p className="text-xl text-slate-500">No hay partidas registradas aún.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {history.map((game) => {
              const winner = game.participants.find(p => p.id === game.winnerId);
              const date = new Date(game.playedAt).toLocaleDateString('es-CL', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
              });

              return (
                <div key={game.id} className="bg-slate-900/50 hover:bg-slate-900 transition-colors rounded-xl p-6 border border-slate-800 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center shadow-sm">
                  <div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                      <Calendar className="w-4 h-4" />
                      {date}
                    </div>
                    
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-yellow-500/10 p-2 rounded-full border border-yellow-500/20">
                        <Trophy className="w-6 h-6 text-yellow-500" />
                      </div>
                      <div>
                        <div className="text-xs text-yellow-600 font-bold uppercase tracking-wider">Ganador</div>
                        <div className="text-xl font-bold text-slate-200">{winner?.name || 'Desconocido'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 w-full md:w-auto">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                      <Users className="w-4 h-4" />
                      Participantes ({game.participants.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {game.participants.map(p => (
                        <span 
                          key={p.id} 
                          className={`text-xs px-2 py-1 rounded-full border ${p.id === game.winnerId ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500 font-medium' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                        >
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
