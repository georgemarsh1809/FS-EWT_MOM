import { useState } from 'react';
import { login as apiLogin } from '../api/client';
import { useAuthStore } from '../store/auth';

export function Login() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { setToken } = useAuthStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const token = await apiLogin(password);
            setToken(token);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page">
            <header className="hero" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ maxWidth: '400px', width: '100%', padding: '20px' }}>
                    <h1>Login</h1>
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '16px' }}>
                            <label htmlFor="password" style={{ display: 'block', marginBottom: '8px' }}>
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                autoFocus
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                    fontSize: '16px',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>
                        {error && (
                            <div style={{ color: '#d32f2f', marginBottom: '16px', fontSize: '14px' }}>
                                {error}
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '10px 16px',
                                backgroundColor: loading ? '#ccc' : '#1976d2',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '16px',
                            }}
                        >
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>
                </div>
            </header>
        </div>
    );
}
