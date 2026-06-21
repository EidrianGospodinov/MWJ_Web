import './AnalyticsPage.css';

const METRIC_TILES = [
    { key: 'users',    label: 'Total Users' },
    { key: 'sessions', label: 'Active Sessions' },
    { key: 'views',    label: 'Content Views' },
    { key: 'engage',   label: 'Engagement Rate' },
] as const;

const COMING_SOON = [
    { title: 'Geographic Heatmap',   desc: 'Where users are located across the world.' },
    { title: 'Alerts & Thresholds',  desc: 'Custom metric thresholds with anomaly alerts.' },
    { title: 'Retention Funnel',     desc: 'How users progress through key flows.' },
    { title: 'Export & Reports',     desc: 'Download CSV or PDF reports of any metric range.' },
];

function ChartPlaceholder({ label }: { label: string }) {
    return (
        <div className="an-chart-placeholder">
            {label} — not built yet
        </div>
    );
}

export default function AnalyticsPage() {
    return (
        <section className="an-page">
            <h1 className="an-heading">Analytics</h1>
            <p className="an-subheading">
                Metrics and insights for your platform. Data pipeline not connected yet.
            </p>

            {/* KPI metric tiles */}
            <div className="an-tiles">
                {METRIC_TILES.map(({ key, label }) => (
                    <div key={key} className="an-tile">
                        <span className="an-tile__label">{label}</span>
                        <span className="an-tile__value">—</span>
                        <span className="an-tile__delta">no data</span>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="an-charts">
                <div className="an-chart-card">
                    <h2 className="an-chart-card__title">User Growth</h2>
                    <ChartPlaceholder label="User growth chart" />
                </div>
                <div className="an-chart-card">
                    <h2 className="an-chart-card__title">Content Breakdown</h2>
                    <ChartPlaceholder label="Content breakdown" />
                </div>
            </div>

            <div className="an-chart-card">
                <h2 className="an-chart-card__title">Monthly Sessions</h2>
                <ChartPlaceholder label="Monthly sessions" />
            </div>

            {/* Coming-soon features */}
            <div className="an-coming-row">
                {COMING_SOON.map(({ title, desc }) => (
                    <div key={title} className="an-coming-card">
                        <h3 className="an-coming-card__title">{title}</h3>
                        <p className="an-coming-card__desc">{desc}</p>
                        <span className="an-coming-card__tag">coming soon</span>
                    </div>
                ))}
            </div>
        </section>
    );
}
