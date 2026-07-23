export default {
    theme: {
        extend: {
            animation: {
                'glow': 'glow 8s ease-in-out infinite',
            },
            keyframes: {
                glow: {
                    '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
                    '50%': { opacity: '0.8', transform: 'scale(1.1)' },
                },
            },
        },
    },
}