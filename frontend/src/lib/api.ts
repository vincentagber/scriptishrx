import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
    withCredentials: true, // Important for cookies (Refresh Token)
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Attach Token
api.interceptors.request.use((config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response Interceptor: Handle 401 (Refresh Logic)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Attempt Refresh (HttpOnly cookie sent automatically)
                const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/refresh`, {}, {
                    withCredentials: true
                });

                if (data.token) {
                    localStorage.setItem('token', data.token); // Update Access Token
                    originalRequest.headers.Authorization = `Bearer ${data.token}`;
                    return api(originalRequest); // Retry original request
                }
            } catch (refreshError) {
                // Refresh failed (Session expired)
                console.error('Session expired:', refreshError);
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('token');
                    window.location.href = '/login';
                }
            }
        }

        return Promise.reject(error);
    }
);

export default api;
