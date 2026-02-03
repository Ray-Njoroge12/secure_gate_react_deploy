import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { RefreshCw, Trash2, Mail, MessageSquare, Search, Clock } from 'lucide-react';
import { format } from 'date-fns';
import api from '../../services/api';

const MessageViewer = () => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    const fetchMessages = async () => {
        setLoading(true);
        try {
            // Direct fetch to avoid interceptors if possible, or use standard api client
            const response = await api.get('/dev/messages');
            setMessages(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const clearHistory = async () => {
        if (!window.confirm('Clear all message history?')) return;
        try {
            await api.delete('/dev/messages');
            fetchMessages();
        } catch (error) {
            console.error('Failed to clear history:', error);
        }
    };

    useEffect(() => {
        fetchMessages();
        // Auto-refresh every 5 seconds
        const interval = setInterval(fetchMessages, 5000);
        return () => clearInterval(interval);
    }, []);

    const filteredMessages = messages.filter(msg =>
        filter === 'all' ? true : msg.type === filter
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Message Simulator</h1>
                    <p className="text-gray-500 dark:text-gray-400">View locally captured SMS and Emails</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={fetchMessages} variant="outline" className="gap-2">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button onClick={clearHistory} variant="destructive" className="gap-2">
                        <Trash2 className="w-4 h-4" />
                        Clear
                    </Button>
                </div>
            </div>

            <div className="flex gap-2 pb-4">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-full text-sm font-medium ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                    All
                </button>
                <button
                    onClick={() => setFilter('sms')}
                    className={`px-4 py-2 rounded-full text-sm font-medium ${filter === 'sms' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                    SMS
                </button>
                <button
                    onClick={() => setFilter('email')}
                    className={`px-4 py-2 rounded-full text-sm font-medium ${filter === 'email' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                    Email
                </button>
            </div>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">To</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/2">Content</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredMessages.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                        No messages captured yet
                                    </td>
                                </tr>
                            ) : (
                                filteredMessages.map((msg) => (
                                    <tr key={msg.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${msg.type === 'sms'
                                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                }`}>
                                                {msg.type === 'sms' ? <MessageSquare className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
                                                {msg.type.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                            {msg.to}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-mono bg-gray-50/50 p-2 rounded">
                                            {msg.content}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {format(new Date(msg.timestamp), 'HH:mm:ss')}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-0.5">
                                                {format(new Date(msg.timestamp), 'MMM d')}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default MessageViewer;
