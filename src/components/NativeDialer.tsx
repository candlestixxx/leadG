'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Device, Call } from '@twilio/voice-sdk';

export default function NativeDialer() {
    const [token, setToken] = useState<string | null>(null);
    const [device, setDevice] = useState<Device | null>(null);
    const [connection, setConnection] = useState<Call | null>(null);
    const [callStatus, setCallStatus] = useState<string>('Offline');
    const [phoneNumber, setPhoneNumber] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    // Initialize Twilio Device on mount if token available
    useEffect(() => {
        const fetchToken = async () => {
            try {
                const res = await fetch('/api/twilio/token');
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || 'Failed to fetch Twilio token');
                }
                const data = await res.json();
                setToken(data.token);
            } catch (err: any) {
                console.error("Token fetch error:", err);
                setError(err.message);
            }
        };

        fetchToken();
    }, []);

    useEffect(() => {
        const setupDevice = (accessToken: string) => {
            try {
                const newDevice = new Device(accessToken, {
                    logLevel: 1, // Warning
                    codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU]
                });

                newDevice.on('registered', () => {
                    setCallStatus('Ready');
                    setError(null);
                });

                newDevice.on('error', (err) => {
                    console.error('Twilio.Device Error:', err);
                    setError(`Device error: ${err.message}`);
                    setCallStatus('Error');
                });

                newDevice.on('incoming', (call: Call) => {
                    setCallStatus('Incoming call...');
                    setConnection(call);

                    call.on('accept', () => setCallStatus('In Call'));
                    call.on('disconnect', () => {
                        setCallStatus('Ready');
                        setConnection(null);
                    });
                    call.on('reject', () => {
                        setCallStatus('Ready');
                        setConnection(null);
                    });
                });

                newDevice.register();
                setDevice(newDevice);
            } catch (err: any) {
                console.error("Error setting up Twilio Device:", err);
                setError(err.message);
            }
        };

        if (token && !device) {
            setupDevice(token);
        }

        return () => {
            if (device) {
                device.destroy();
            }
        };
    }, [token, device]);

    const handleCall = async () => {
        if (!device || !phoneNumber) return;

        try {
            setCallStatus('Calling...');
            const call = await device.connect({ params: { To: phoneNumber } });

            call.on('accept', () => {
                setCallStatus('In Call');
                setConnection(call);
            });

            call.on('disconnect', () => {
                setCallStatus('Ready');
                setConnection(null);
            });

            call.on('error', (err) => {
                console.error("Call error:", err);
                setCallStatus('Ready');
                setConnection(null);
                setError(`Call error: ${err.message}`);
            });

        } catch (err: any) {
             console.error("Connection error:", err);
             setError(`Connection error: ${err.message}`);
             setCallStatus('Ready');
        }
    };

    const handleHangup = () => {
        if (connection) {
            connection.disconnect();
        } else if (device) {
            device.disconnectAll();
        }
        setCallStatus('Ready');
        setConnection(null);
    };

    const handleAccept = () => {
        if (connection) {
            connection.accept();
        }
    };

    const handleReject = () => {
        if (connection) {
            connection.reject();
        }
    };


    return (
        <div className="fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-72 flex flex-col gap-3">
            <div className="flex justify-between items-center border-b pb-2 mb-2">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                   <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    Web Dialer
                </h3>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${callStatus === 'Ready' ? 'bg-green-100 text-green-800' : callStatus === 'In Call' ? 'bg-red-100 text-red-800' : callStatus === 'Incoming call...' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                    {callStatus}
                </span>
            </div>

            {error && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
                    {error}
                </div>
            )}

            {!connection || callStatus === 'Calling...' ? (
                <>
                    <input
                        type="tel"
                        placeholder="Phone Number (e.g. +1234567890)"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full text-sm border-gray-300 rounded shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 border"
                        disabled={callStatus === 'Calling...'}
                    />
                    <div className="flex gap-2">
                        {callStatus === 'Calling...' ? (
                           <button
                               onClick={handleHangup}
                               className="w-full bg-red-500 hover:bg-red-600 text-white p-2 rounded text-sm font-medium transition-colors"
                           >
                               Cancel
                           </button>
                        ) : (
                           <button
                               onClick={handleCall}
                               disabled={!phoneNumber || callStatus !== 'Ready'}
                               className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white p-2 rounded text-sm font-medium transition-colors"
                           >
                               Call
                           </button>
                        )}
                    </div>
                </>
            ) : callStatus === 'Incoming call...' ? (
                 <div className="flex gap-2">
                    <button
                        onClick={handleAccept}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white p-2 rounded text-sm font-medium transition-colors"
                    >
                        Answer
                    </button>
                    <button
                        onClick={handleReject}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white p-2 rounded text-sm font-medium transition-colors"
                    >
                        Reject
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    <div className="text-sm text-center text-gray-600 py-2">
                         Connected to {phoneNumber || 'Incoming Caller'}
                    </div>
                    <button
                        onClick={handleHangup}
                        className="w-full bg-red-500 hover:bg-red-600 text-white p-2 rounded text-sm font-medium transition-colors"
                    >
                        Hang Up
                    </button>
                </div>
            )}
        </div>
    );
}
