"use client";

import React, { useState } from 'react';
import { Shield, Mail, User, CheckCircle2, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';

interface LoginOverlayProps {
    onLoginSuccess: () => void;
}

export default function LoginOverlay({ onLoginSuccess }: LoginOverlayProps) {
    const [step, setStep] = useState<'info' | 'verify'>('info');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [disclaimer, setDisclaimer] = useState(false);
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!disclaimer) {
            setError('You must accept the disclaimer to proceed.');
            return;
        }
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/send-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, disclaimerAccepted: disclaimer }),
            });

            if (res.ok) {
                setStep('verify');
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to send verification code.');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code }),
            });

            if (res.ok) {
                onLoginSuccess();
            } else {
                const data = await res.json();
                setError(data.error || 'Invalid verification code.');
            }
        } catch (err) {
            setError('Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-950/90 backdrop-blur-xl p-4">
            <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-8">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                            <Shield className="w-8 h-8 text-blue-400" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-center text-white mb-2">
                        DP Trade Desk
                    </h2>
                    <p className="text-gray-400 text-center text-sm mb-8">
                        Scientific Price Analysis & Intelligence
                    </p>

                    {error && (
                        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 text-red-400 text-xs">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {step === 'info' ? (
                        <form onSubmit={handleSendCode} className="space-y-4">
                            <div className="relative">
                                <User className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Full Name"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                />
                            </div>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                />
                            </div>

                            <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-4 mb-2">
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        id="disclaimer"
                                        checked={disclaimer}
                                        onChange={(e) => setDisclaimer(e.target.checked)}
                                        className="mt-1 block h-4 w-4 bg-gray-800 border-gray-700 rounded text-blue-600 focus:ring-blue-500/50"
                                    />
                                    <label htmlFor="disclaimer" className="text-[11px] text-gray-300 leading-relaxed cursor-pointer select-none">
                                        <strong>Informational Purposes Only:</strong> This is not Financial Advice. Please understand your risk and do your own research. By continuing, you agree to the research disclaimer.
                                    </label>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all group shadow-lg shadow-blue-500/20"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                    <>
                                        Verify Identity <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerify} className="space-y-6">
                            <div className="text-center">
                                <p className="text-sm text-gray-400 mb-4">
                                    We've sent a 6-digit code to <br />
                                    <span className="text-blue-400 font-medium">{email}</span>
                                </p>

                                <input
                                    type="text"
                                    placeholder="000 000"
                                    required
                                    maxLength={6}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl py-4 text-center text-3xl font-black tracking-[0.5em] text-white focus:outline-none focus:border-blue-500/50 transition-all"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || code.length < 6}
                                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enter Dashboard'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setStep('info')}
                                className="w-full text-xs text-gray-500 hover:text-gray-400 transition-colors"
                            >
                                Return to details
                            </button>
                        </form>
                    )}
                </div>

                <div className="px-8 py-4 bg-gray-800/50 border-t border-gray-800/50 text-center">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                        Access expires every 4 hours
                    </p>
                </div>
            </div>
        </div>
    );
}
