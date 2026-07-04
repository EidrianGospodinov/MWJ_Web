import React from 'react';
import './DashboardPage.css';

const HEALTH_SERVICES = ['Instagram API', 'AWS Cognito', 'AWS S3 Storage'];

export default function DashboardPage() {
    const [maintenanceOn, setMaintenanceOn] = React.useState(false);
    const [quietStart, setQuietStart] = React.useState('22:00');
    const [quietEnd, setQuietEnd] = React.useState('07:00');
    const [dailyCap, setDailyCap] = React.useState('3');
    const [weeklyCap, setWeeklyCap] = React.useState('10');

    return (
        <section className="db-page">
            <h1 className="db-heading">Dashboard Overview</h1>

            <div className="db-cards">
                <div className="db-card">
                    <h2 className="db-card__title">Maintenance Mode</h2>
                    <p className="db-card__desc">
                        Temporarily take the platform offline for updates.
                    </p>
                    <div className="db-toggle-row">
                        <div>
                            <div className="db-toggle-label">Maintenance mode</div>
                            <div className={`db-toggle-state${maintenanceOn ? ' db-toggle-state--on' : ''}`}>
                                {maintenanceOn ? 'ON — platform offline' : 'OFF'}
                            </div>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={maintenanceOn}
                            aria-label="Toggle maintenance mode"
                            className={`db-switch${maintenanceOn ? ' db-switch--on' : ''}`}
                            onClick={() => setMaintenanceOn(v => !v)}
                        >
                            <span className="db-switch__thumb" />
                        </button>
                    </div>
                </div>

                <div className="db-card">
                    <h2 className="db-card__title">System Health</h2>
                    <p className="db-card__desc">
                        Live status of connected services.
                    </p>
                    <ul className="db-health-list">
                        {HEALTH_SERVICES.map(name => (
                            <li key={name} className="db-health-item">
                                <span className="db-health-name">{name}</span>
                                <span className="db-health-status">
                                    <span className="db-health-dot" />
                                    Online
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="db-card">
                    <h2 className="db-card__title">Notifications</h2>
                    <p className="db-card__desc">
                        Control when and how often students receive notifications.
                    </p>

                    <p className="db-section-label">Global Quiet Hours</p>
                    <div className="db-field-row">
                        <div className="db-field-group">
                            <label className="db-field-label" htmlFor="db-quiet-start">Start</label>
                            <input
                                id="db-quiet-start"
                                className="db-input"
                                type="time"
                                value={quietStart}
                                onChange={e => setQuietStart(e.target.value)}
                            />
                        </div>
                        <div className="db-field-group">
                            <label className="db-field-label" htmlFor="db-quiet-end">End</label>
                            <input
                                id="db-quiet-end"
                                className="db-input"
                                type="time"
                                value={quietEnd}
                                onChange={e => setQuietEnd(e.target.value)}
                            />
                        </div>
                    </div>

                    <p className="db-section-label">Notification Frequency Caps</p>
                    <div className="db-field-row">
                        <div className="db-field-group">
                            <label className="db-field-label" htmlFor="db-daily-cap">Daily</label>
                            <input
                                id="db-daily-cap"
                                className="db-input"
                                type="number"
                                min={0}
                                step={1}
                                value={dailyCap}
                                onChange={e => setDailyCap(e.target.value)}
                            />
                        </div>
                        <div className="db-field-group">
                            <label className="db-field-label" htmlFor="db-weekly-cap">Weekly</label>
                            <input
                                id="db-weekly-cap"
                                className="db-input"
                                type="number"
                                min={0}
                                step={1}
                                value={weeklyCap}
                                onChange={e => setWeeklyCap(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
