import React from 'react';
import {getCurrentUser} from 'aws-amplify/auth';
import {client} from '../client';
import type {Schema} from '../../amplify/data/resource';
import ThumbnailUploader from '../components/ThumbnailUploader/ThumbnailUploader';
import Pagination from '../components/Pagination/Pagination';
import {usePagination} from '../components/Pagination/usePagination';
import {friendlyError} from '../utils/errors';
import {logAudit} from '../utils/audit';
import './ContentManagerPage.css';

type SocietyRecord = Schema['Society']['type'];

export default function SocietiesPage() {
    const [name, setName] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [committeeMembers, setCommitteeMembers] = React.useState('');
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
        setCommitteeMembers('');
        setWebsite('');
        setInstagram('');
        setWhatsapp('');
        setLogoKey(null);
        setEditingId(null);
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
        setSaving(true);
        try {
            const payload = {
                name: name.trim(),
                description,
                committeeMembers,
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
            logAudit('Societies', editingId ? 'updated' : 'created', name.trim());
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
        setCommitteeMembers(society.committeeMembers ?? '');
        setWebsite(society.website ?? '');
        setInstagram(society.instagram ?? '');
        setWhatsapp(society.whatsapp ?? '');
        setLogoKey(society.logoKey ?? null);
        setEditingId(society.id);
        window.scrollTo({top: 0, behavior: 'smooth'});
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
                        <label className="cm-section-label" htmlFor="society-committee">
                            Committee Members
                        </label>
                        <textarea
                            id="society-committee"
                            className="cm-title-input"
                            rows={3}
                            placeholder="Names and roles, one per line…"
                            value={committeeMembers}
                            onChange={(e) => setCommitteeMembers(e.target.value)}
                        />
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
                                    <th>Description</th>
                                    <th>Committee</th>
                                    <th>Links</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {societiesPag.pageItems.map((s) => (
                                    <tr
                                        key={s.id}
                                        className={editingId === s.id ? 'rh-row--editing' : ''}
                                    >
                                        <td className="rh-cell--title">{s.name}</td>
                                        <td>{s.description ? s.description.slice(0, 60) : '—'}</td>
                                        <td>
                                            {s.committeeMembers
                                                ? `${s.committeeMembers.split('\n').filter(Boolean).length} listed`
                                                : '—'}
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
                                ))}
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
