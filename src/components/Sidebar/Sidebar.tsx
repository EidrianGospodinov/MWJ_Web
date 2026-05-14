import { Tab } from '../../types';
import './Sidebar.css';
import logo from '../../assets/Logo.png';

type Props = {
    activeTab: Tab;
    onNavigate: (tab: Tab) => void;
    onSignOut: () => void;
};

const NAV_ITEMS: { label: string; tab: Tab }[] = [
    { label: 'Dashboard',        tab: 'Dashboard' },
    { label: 'User Management',  tab: 'User' },
    { label: 'Content Manager',  tab: 'Content' },
    { label: 'System Logs',      tab: 'SystemLogs' },
    { label: 'Analytics',        tab: 'Analytics' },
];

export default function Sidebar({ activeTab, onNavigate, onSignOut }: Props) {
    return (
        <aside className="sidebar">
            <div className="sidebar-top">
                <div className="logo-box" onClick={() => onNavigate('Dashboard')}>
                    <img src={logo} alt="MWJ Logo" className="sidebar-logo" />
                </div>
            </div>

            <nav className="sidebar-nav">
                <ul>
                    {NAV_ITEMS.map(({ label, tab }) => (
                        <li
                            key={tab}
                            className={activeTab === tab ? 'active' : ''}
                            onClick={() => onNavigate(tab)}
                        >
                            {label}
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="sidebar-bottom">
                <button className="sign-out-btn" onClick={onSignOut}>
                    <span className="sidebar-icon">↪</span> Sign out
                </button>
            </div>
        </aside>
    );
}
