import {useState} from 'react';
import './Dashboard.css';
import {useAuthenticator} from '@aws-amplify/ui-react';
import logo from './assets/Logo.png';
import {client} from "./client";
import TextBlock from "./TextBlock";

type Tab = 'Dashboard' | 'Content' | 'Analytics' | 'User' | 'Settings' | 'Notifications' | 'Profile';

function Dashboard() {
    const {signOut} = useAuthenticator();
    const [activeTab, setActiveTab] = useState<Tab>('Dashboard');
    const [blocks, setBlocks] = useState<any[]>([]);

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
    const updateTextBlock = (
        id: string,
        text: string
    ) => {
        setBlocks((prev) =>
            prev.map((block) =>
                block.id === id
                    ? {
                        ...block,
                        content: {
                            ...block.content,
                            text,
                        },
                    }
                    : block
            )
        );
    };

    const saveData = async () => {
        const result =  await client.models.ContentManagement.create({
            title: "My First ",
            blocks: JSON.stringify(blocks),
        });
        

        console.log("saved", result);
    }
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
            case 'Content':
                return (
                    <section className="content-area">
                        <h1>Content Management</h1>
                        <div className="content-placeholder">
                            <p>Manage your posts, images, and other media here.</p>
                            <button onClick={saveData}>save data</button>
                            <button onClick={addTextBlock}>
                                Add Text Block
                            </button>

                            {blocks.map((block) => {
                                if (block.type === "text") {
                                    return (
                                        <TextBlock
                                            key={block.id}
                                            value={block.content.text}
                                            onChange={(text) =>
                                                updateTextBlock(block.id, text)
                                            }
                                        />
                                    );
                                }

                                return null;
                            })}

                            <pre>
        {JSON.stringify(blocks, null, 2)}
      </pre>
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
            case 'User':
                return (
                    <section className="content-area">
                        <h1>User Management</h1>
                        <div className="content-placeholder">
                            <p>Control user roles and permissions.</p>
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
            case 'Notifications':
                return (
                    <section className="content-area">
                        <h1>Notifications</h1>
                        <div className="content-placeholder">
                            <p>Check your latest alerts and system messages.</p>
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
                    <div className="nav-group">
                        <span className="nav-label">Main</span>
                        <ul>
                            <li
                                className={activeTab === 'Dashboard' ? 'active' : ''}
                                onClick={() => setActiveTab('Dashboard')}
                            >
                                Dashboard
                            </li>
                            <li
                                className={activeTab === 'Content' ? 'active' : ''}
                                onClick={() => setActiveTab('Content')}
                            >
                                Content
                            </li>
                            <li
                                className={activeTab === 'Analytics' ? 'active' : ''}
                                onClick={() => setActiveTab('Analytics')}
                            >
                                Analytics
                            </li>
                            <li
                                className={activeTab === 'User' ? 'active' : ''}
                                onClick={() => setActiveTab('User')}
                            >
                                User
                            </li>
                        </ul>
                    </div>

                    <div className="nav-group">
                        <span className="nav-label">System</span>
                        <ul>
                            <li
                                className={activeTab === 'Settings' ? 'active' : ''}
                                onClick={() => setActiveTab('Settings')}
                            >
                                <span className="icon">⚙️</span> Settings
                            </li>
                        </ul>
                    </div>
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
                    <div className="top-bar-actions">
                        <button
                            className={`notification-btn ${activeTab === 'Notifications' ? 'active-icon' : ''}`}
                            onClick={() => setActiveTab('Notifications')}
                        >
                            <span className="icon">🔔</span>
                        </button>
                        <button
                            className={`profile-btn ${activeTab === 'Profile' ? 'active-icon' : ''}`}
                            onClick={() => setActiveTab('Profile')}
                            style={{
                                marginLeft: '10px',
                                background: '#e5e7eb',
                                border: 'none',
                                borderRadius: '50%',
                                width: '40px',
                                height: '40px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <span className="icon">👤</span>
                        </button>
                    </div>
                </header>

                {renderContent()}
            </main>
        </div>
    );
};

export default Dashboard;
