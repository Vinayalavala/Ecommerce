
import { NavLink } from 'react-router-dom';
import { footerLinks } from '../assets/assets.js';
import assets from '../assets/assets';

// Bottom tab bar items (mobile only). Adjust paths to match your routes.
const tabs = [
    {
        label: 'Home',
        to: '/',
        icon: (
            <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" />
        ),
    },
    {
        label: 'Products',
        to: '/products',
        icon: (
            <>
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </>
        ),
    },
    {
        label: 'Cart',
        to: '/cart',
        icon: (
            <>
                <circle cx="9" cy="20" r="1.5" />
                <circle cx="18" cy="20" r="1.5" />
                <path d="M2 3h3l2.6 11.2a1 1 0 0 0 1 .8h9.3a1 1 0 0 0 1-.76L21 7H6" />
            </>
        ),
    },
    {
        label: 'Orders',
        to: '/my-orders',
        icon: (
            <>
                <path d="M6 3h12a1 1 0 0 1 1 1v17l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1Z" />
                <path d="M9 8h6M9 12h6" />
            </>
        ),
    },
];

const Footer = () => {
    return (
        <footer className="mt-16 bg-gradient-to-b from-white to-primary/5 pb-20 md:pb-0">
            {/* ---------- Info card ---------- */}
            <div className="px-4 md:px-16 lg:px-24 xl:px-32">
                <div className="rounded-3xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-primary/10 p-6 md:p-10 flex flex-col md:flex-row gap-8 md:gap-10 text-gray-500">
                    {/* Brand */}
                    <div className="md:w-1/2">
                        <img className="w-32" src={assets.logo} alt="Alavala's Root & Craft" />
                        <p className="max-w-[410px] mt-4 text-sm leading-relaxed">
                            We deliver fresh groceries and snacks straight to your door. Trusted by thousands, we aim to
                            make your shopping experience simple and affordable.
                        </p>

                        {/* Trust chips */}
                        <div className="flex flex-wrap gap-2 mt-5">
                            {['Fresh daily', 'Fast delivery', 'Secure pay'].map((chip) => (
                                <span
                                    key={chip}
                                    className="px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary"
                                >
                                    {chip}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Link sections: collapsible cards on mobile, columns on desktop */}
                    <div className="w-full md:w-1/2 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
                        {footerLinks.map((section, index) => (
                            <details
                                key={index}
                                className="group rounded-2xl bg-gray-50 md:bg-transparent px-4 py-3 md:p-0 open:bg-primary/5 md:open:bg-transparent"
                                open={false}
                            >
                                <summary className="flex items-center justify-between cursor-pointer list-none font-semibold text-base text-gray-900 md:cursor-default md:pointer-events-none [&::-webkit-details-marker]:hidden">
                                    {section.title}
                                    <svg
                                        className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180 md:hidden"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="m6 9 6 6 6-6" />
                                    </svg>
                                </summary>
                                <ul className="text-sm space-y-2 mt-3 md:mt-4">
                                    {section.links.map((link, i) => (
                                        <li key={i}>
                                            <a
                                                href={link.url}
                                                className="block py-0.5 text-gray-500 hover:text-primary active:text-primary transition"
                                            >
                                                {link.text}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        ))}
                    </div>
                </div>

                <p className="py-5 text-center text-xs md:text-sm text-gray-500/80">
                    © {new Date().getFullYear()} Alavala's Root &amp; Craft. All rights reserved.
                </p>
            </div>

            {/* ---------- Mobile app-style bottom tab bar ---------- */}
            <nav
                className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/90 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                aria-label="Bottom navigation"
            >
                <ul className="flex items-stretch justify-around h-16">
                    {tabs.map((tab) => (
                        <li key={tab.label} className="flex-1">
                            <NavLink
                                to={tab.to}
                                end={tab.to === '/'}
                                className={({ isActive }) =>
                                    `relative flex flex-col items-center justify-center gap-1 h-full text-[11px] font-medium transition-colors active:scale-95 ${
                                        isActive ? 'text-primary' : 'text-gray-400'
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        {/* active indicator */}
                                        <span
                                            className={`absolute top-0 h-0.5 w-8 rounded-b-full bg-primary transition-opacity ${
                                                isActive ? 'opacity-100' : 'opacity-0'
                                            }`}
                                        />
                                        <svg
                                            className="w-6 h-6"
                                            viewBox="0 0 24 24"
                                            fill={isActive ? 'currentColor' : 'none'}
                                            fillOpacity={isActive ? 0.15 : 0}
                                            stroke="currentColor"
                                            strokeWidth="1.8"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            {tab.icon}
                                        </svg>
                                        {tab.label}
                                    </>
                                )}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
        </footer>
    );
};

export default Footer;
