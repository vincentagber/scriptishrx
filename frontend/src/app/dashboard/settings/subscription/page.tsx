'use client';

import { useState, useEffect } from 'react';
import { Check, CreditCard } from 'lucide-react';

export default function SubscriptionPage() {
    const [currentPlan, setCurrentPlan] = useState('Basic');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Fetch current subscription
        // For MVP, we might store this in user context or fetch from API
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        // TODO: Fetch real subscription status
    }, []);

    const handleSubscribe = async (plan: string) => {
        setLoading(true);
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const token = localStorage.getItem('token');

            const res = await fetch('http://localhost:5000/api/payments/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ userId: user.id, plan })
            });

            const data = await res.json();
            if (data.url) {
                window.location.href = data.url; // Redirect to Stripe
            } else if (data.success) {
                alert(`Successfully subscribed to ${plan}!`);
                setCurrentPlan(plan);
            }
        } catch (error) {
            console.error('Subscription error:', error);
            alert('Failed to process subscription');
        } finally {
            setLoading(false);
        }
    };

    const plans = [
        { name: 'Basic', price: '$99.99', features: ['Public Chatbot', 'Basic CRM', 'Email Support'] },
        { name: 'Intermediate', price: '$149.99', features: ['Everything in Basic', 'Voice Agent', 'Advanced Analytics', 'Priority Support'] },
        { name: 'Advanced', price: '$249.99', features: ['Everything in Intermediate', 'Custom AI Training', 'Dedicated Account Manager', 'API Access'] }
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
                <p className="text-gray-500">Choose the plan that fits your business</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <div key={plan.name} className={`bg-white p-8 rounded-3xl shadow-sm border ${currentPlan === plan.name ? 'border-black ring-2 ring-black/5' : 'border-gray-100'}`}>
                        <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                        <div className="mt-4 flex items-baseline text-gray-900">
                            <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                            <span className="ml-1 text-xl font-semibold text-gray-500">/month</span>
                        </div>
                        <ul className="mt-6 space-y-4">
                            {plan.features.map((feature) => (
                                <li key={feature} className="flex">
                                    <Check className="flex-shrink-0 w-5 h-5 text-green-500" />
                                    <span className="ml-3 text-sm text-gray-500">{feature}</span>
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() => handleSubscribe(plan.name)}
                            disabled={loading || currentPlan === plan.name}
                            className={`mt-8 block w-full py-3 px-6 border border-transparent rounded-xl text-center font-medium ${currentPlan === plan.name
                                ? 'bg-gray-100 text-gray-900 cursor-default'
                                : 'bg-black text-white hover:bg-gray-800'
                                }`}
                        >
                            {currentPlan === plan.name ? 'Current Plan' : 'Subscribe'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
