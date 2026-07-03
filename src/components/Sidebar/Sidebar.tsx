import {Tab} from '../../types';
import type {AdminGroup} from '../../hooks/useAdminGroups';
import {canAccessTab} from '../../config/access';
import './Sidebar.css';
import logo from '../../assets/Logo.png';

type Props = {
    activeTab: Tab;
    onNavigate: (tab: Tab) => void;
    groups: AdminGroup[];
};

const NAV_ITEMS: { label: string; tab: Tab }[] = [
    {label: 'Dashboard', tab: 'Dashboard'},
    {label: 'User Management', tab: 'User'},
    {label: 'Content Manager', tab: 'Content'},
    {label: 'System Logs', tab: 'SystemLogs'},
    {label: 'Analytics', tab: 'Analytics'},
    {label: 'Rewards', tab: 'Rewards'},
    {label: 'Resources', tab: 'Resources'},
    {label: 'Societies', tab: 'Societies'},
];

export default function Sidebar({activeTab, onNavigate, groups}: Props) {
    const visibleItems = NAV_ITEMS.filter(({tab}) => canAccessTab(tab, groups));

    return (
        <aside className="sidebar">
            <div className="sidebar-top">
                <div className="logo-box" onClick={() => onNavigate('Dashboard')}>
                    <img src={logo} alt="MWJ Logo" className="sidebar-logo"/>
                </div>
            </div>

            <nav className="sidebar-nav">
                <ul>
                    {visibleItems.map(({label, tab}) => (
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


        </aside>
    );
}
