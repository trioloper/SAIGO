// /** Premium UI theme inspired by saigo.se (dark slate + warm gold accents) */
// module.exports = {
//   content: [
//     './pages/**/*.{js,jsx,ts,tsx}',
//     './components/**/*.{js,jsx,ts,tsx}',
//   ],
//   theme: {
//     extend: {
//       fontFamily: {
//         display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
//         title: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
//       },
//       colors: {
//         by: {
//           bg: '#0B0E13',
//           bg2: '#0E141D',
//           card: '#101826',
//           soft: '#121C2B',
//           line: 'rgba(255,255,255,0.06)',
//           text: '#E8ECF3',
//           sub: '#A9B4C5',
//           // warm golds (accent) matching saigo vibe
//           y: '#E9C46A',
//           y2: '#F4D35E',
//           // utility accents for states
//           green: '#00E3A2',
//           red: '#FF6B6B',
//           blue: '#6AB0FF',
//         },
//       },
//       boxShadow: {
//         float: '0 14px 30px rgba(0,0,0,.45)',
//         ring: '0 0 0 1px rgba(233,196,106,.28), 0 12px 28px rgba(0,0,0,.45)',
//         soft: '0 1px 0 rgba(255,255,255,0.02), 0 12px 24px rgba(0,0,0,.35)',
//       },
//       borderRadius: {
//         xl2: '1rem',
//         xl3: '1.25rem',
//         pill: '999px',
//       },
//       backdropBlur: {
//         xs: '2px',
//       },
//       keyframes: {
//         'fade-in': {
//           '0%': { opacity: 0, transform: 'translateY(6px)' },
//           '100%': { opacity: 1, transform: 'translateY(0)' },
//         },
//         'pulse-ring': {
//           '0%': { boxShadow: '0 0 0 0 rgba(233,196,106,0.5)' },
//           '70%': { boxShadow: '0 0 0 12px rgba(233,196,106,0)' },
//           '100%': { boxShadow: '0 0 0 0 rgba(233,196,106,0)' },
//         },
//       },
//       animation: {
//         'fade-in': 'fade-in .35s ease-out both',
//         'pulse-ring': 'pulse-ring 1.8s ease-out infinite',
//       },
//       transitionTimingFunction: {
//         spring: 'cubic-bezier(.2,.8,.2,1)',
//       },
//     },
//   },
//   plugins: [],
// };
/** Saigo-style dark + gold theme config for Tailwind v4 */
module.exports = {
  content: [
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        by: {
          bg: '#090A0D',
          bg2: '#0C0E14',
          card: '#11141C',
          soft: '#1A1F2B',
          text: '#E6EAF2',
          sub: '#A5B0C0',
          gold: '#E9C46A',
          gold2: '#F4D35E',
        },
      },
      boxShadow: {
        float: '0 12px 30px rgba(0,0,0,0.6)',
        ring: '0 0 0 1px rgba(233,196,106,0.3), 0 12px 30px rgba(0,0,0,0.6)',
      },
      borderRadius: {
        xl2: '1rem',
      },
    },
  },
  plugins: [],
};
