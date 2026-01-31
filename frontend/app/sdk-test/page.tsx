'use client';

import { useEffect, useState } from 'react';
import { clianta, CRMClient, type TrackerCore } from '@clianta/sdk';

export default function SDKTestPage() {
    const [tracker, setTracker] = useState<TrackerCore | null>(null);
    const [visitorId, setVisitorId] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [testResults, setTestResults] = useState<string[]>([]);
    const [crmResults, setCrmResults] = useState<string>('');

    useEffect(() => {
        // Initialize SDK - Use your real workspace/project ID from the database
        // You can find this in: Dashboard > Settings > Project ID
        const workspaceId = process.env.NEXT_PUBLIC_WORKSPACE_ID || '679fa04e9e93c7ecf1c70e1a'; // Replace with real ID

        const instance = clianta(workspaceId, {
            apiEndpoint: 'http://localhost:5000',
            debug: true,
            autoPageView: true,
        });

        setTracker(instance);
        setVisitorId(instance.getVisitorId());
        setSessionId(instance.getSessionId());

        addResult('✅ SDK initialized successfully');
        addResult(`📍 Visitor ID: ${instance.getVisitorId()}`);
        addResult(`🔄 Session ID: ${instance.getSessionId()}`);
    }, []);

    const addResult = (message: string) => {
        setTestResults(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    };

    const testPageView = () => {
        tracker?.page('SDK Test Page', {
            testType: 'manual',
            timestamp: new Date().toISOString(),
        });
        addResult('✅ Page view tracked');
    };

    const testCustomEvent = () => {
        tracker?.track('custom', 'SDK Test Event', {
            action: 'button_click',
            component: 'test_page',
            value: 42,
        });
        addResult('✅ Custom event tracked');
    };

    const testIdentify = () => {
        tracker?.identify('test@clianta.com', {
            firstName: 'Test',
            lastName: 'User',
            company: 'Clianta',
        });
        addResult('✅ User identified');
    };

    const testFlush = async () => {
        await tracker?.flush();
        addResult('✅ Events flushed to backend');
    };

    const testCRMAPI = async () => {
        setCrmResults('Testing CRM API...');
        try {
            const crm = new CRMClient(
                'http://localhost:5000',
                process.env.NEXT_PUBLIC_WORKSPACE_ID || '679fa04e9e93c7ecf1c70e1a',
                // You'll need a real auth token for this to work
                undefined
            );

            const response = await crm.getContacts({ page: 1, limit: 5 });

            if (response.success) {
                setCrmResults(`✅ CRM API Success!\nFound ${response.data?.pagination?.total || 0} contacts\n\n${JSON.stringify(response.data, null, 2)}`);
            } else {
                setCrmResults(`⚠️ CRM API Error: ${response.error}\n\nNote: You need a valid auth token to use the CRM API`);
            }
        } catch (error: any) {
            setCrmResults(`❌ Error: ${error.message}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-4xl font-bold mb-2">Clianta SDK Test Page</h1>
                <p className="text-gray-600 mb-8">Test all SDK features and verify backend integration</p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* SDK Info */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold mb-4">SDK Information</h2>
                        <div className="space-y-2 text-sm font-mono">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Visitor ID:</span>
                                <span className="font-semibold">{visitorId.substring(0, 16)}...</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Session ID:</span>
                                <span className="font-semibold">{sessionId.substring(0, 16)}...</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Backend:</span>
                                <span className="font-semibold">localhost:5000</span>
                            </div>
                        </div>
                    </div>

                    {/* Tracking Tests */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold mb-4">Tracking Tests</h2>
                        <div className="space-y-2">
                            <button
                                onClick={testPageView}
                                className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                            >
                                Track Page View
                            </button>
                            <button
                                onClick={testCustomEvent}
                                className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                            >
                                Track Custom Event
                            </button>
                            <button
                                onClick={testIdentify}
                                className="w-full bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
                            >
                                Identify User
                            </button>
                            <button
                                onClick={testFlush}
                                className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded"
                            >
                                Flush Events
                            </button>
                        </div>
                    </div>

                    {/* Test Results */}
                    <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
                        <h2 className="text-xl font-semibold mb-4">Test Results</h2>
                        <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-64 overflow-y-auto">
                            {testResults.map((result, i) => (
                                <div key={i}>{result}</div>
                            ))}
                            {testResults.length === 0 && (
                                <div className="text-gray-500">No tests run yet...</div>
                            )}
                        </div>
                    </div>

                    {/* CRM API Test */}
                    <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
                        <h2 className="text-xl font-semibold mb-4">CRM API Test</h2>
                        <button
                            onClick={testCRMAPI}
                            className="mb-4 bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded"
                        >
                            Test CRM API (Get Contacts)
                        </button>
                        <div className="bg-gray-900 text-blue-400 p-4 rounded font-mono text-xs h-64 overflow-y-auto whitespace-pre-wrap">
                            {crmResults || 'Click button to test CRM API...'}
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 lg:col-span-2">
                        <h3 className="font-semibold text-blue-900 mb-2">Testing Instructions</h3>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                            <li>Open browser DevTools Console to see debug logs</li>
                            <li>Click the tracking buttons to send events</li>
                            <li>Check backend terminal for received events</li>
                            <li>Verify events in database or backend logs</li>
                            <li>For CRM API test, you need a valid auth token</li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    );
}
