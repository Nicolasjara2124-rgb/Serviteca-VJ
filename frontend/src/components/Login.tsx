/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { loginUsuario } from '../services/db';
import type { Usuario } from '../types';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react'; // Agregamos Loader2 para el ícono de carga
import miLogo from '../assets/logo.png';

interface LoginProps {
  onLoginSuccess: (usuario: Usuario) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Estado para controlar el tiempo de espera

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!pin.trim()) {
      setError('Por favor, ingrese su PIN.');
      return;
    }

    setIsLoading(true); // Bloqueamos el botón y mostramos "Cargando..."

    try {
      // Ahora usamos await para esperar la respuesta de Firestore
      const usr = await loginUsuario(pin);
      if (usr) {
        onLoginSuccess(usr);
      } else {
        setError('PIN de seguridad incorrecto.');
      }
    } catch (err) {
      setError('Error al conectar con la base de datos.');
      console.error(err);
    } finally {
      setIsLoading(false); // Devolvemos el botón a la normalidad
    }
  };

  return (
    <div className="min-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-200 h-screen select-none font-sans">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
        
        <div className="flex flex-col items-center mb-8 text-center">
          <img 
            src={miLogo} 
            alt="Logo Serviteca VJ" 
            className="w-36 h-auto object-contain mb-4 drop-shadow-2xl hover:scale-105 transition-transform duration-300" 
          />
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Serviteca <span className="text-blue-500">VJ</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1 font-mono">
            SISTEMA ERP & POS PRIVADO
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5 relative">
            <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400">
              PIN de Acceso Personal
            </label>
            <div className="relative flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 focus-within:border-blue-500 transition-colors">
              <Lock className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
              <input
                type={showPin ? 'text' : 'password'}
                placeholder="Ingrese su PIN de 4 dígitos"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                disabled={isLoading}
                className="bg-transparent text-sm text-white placeholder-slate-600 w-full focus:outline-none tracking-widest disabled:opacity-50"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                disabled={isLoading}
                className="text-slate-500 hover:text-slate-300 disabled:opacity-50"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 font-semibold font-mono text-center">
              {error}
            </p>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/10 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Validando en la nube...
                </>
              ) : (
                'Ingresar al Sistema'
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 text-center space-y-1 text-slate-600 text-[10px] font-mono">
        <p>© {new Date().getFullYear()} Neumáticos VJ SPA. Todos los derechos reservados.</p>
        <p className="text-slate-700">"LA EXPERIENCIA MARCA LA DIFERENCIA"</p>
      </div>
    </div>
  );
}