'use client'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html lang="en">
            <body style={{
                margin: 0,
                padding: '1rem',
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                backgroundColor: 'white'
            }}>
                <div style={{ maxWidth: '28rem', width: '100%', textAlign: 'center' }}>
                    <div style={{
                        padding: '1rem',
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        borderRadius: '1rem',
                        border: '1px solid #fee2e2',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        wordBreak: 'break-all',
                        marginBottom: '1.5rem'
                    }}>
                        {error?.message || 'An unexpected error occurred'}
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '0.5rem' }}>Something went wrong!</h2>
                    <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>We encountered an error while rendering this page.</p>
                    <button
                        onClick={() => reset()}
                        style={{
                            padding: '0.75rem 1.5rem',
                            backgroundColor: '#0f172a',
                            color: 'white',
                            borderRadius: '0.75rem',
                            fontWeight: 'bold',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    )
}
