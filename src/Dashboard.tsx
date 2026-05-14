import {useState, useRef, useEffect} from 'react';
import './Dashboard.css';
import {useAuthenticator} from '@aws-amplify/ui-react';
import logo from './assets/Logo.png';
import {client} from "./client";
import TextBlock from "./TextBlock";

type Tab = 'Dashboard' | 'Content' | 'Analytics' | 'User' | 'Settings' | 'Profile' | 'SystemLogs' | 'UserLogs';

function Dashboard() {
    const {signOut} = useAuthenticator();
    const [activeTab, setActiveTab] = useState<Tab>('Dashboard');
    const [blocks, setBlocks] = useState<any[]>([]);
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

    const addTextBlock = () => {
        setBlocks((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                type: "text",
                content: {
                    text: "",
                },
            },
        ]);
    };

    const updateTextBlock = (id: string, text: string) => {
        setBlocks((prev) =>
            prev.map((block) =>
                block.id === id
                    ? { ...block, content: { ...block.content, text } }
                    : block
            )
        );
    };

    const saveData = async () => {
        const result = await client.models.ContentManagement.create({
            title: "My First ",
            blocks: JSON.stringify(blocks),
        });
        console.log("saved", result);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'Dashboard':
                return (
                    <section className="content-area">
                        <h1>Dashboard Overview</h1>
                        <div className="content-placeholder">
                            <p>Welcome to your admin dashboard summary.</p>
                        </div>
                    </section>
                );
            case 'User':
                return (
                    <section className="content-area">
                        <h1>User Management</h1>
                        <div className="content-placeholder">
                            <p>Control user roles and permissions.</p>
                        </div>
                    </section>
                );
            case 'Content':
                return (
                    <section className="content-area">
                        <h1>Content Manager</h1>
                        <div className="content-placeholder">
                            <p>Manage your posts, images, and other media here.</p>
                            <button onClick={saveData}>save data</button>
                            <button onClick={addTextBlock}>Add Text Block</button>
                            {blocks.map((block) => {
                                if (block.type === "text") {
                                    return (
                                        <TextBlock
                                            key={block.id}
                                            value={block.content.text}
                                            onChange={(text) => updateTextBlock(block.id, text)}
                                        />
                                    );
                                }
                                return null;
                            })}
                            <pre>{JSON.stringify(blocks, null, 2)}</pre>
                        </div>
                    </section>
                );
            case 'SystemLogs':
                return (
                    <section className="content-area">
                        <h1>System Logs</h1>
                        <div className="content-placeholder">
                            <p>View system activity and error logs.</p>
                        </div>
                    </section>
                );
            case 'Analytics':
                return (
                    <section className="content-area">
                        <h1>Analytics</h1>
                        <div className="content-placeholder">
                            <p>View your traffic and user engagement metrics.</p>
                        </div>
                    </section>
                );
            case 'Settings':
                return (
                    <section className="content-area">
                        <h1>System Settings</h1>
                        <div className="content-placeholder">
                            <p>Configure system preferences and account settings.</p>
                        </div>
                    </section>
                );
            case 'Profile':
                return (
                    <section className="content-area">
                        <h1>User Profile</h1>
                        <div className="content-placeholder">
                            <p>Manage your account settings and personal information.</p>
                        </div>
                    </section>
                );
            case 'UserLogs':
                return (
                    <section className="content-area">
                        <h1>User Logs</h1>
                        <div className="content-placeholder">
                            <p>View user activity logs.</p>
                        </div>
                    </section>
                );
            default:
                return null;
        }
    };

    return (
        <div className="dashboard-container">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-top">
                    <div className="logo-box" onClick={() => setActiveTab('Dashboard')} style={{cursor: 'pointer'}}>
                        <img src={logo} alt="MWJ Logo" className="sidebar-logo"/>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <ul>
                        <li
                            className={activeTab === 'Dashboard' ? 'active' : ''}
                            onClick={() => setActiveTab('Dashboard')}
                        >
                            Dashboard
                        </li>
                        <li
                            className={activeTab === 'User' ? 'active' : ''}
                            onClick={() => setActiveTab('User')}
                        >
                            User Management
                        </li>
                        <li
                            className={activeTab === 'Content' ? 'active' : ''}
                            onClick={() => setActiveTab('Content')}
                        >
                            Content Manager
                        </li>
                        <li
                            className={activeTab === 'SystemLogs' ? 'active' : ''}
                            onClick={() => setActiveTab('SystemLogs')}
                        >
                            System Logs
                        </li>
                        <li
                            className={activeTab === 'Analytics' ? 'active' : ''}
                            onClick={() => setActiveTab('Analytics')}
                        >
                            Analytics
                        </li>
                    </ul>
                </nav>

                <div className="sidebar-bottom">
                    <button className="sign-out-btn" onClick={signOut}>
                        <span className="icon">↪</span> Sign out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <header className="top-bar">
                    <div className="search-container">
                        <input type="text" placeholder="Search bar" className="search-input"/>
                    </div>
                    <div className="top-bar-actions" ref={dropdownRef}>
                        <button
                            className="hamburger-btn"
                            onClick={() => setDropdownOpen((prev) => !prev)}
                            aria-label="Menu"
                        >
                            <span className="hamburger-line"></span>
                            <span className="hamburger-line"></span>
                            <span className="hamburger-line"></span>
                        </button>
                        {dropdownOpen && (
                            <div className="dropdown-menu">
                                <button
                                    className="dropdown-item"
                                    onClick={() => { setActiveTab('Profile'); setDropdownOpen(false); }}
                                >
                                    Profile
                                </button>
                                <button
                                    className="dropdown-item"
                                    onClick={() => { setActiveTab('Settings'); setDropdownOpen(false); }}
                                >
                                    Settings
                                </button>
                                <button
                                    className="dropdown-item"
                                    onClick={() => { setActiveTab('UserLogs'); setDropdownOpen(false); }}
                                >
                                    User Logs
                                </button>
                                <div className="dropdown-divider"></div>
                                <button
                                    className="dropdown-item dropdown-logout"
                                    onClick={() => { signOut(); setDropdownOpen(false); }}
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                {renderContent()}
            </main>
        </div>
    );
}

export default Dashboard;
