import React from 'react';
import {getCurrentUser} from 'aws-amplify/auth';
import {client} from '../client';
import type {Schema} from '../../amplify/data/resource';
import ThumbnailUploader from '../components/ThumbnailUploader/ThumbnailUploader';
import Pagination from '../components/Pagination/Pagination';
import {usePagination} from '../components/Pagination/usePagination';
import {friendlyError} from '../utils/errors';
import {logAudit} from '../utils/audit';
import {
    CAMPUSES,
    DAYS,
    DEFAULT_ROLES,
    committeeToText,
    parseCommittee,
    parseTimetable,
    sessionLabel,
    type CommitteeMember,
    type TimetableSession,
} from '../utils/societyData';
import './ContentManagerPage.css';

type SocietyRecord = Schema['Society']['type'];

export default function SocietiesPage() {
    const [name, setName] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [committee, setCommittee] = React.useState<CommitteeMember[]>([]);
    const [timetable, setTimetable] = React.useState<TimetableSession[]>([]);
    const [website, setWebsite] = React.useState('');
    const [instagram, setInstagram] = React.useState('');
    const [whatsapp, setWhatsapp] = React.useState('');
    const [logoKey, setLogoKey] = React.useState<string | null>(null);
    const [societies, setSocieties] = React.useState<SocietyRecord[]>([]);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [loadError, setLoadError] = React.useState<string | null>(null);
    const [saving, setSaving] = React.useState(false);

    const sorted = React.useMemo(
        () =>
            [...societies].sort((a, b) => {
                const ao = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
                const bo = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
                if (ao !== bo) return ao - bo;
                return a.name.localeCompare(b.name);
            }),
        [societies]
    );

    const societiesPag = usePagination(sorted);

    const knownRoles = React.useMemo(() => {
        const set = new Set<string>(DEFAULT_ROLES);
        societies.forEach((s) => {
            parseCommittee(s.committee, s.committeeMembers).forEach((m) => {
                if (m.role.trim()) set.add(m.role.trim());
            });
        });
        committee.forEach((m) => {
            if (m.role.trim()) set.add(m.role.trim());
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [societies, committee]);

    const fetchSocieties = async () => {
        if (!client.models.Society) return;
        try {
            const {data, errors} = await client.models.Society.list();
            if (errors?.length) throw new Error(errors[0].message);
            setSocieties(data);
            setLoadError(null);
        } catch (err) {
            setLoadError(friendlyError(err, 'Could not load the societies. Try refreshing.'));
        }
    };

    React.useEffect(() => {
        fetchSocieties();
    }, []);

    const resetFields = () => {
        setName('');
        setDescription('');
        setCommittee([]);
        setTimetable([]);
        setWebsite('');
        setInstagram('');
        setWhatsapp('');
        setLogoKey(null);
        setEditingId(null);
    };

    const addMember = () => {
        const used = new Set(committee.map((m) => m.role));
        const nextRole = DEFAULT_ROLES.find((r) => !used.has(r)) ?? '';
        setCommittee((prev) => [...prev, {id: crypto.randomUUID(), role: nextRole, name: ''}]);
    };

    const updateMember = (id: string, patch: Partial<CommitteeMember>) => {
        setCommittee((prev) => prev.map((m) => (m.id === id ? {...m, ...patch} : m)));
    };

    const removeMember = (id: string) => {
        setCommittee((prev) => prev.filter((m) => m.id !== id));
    };

    const addSession = () => {
        setTimetable((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                day: DAYS[0],
                startTime: '18:00',
                endTime: '20:00',
                campus: CAMPUSES[0],
                location: '',
            },
        ]);
    };

    const updateSession = (id: string, patch: Partial<TimetableSession>) => {
        setTimetable((prev) => prev.map((s) => (s.id === id ? {...s, ...patch} : s)));
    };

    const removeSession = (id: string) => {
        setTimetable((prev) => prev.filter((s) => s.id !== id));
    };

    const saveSociety = async () => {
        if (!name.trim()) {
            alert('Please enter a society name before saving.');
            return;
        }
        if (!client.models.Society) {
            alert('The Society model is not deployed yet.');
            return;
        }
        const cleanCommittee = committee
            .map((m) => ({...m, role: m.role.trim(), name: m.name.trim()}))
            .filter((m) => m.role !== '' || m.name !== '');
        const incomplete = cleanCommittee.find((m) => m.role === '' || m.name === '');
        if (incomplete) {
            alert('Each committee member needs both a role and a name.');
            return;
        }
        const cleanTimetable = timetable
            .map((s) => ({...s, location: s.location.trim()}))
            .filter((s) => s.day || s.campus || s.location);

        setSaving(true);
        try {
            const payload = {
                name: name.trim(),
                description,
                committee: JSON.stringify(cleanCommittee),
                timetable: JSON.stringify(cleanTimetable),
                committeeMembers: committeeToText(cleanCommittee),
                website,
                instagram,
                whatsapp,
                logoKey,
            };
            if (editingId) {
                const {errors} = await client.models.Society.update({id: editingId, ...payload});
                if (errors?.length) throw new Error(errors[0].message);
            } else {
                const createdBy = await getCurrentUser()
                    .then((u) => u.signInDetails?.loginId ?? u.username)
                    .catch(() => undefined);
                const {errors} = await client.models.Society.create({
                    ...payload,
                    createdBy,
                    displayOrder: societies.length,
                });
                if (errors?.length) throw new Error(errors[0].message);
            }
            logAudit(
                'Societies',
                editingId ? 'updated' : 'created',
                name.trim(),
                `${cleanCommittee.length} committee · ${cleanTimetable.length} session(s)`
            );
            resetFields();
            await fetchSocieties();
        } catch (err) {
            console.error('Save failed', err);
            alert(friendlyError(err, 'Saving the society failed. Please try again.'));
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (society: SocietyRecord) => {
        setName(society.name);
        setDescription(society.description ?? '');
        setCommittee(parseCommittee(society.committee, society.committeeMembers));
        setTimetable(parseTimetable(society.timetable));
        setWebsite(society.website ?? '');
        setInstagram(society.instagram ?? '');
        setWhatsapp(society.whatsapp ?? '');
        setLogoKey(society.logoKey ?? null);
        setEditingId(society.id);
        document.querySelector('.content-area')?.scrollTo({top: 0, behavior: 'smooth'});
    };

    const deleteSociety = async (id: string) => {
        if (!client.models.Society) return;
        try {
            const item = societies.find((s) => s.id === id);
            const {errors} = await client.models.Society.delete({id});
            if (errors?.length) throw new Error(errors[0].message);
            logAudit('Societies', 'deleted', item?.name ?? id);
            if (editingId === id) resetFields();
            await fetchSocieties();
        } catch (err) {
            alert(friendlyError(err, 'Deleting the society failed. Please try again.'));
        }
    };

    const linkCount = (s: SocietyRecord) =>
        [s.website, s.instagram, s.whatsapp].filter((v) => !!v && v.trim() !== '').length;

    return (
        <section className="content-area cm-page">
            <h1 className="cm-heading">Societies</h1>

            {loadError && (
                <div className="cm-load-error">
                    {loadError}
                    <button
                        className="cm-load-error__retry"
                        onClick={() => { setLoadError(null); fetchSocieties(); }}
                    >
                        Retry
                    </button>
                </div>
            )}

            <datalist id="society-role-options">
                {knownRoles.map((r) => (
                    <option key={r} value={r} />
                ))}
            </datalist>

            <div className="cm-body">

                <aside className="cm-left">
                    <div className="cm-card">
                        <label className="cm-section-label" htmlFor="society-name">
                            Society Name
                        </label>
                        <input
                            id="society-name"
                            className="cm-title-input"
                            type="text"
                            placeholder="Enter society name…"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="cm-card">
                        <span className="cm-section-label">Society Logo</span>
                        <ThumbnailUploader thumbnailKey={logoKey} onChange={setLogoKey}/>
                    </div>

                    <div className="cm-card">
                        <span className="cm-section-label">Links</span>
                        <label className="cm-section-label" htmlFor="society-website">
                            UWSU Website
                        </label>
                        <input
                            id="society-website"
                            className="cm-title-input"
                            type="url"
                            placeholder="https://www.uwsu.com/…"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                        />
                        <label className="cm-section-label" htmlFor="society-instagram">
                            Instagram
                        </label>
                        <input
                            id="society-instagram"
                            className="cm-title-input"
                            type="url"
                            placeholder="https://www.instagram.com/…"
                            value={instagram}
                            onChange={(e) => setInstagram(e.target.value)}
                        />
                        <label className="cm-section-label" htmlFor="society-whatsapp">
                            WhatsApp Join Link
                        </label>
                        <input
                            id="society-whatsapp"
                            className="cm-title-input"
                            type="url"
                            placeholder="https://chat.whatsapp.com/…"
                            value={whatsapp}
                            onChange={(e) => setWhatsapp(e.target.value)}
                        />
                    </div>
                </aside>

                <div className="cm-right">

                    <div className="cm-card">
                        <label className="cm-section-label" htmlFor="society-description">
                            Description
                        </label>
                        <textarea
                            id="society-description"
                            className="cm-title-input"
                            rows={4}
                            placeholder="What is this society about? Who is it for?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="cm-card">
                        <span className="cm-section-label">Committee Members</span>
                        {committee.length === 0 ? (
                            <p className="cm-empty-state">No committee members yet.</p>
                        ) : (
                            <div className="soc-rows">
                                <div className="soc-row soc-row--head">
                                    <span className="cm-section-label">Role</span>
                                    <span className="cm-section-label">Name</span>
                                    <span/>
                                </div>
                                {committee.map((m) => (
                                    <div key={m.id} className="soc-row">
                                        <input
                                            className="cm-title-input"
                                            list="society-role-options"
                                            placeholder="e.g. President"
                                            value={m.role}
                                            onChange={(e) => updateMember(m.id, {role: e.target.value})}
                                        />
                                        <input
                                            className="cm-title-input"
                                            type="text"
                                            placeholder="Full name"
                                            value={m.name}
                                            onChange={(e) => updateMember(m.id, {name: e.target.value})}
                                        />
                                        <button
                                            type="button"
                                            className="soc-remove"
                                            onClick={() => removeMember(m.id)}
                                            aria-label="Remove member"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button type="button" className="cm-add-row" onClick={addMember}>
                            + Add committee member
                        </button>
                        <span className="cm-hint">
                            Pick a suggested role or type a new one — new roles become suggestions for every society.
                        </span>
                    </div>

                    <div className="cm-card">
                        <span className="cm-section-label">Timetable &amp; Location</span>
                        {timetable.length === 0 ? (
                            <p className="cm-empty-state">No sessions yet.</p>
                        ) : (
                            <div className="soc-rows">
                                <div className="soc-session soc-row--head">
                                    <span className="cm-section-label">Day</span>
                                    <span className="cm-section-label">Start</span>
                                    <span className="cm-section-label">End</span>
                                    <span className="cm-section-label">Campus</span>
                                    <span className="cm-section-label">Room / place</span>
                                    <span/>
                                </div>
                                {timetable.map((s) => (
                                    <div key={s.id} className="soc-session">
                                        <select
                                            className="cm-title-input"
                                            value={s.day}
                                            onChange={(e) => updateSession(s.id, {day: e.target.value})}
                                        >
                                            {DAYS.map((d) => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                        <input
                                            className="cm-title-input"
                                            type="time"
                                            value={s.startTime}
                                            onChange={(e) => updateSession(s.id, {startTime: e.target.value})}
                                        />
                                        <input
                                            className="cm-title-input"
                                            type="time"
                                            value={s.endTime}
                                            onChange={(e) => updateSession(s.id, {endTime: e.target.value})}
                                        />
                                        <select
                                            className="cm-title-input"
                                            value={s.campus}
                                            onChange={(e) => updateSession(s.id, {campus: e.target.value})}
                                        >
                                            {CAMPUSES.map((c) => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                        <input
                                            className="cm-title-input"
                                            type="text"
                                            placeholder="e.g. Gym, Room C1.05"
                                            value={s.location}
                                            onChange={(e) => updateSession(s.id, {location: e.target.value})}
                                        />
                                        <button
                                            type="button"
                                            className="soc-remove"
                                            onClick={() => removeSession(s.id)}
                                            aria-label="Remove session"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button type="button" className="cm-add-row" onClick={addSession}>
                            + Add session
                        </button>
                        <span className="cm-hint">
                            Add one row per weekly session so students know when and where to turn up.
                        </span>
                    </div>
                </div>
            </div>

            <div className="cm-footer">
                <button className="cm-action cm-action--cancel" onClick={resetFields} disabled={saving}>
                    Cancel
                </button>
                <button className="cm-action cm-action--submit" onClick={saveSociety} disabled={saving}>
                    {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Society'}
                </button>
            </div>

            <div className="cm-existing">
                <div className="cm-existing__header-row">
                    <h2 className="cm-existing__heading">Existing Societies</h2>
                    <button className="cm-refresh-btn" onClick={fetchSocieties}>
                        Refresh
                    </button>
                </div>
                {societies.length === 0 ? (
                    <p className="cm-empty-state">No societies yet — add the first one above.</p>
                ) : (
                    <>
                        <table className="rh-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Committee</th>
                                    <th>Sessions</th>
                                    <th>Links</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {societiesPag.pageItems.map((s) => {
                                    const members = parseCommittee(s.committee, s.committeeMembers);
                                    const sessions = parseTimetable(s.timetable);
                                    return (
                                        <tr
                                            key={s.id}
                                            className={editingId === s.id ? 'rh-row--editing' : ''}
                                        >
                                            <td className="rh-cell--title">{s.name}</td>
                                            <td>
                                                {members.length === 0
                                                    ? '—'
                                                    : members
                                                        .slice(0, 2)
                                                        .map((m) => `${m.role}: ${m.name}`)
                                                        .join(' · ') +
                                                      (members.length > 2 ? ` +${members.length - 2}` : '')}
                                            </td>
                                            <td>
                                                {sessions.length === 0
                                                    ? '—'
                                                    : sessionLabel(sessions[0]) +
                                                      (sessions.length > 1 ? ` +${sessions.length - 1}` : '')}
                                            </td>
                                            <td>{linkCount(s) > 0 ? `${linkCount(s)} link(s)` : '—'}</td>
                                            <td>
                                                <div className="rh-actions">
                                                    <button
                                                        className="cm-existing__edit"
                                                        onClick={() => startEdit(s)}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="cm-existing__delete"
                                                        onClick={() => deleteSociety(s.id)}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <Pagination
                            page={societiesPag.page}
                            pageCount={societiesPag.pageCount}
                            rowsPerPage={societiesPag.rowsPerPage}
                            total={societiesPag.total}
                            start={societiesPag.start}
                            pageSize={societiesPag.pageItems.length}
                            onPageChange={societiesPag.setPage}
                            onRowsPerPageChange={societiesPag.changeRowsPerPage}
                        />
                    </>
                )}
            </div>
        </section>
    );
}
