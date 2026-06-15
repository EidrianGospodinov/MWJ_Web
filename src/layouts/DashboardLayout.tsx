import {useState} from 'react';
import {useAuthenticator} from '@aws-amplify/ui-react';
import {Tab} from '../types';
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
    const [activeTab, setActiveTab] = useState<Tab>('Dashboard');

    const ActivePage = PAGE_MAP[activeTab];

    return (
        <div className="dashboard-container">
            <Sidebar
                activeTab={activeTab}
                onNavigate={setActiveTab}
            />
            <main className="main-content">
                <TopBar onNavigate={setActiveTab} onSignOut={signOut}/>
                <ActivePage/>
            </main>
        </div>
    );
}
