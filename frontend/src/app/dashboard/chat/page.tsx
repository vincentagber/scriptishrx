'use client';

import { useState, useEffect } from 'react';
import ChatInterface from '@/components/ChatInterface';
import { Bot, Save, Sparkles, MessageSquare, Plus, Trash2, HelpCircle, Book } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface FAQ {
    question: string;
    answer: string;
}

interface AIConfig {
    aiName: string;
    welcomeMessage: string;
    customSystemPrompt: string;
    model?: string;
    faqs?: FAQ[];
}

export default function ChatPage() {
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // AI Configuration State
    const [aiConfig, setAiConfig] = useState<AIConfig>({
        aiName: '',
        welcomeMessage: '',
        customSystemPrompt: '',
        model: 'gpt-4',
        faqs: []
    });

    const getToken = () => {
        if (typeof window !== 'undefined') return localStorage.getItem('token');
        return null;
    };

    const getHeaders = () => {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        const token = getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
    };

    useEffect(() => {
        fetchOrgInfo();
    }, []);

    const fetchOrgInfo = async () => {
        try {
            const res = await fetch(`${API_URL}/api/organization/info`, {
                headers: getHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.organization) {
                    const org = data.organization;
                    setAiConfig({
                        aiName: org.aiConfig?.aiName || org.aiName || 'ScriptishRx Assistant',
                        welcomeMessage: org.aiConfig?.welcomeMessage || org.aiWelcomeMessage || 'Hello, how can I help you today?',
                        customSystemPrompt: org.aiConfig?.systemPrompt || org.customSystemPrompt || 'You are a helpful assistant.',
                        model: org.aiConfig?.model || 'gpt-4',
                        faqs: org.aiConfig?.faqs || []
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching org info:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/organization/info`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify({
                    aiName: aiConfig.aiName, // Legacy
                    aiWelcomeMessage: aiConfig.welcomeMessage, // Legacy
                    customSystemPrompt: aiConfig.customSystemPrompt, // Legacy
                    aiConfig: {
                        aiName: aiConfig.aiName,
                        welcomeMessage: aiConfig.welcomeMessage,
                        systemPrompt: aiConfig.customSystemPrompt,
                        model: aiConfig.model,
                        faqs: aiConfig.faqs
                    }
                })
            });

            if (res.ok) {
                alert('Chat Agent configuration saved successfully!');
            } else {
                alert('Failed to save configuration');
            }
        } catch (error) {
            console.error('Error saving config:', error);
            alert('Error saving configuration');
        } finally {
            setIsSaving(false);
        }
    };

    const addFaq = () => {
        setAiConfig(prev => ({
            ...prev,
            faqs: [...(prev.faqs || []), { question: '', answer: '' }]
        }));
    };

    const removeFaq = (index: number) => {
        setAiConfig(prev => ({
            ...prev,
            faqs: (prev.faqs || []).filter((_, i) => i !== index)
        }));
    };

    const updateFaq = (index: number, field: 'question' | 'answer', value: string) => {
        setAiConfig(prev => {
            const newFaqs = [...(prev.faqs || [])];
            newFaqs[index] = { ...newFaqs[index], [field]: value };
            return { ...prev, faqs: newFaqs };
        });
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Chat Agent Studio</h1>
                    <p className="text-gray-500 mt-2">Customize your AI chatbot's knowledge, personality, and behavior.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Column: Configuration */}
                <div className="lg:col-span-7 space-y-8">

                    {/* General Settings */}
                    <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
                            <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
                                <Bot className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Agent Persona</h2>
                                <p className="text-gray-500 text-xs mt-0.5">Core personality and logic.</p>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-800">Bot Name</label>
                                    <Input
                                        value={aiConfig.aiName}
                                        onChange={(e) => setAiConfig({ ...aiConfig, aiName: e.target.value })}
                                        className="bg-white border-gray-300"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-800">Model</label>
                                    <select
                                        value={aiConfig.model}
                                        onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                                        className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="gpt-4">GPT-4 (Smarter)</option>
                                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-800">Before-Instruction Prompt</label>
                                <textarea
                                    value={aiConfig.customSystemPrompt}
                                    onChange={(e) => setAiConfig({ ...aiConfig, customSystemPrompt: e.target.value })}
                                    placeholder="You are a helpful assistant..."
                                    className="w-full min-h-[150px] p-4 rounded-xl border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                                />
                                <p className="text-xs text-gray-500">Define the bot's role, tone, and operational boundaries.</p>
                            </div>
                        </div>
                    </div>

                    {/* Knowledge Base (FAQs) */}
                    <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-600 text-white rounded-lg shadow-sm">
                                    <Book className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Knowledge Base</h2>
                                    <p className="text-gray-500 text-xs mt-0.5">Teach the AI specific answers (Q&A).</p>
                                </div>
                            </div>
                            <Button size="sm" onClick={addFaq} variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50">
                                <Plus className="w-4 h-4 mr-1" /> Add Q&A
                            </Button>
                        </div>

                        <div className="p-6 space-y-4">
                            {!aiConfig.faqs || aiConfig.faqs.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>No FAQs added yet. Add questions to train your bot.</p>
                                </div>
                            ) : (
                                aiConfig.faqs.map((faq, index) => (
                                    <div key={index} className="bg-slate-50 p-4 rounded-xl border border-gray-200 relative group transition-all hover:border-purple-200 hover:shadow-sm">
                                        <div className="space-y-3">
                                            <Input
                                                placeholder="Question (e.g. What are your hours?)"
                                                value={faq.question}
                                                onChange={(e) => updateFaq(index, 'question', e.target.value)}
                                                className="bg-white border-gray-200 font-medium"
                                            />
                                            <textarea
                                                placeholder="Answer (e.g. We are open 9am-5pm Mon-Fri)"
                                                value={faq.answer}
                                                onChange={(e) => updateFaq(index, 'answer', e.target.value)}
                                                className="w-full p-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[80px]"
                                            />
                                        </div>
                                        <button
                                            onClick={() => removeFaq(index)}
                                            className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <Button
                        onClick={handleSaveConfig}
                        disabled={isSaving}
                        className="w-full h-12 bg-gray-900 hover:bg-black text-white rounded-xl font-semibold shadow-lg shadow-gray-200 transition-all hover:-translate-y-0.5"
                    >
                        {isSaving ? <Loader /> : <Save className="w-5 h-5 mr-2" />}
                        {isSaving ? 'Saving Changes...' : 'Save Configuration'}
                    </Button>
                </div>

                {/* Right Column: Live Preview */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-200 overflow-hidden h-[calc(100vh-12rem)] sticky top-6 flex flex-col">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
                            <div className="p-2 bg-green-600 text-white rounded-lg shadow-sm">
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Live Preview</h2>
                                <p className="text-gray-500 text-xs mt-0.5">Test your changes instantly.</p>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden bg-gray-50 p-4">
                            {/* We pass a key to force re-render if needed, but ChatInterface fetches history on mount. 
                                Actually, we might want to clear history when config changes to test fresh.
                            */}
                            <div className="h-full rounded-2xl overflow-hidden shadow-sm border border-gray-200 bg-white">
                                <ChatInterface isDashboard={true} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Loader() {
    return (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    );
}