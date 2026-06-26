import React from 'react';
import './UserManagementPage.css';

type TabKey = 'users' | 'admins';

type Row = {
    id: string;
    fullName: string;
    email: string;
    role: string;
    status: string;
    joined: string;
    twoFactor: boolean;
};

const USERS: Row[] = [
    {
        id: 'u1',
        fullName: 'Amelia Hughes',
        email: 'amelia.hughes@my.westminster.ac.uk',
        role: 'Student',
        status: 'Active',
        joined: '12 Sep 2025',
        twoFactor: true,
    },
    {
        id: 'u2',
        fullName: 'Daniel Okafor',
        email: 'daniel.okafor@my.westminster.ac.uk',
        role: 'Student',
        status: 'Pending',
        joined: '03 Oct 2025',
        twoFactor: false,
    },
    {
        id: 'u3',
        fullName: 'Priya Nair',
        email: 'priya.nair@my.westminster.ac.uk',
        role: 'Society Lead',
        status: 'Active',
        joined: '21 Aug 2025',
        twoFactor: true,
    },
    {
        id: 'u4',
        fullName: 'Marco Rossi',
        email: 'marco.rossi@my.westminster.ac.uk',
        role: 'Student',
        status: 'Suspended',
        joined: '17 Nov 2025',
        twoFactor: false,
    },
];

const ADMINS: Row[] = [
    {
        id: 'a1',
        fullName: 'Sarah Whitfield',
        email: 'sarah.whitfield@westminster.ac.uk',
        role: 'Super Admin',
        status: 'Active',
        joined: '04 Jan 2025',
        twoFactor: true,
    },
    {
        id: 'a2',
        fullName: 'James Carter',
        email: 'james.carter@westminster.ac.uk',
        role: 'Content Admin',
        status: 'Active',
        joined: '19 Feb 2025',
        twoFactor: true,
    },
    {
        id: 'a3',
        fullName: 'Leila Hassan',
        email: 'leila.hassan@westminster.ac.uk',
        role: 'Rewards Admin',
        status: 'Active',
        joined: '28 Mar 2025',
        twoFactor: false,
    },
    {
        id: 'a4',
        fullName: 'Tom Bennett',
        email: 'tom.bennett@westminster.ac.uk',
        role: 'Content Admin',
        status: 'Suspended',
        joined: '11 May 2025',
        twoFactor: true,
    },
];

const TABS: { key: TabKey; label: string }[] = [
    {key: 'users', label: 'Users'},
    {key: 'admins', label: 'Admins'},
];

export default function UserManagementPage() {
    const [tab, setTab] = React.useState<TabKey>('users');
    const rows = tab === 'users' ? USERS : ADMINS;

    return (
        <section className="content-area um-page">
            <h1 className="um-heading">User Management</h1>

            <div className="um-tabs">
                {TABS.map(({key, label}) => (
                    <button
                        key={key}
                        className={`um-tab${tab === key ? ' um-tab--active' : ''}`}
                        onClick={() => setTab(key)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <table className="um-table">
                <thead>
                    <tr>
                        <th>Full name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Joined date</th>
                        <th>2F Auth</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.id}>
                            <td>{row.fullName}</td>
                            <td>{row.email}</td>
                            <td>{row.role}</td>
                            <td>{row.status}</td>
                            <td>{row.joined}</td>
                            <td>{row.twoFactor ? 'Enabled' : 'Disabled'}</td>
                            <td>
                                <button className="um-action">Edit</button>
                                <button className="um-action">Remove</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
}
