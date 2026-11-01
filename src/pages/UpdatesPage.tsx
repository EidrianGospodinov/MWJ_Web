import {WEB_UPDATES, APP_UPDATES, type UpdateEntry} from '../data/changelog';
import './ContentManagerPage.css';
import './UpdatesPage.css';

function formatDate(iso: string): string {
    return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

function UpdateCard({title, subtitle, entries}: { title: string; subtitle: string; entries: UpdateEntry[] }) {
    return (
        <section className="cm-card upd-card" aria-label={`${title} updates`}>
            <header className="upd-card__header">
                <div>
                    <h2 className="upd-card__title">{title}</h2>
                    <span className="cm-hint">{subtitle}</span>
                </div>
                <span className="upd-card__latest">
                    {entries[0]?.version ? `Current: ${entries[0].version}` : `Updated ${formatDate(entries[0]?.date ?? '')}`}
                </span>
            </header>

            <ol className="upd-list">
                {entries.map((entry, index) => (
                    <li key={`${entry.date}-${entry.title}`} className={`upd-entry${index === 0 ? ' upd-entry--latest' : ''}`}>
                        <div className="upd-entry__meta">
                            {entry.version && <span className="upd-entry__version">{entry.version}</span>}
                            <time dateTime={entry.date} className="upd-entry__date">{formatDate(entry.date)}</time>
                            {index === 0 && <span className="upd-entry__badge">Latest</span>}
                        </div>
                        <h3 className="upd-entry__title">{entry.title}</h3>
                        <ul className="upd-entry__items">
                            {entry.items.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </li>
                ))}
            </ol>
        </section>
    );
}

export default function UpdatesPage() {
    return (
        <section className="content-area cm-page">
            <div>
                <h1 className="cm-heading">Update Log</h1>
                <span className="cm-hint">What changed in the admin portal and the My Westminster Journey app, newest first.</span>
            </div>

            <div className="upd-grid">
                <UpdateCard
                    title="Web portal"
                    subtitle="Admin dashboard — deployed from the main branch"
                    entries={WEB_UPDATES}
                />
                <UpdateCard
                    title="Mobile app"
                    subtitle="Android — Google Play internal testing"
                    entries={APP_UPDATES}
                />
            </div>
        </section>
    );
}
