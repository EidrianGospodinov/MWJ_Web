import {useState} from 'react';
import {useAuthenticator} from '@aws-amplify/ui-react';
import {Tab} from '../types';
import {useAdminGroups} from '../hooks/useAdminGroups';
import {canAccessTab, firstAccessibleTab} from '../config/access';
import Sidebar from '../components/Sidebar/Sidebar';
import TopBar from '../components/TopBar/TopBar';
import DashboardPage from '../pages/DashboardPage';
import UserManagementPage from '../pages/UserManagementPage';
import ContentManagerPage from '../pages/ContentManagerPage';
import SystemLogsPage from '../pages/SystemLogsPage';
import AnalyticsPage from '../pages/AnalyticsPage';
import ProfilePage from '../pages/ProfilePage';
import SettingsPage from '../pages/SettingsPage';
import UserLogsPage from '../pages/UserLogsPage';
import RewardsPage from "../pages/RewardsPage.tsx";
import './DashboardLayout.css';
import SocietiesPage from "../pages/SocietiesPage.tsx";
import ResourcesPage from "../pages/ResourcesPage.tsx";

const PAGE_MAP: Record<Tab, React.ComponentType> = {
    Dashboard: DashboardPage,
    User: UserManagementPage,
    Content: ContentManagerPage,
    SystemLogs: SystemLogsPage,
    Analytics: AnalyticsPage,
    Profile: ProfilePage,
    Settings: SettingsPage,
    UserLogs: UserLogsPage,
    Rewards: RewardsPage,
    Resources: ResourcesPage,
    Societies: SocietiesPage,
};

export default function DashboardLayout() {
    const {signOut} = useAuthenticator();
    const groups = useAdminGroups();
    const [activeTab, setActiveTab] = useState<Tab>('Dashboard');

    if (groups === null) {
        return <div className="dashboard-status">Loading…</div>;
    }

    if (groups.length === 0) {
        return (
            <div className="dashboard-status dashboard-status--restricted">
                <h1>Access restricted</h1>
                <p>Your account isn't part of an admin group yet. Contact a Super Admin to request access.</p>
                <button onClick={signOut}>Sign out</button>
            </div>
        );
    }

    const visibleTab = canAccessTab(activeTab, groups) ? activeTab : firstAccessibleTab(groups);
    if (!visibleTab) {
        return (
            <div className="dashboard-status dashboard-status--restricted">
                <h1>Access restricted</h1>
                <p>Your admin group doesn't have access to any pages. Contact a Super Admin.</p>
                <button onClick={signOut}>Sign out</button>
            </div>
        );
    }

    const ActivePage = PAGE_MAP[visibleTab];

    return (
        <div className="dashboard-container">
            <Sidebar
                activeTab={visibleTab}
                onNavigate={setActiveTab}
                groups={groups}
            />
            <main className="main-content">
                <TopBar onNavigate={setActiveTab} onSignOut={signOut} groups={groups}/>
                <ActivePage/>
            </main>
        </div>
    );
}
