import { useState, useRef, useEffect } from 'react';
import { Tab } from '../../types';
import type { AdminGroup } from '../../hooks/useAdminGroups';
import { canAccessTab } from '../../config/access';
import './TopBar.css';

type Props = {
    onNavigate: (tab: Tab) => void;
    onSignOut: () => void;
    groups: AdminGroup[];
};

export default function TopBar({ onNavigate, onSignOut, groups }: Props) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const navigate = (tab: Tab) => {
        onNavigate(tab);
        setDropdownOpen(false);
    };

    return (
        <header className="top-bar">
            <div className="search-container">
                <input type="text" placeholder="Search bar" className="search-input" />
            </div>

            <div className="top-bar-actions" ref={dropdownRef}>
                <button
                    className="hamburger-btn"
                    onClick={() => setDropdownOpen((prev) => !prev)}
                    aria-label="Menu"
                >
                    <span className="hamburger-line" />
                    <span className="hamburger-line" />
                    <span className="hamburger-line" />
                </button>

                {dropdownOpen && (
                    <div className="dropdown-menu">
                        {canAccessTab('Profile', groups) && (
                            <button className="dropdown-item" onClick={() => navigate('Profile')}>Profile</button>
                        )}
                        {canAccessTab('Settings', groups) && (
                            <button className="dropdown-item" onClick={() => navigate('Settings')}>Settings</button>
                        )}
                        {canAccessTab('UserLogs', groups) && (
                            <button className="dropdown-item" onClick={() => navigate('UserLogs')}>User Logs</button>
                        )}
                        <div className="dropdown-divider" />
                        <button className="dropdown-item dropdown-logout" onClick={() => { onSignOut(); setDropdownOpen(false); }}>
                            Logout
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}
