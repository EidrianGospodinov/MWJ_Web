import React from 'react';
import ThumbnailUploader from '../components/ThumbnailUploader/ThumbnailUploader';
import Pagination from '../components/Pagination/Pagination';
import {usePagination} from '../components/Pagination/usePagination';
import './ContentManagerPage.css';

type Society = {
    id: string;
    name: string;
    description: string;
    committeeMembers: string;
    website: string;
    instagram: string;
    whatsapp: string;
    logoKey: string | null;
};

export default function SocietiesPage() {
    const [name, setName] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [committeeMembers, setCommitteeMembers] = React.useState('');
    const [website, setWebsite] = React.useState('');
    const [instagram, setInstagram] = React.useState('');
    const [whatsapp, setWhatsapp] = React.useState('');
    const [logoKey, setLogoKey] = React.useState<string | null>(null);
    const [societies, setSocieties] = React.useState<Society[]>([]);
    const [editingId, setEditingId] = React.useState<string | null>(null);

    const societiesPag = usePagination(societies);

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

    const saveSociety = () => {
        if (!name.trim()) {
            alert('Please enter a society name before saving.');
            return;
        }
        const entry: Society = {
            id: editingId ?? crypto.randomUUID(),
            name: name.trim(),
            description,
            committeeMembers,
            website,
            instagram,
            whatsapp,
            logoKey,
        };
        setSocieties((prev) =>
            editingId ? prev.map((s) => (s.id === editingId ? entry : s)) : [...prev, entry]
        );
        resetFields();
    };

    const startEdit = (society: Society) => {
        setName(society.name);
        setDescription(society.description);
        setCommitteeMembers(society.committeeMembers);
        setWebsite(society.website);
        setInstagram(society.instagram);
        setWhatsapp(society.whatsapp);
        setLogoKey(society.logoKey);
        setEditingId(society.id);
    };

    const deleteSociety = (id: string) => {
        setSocieties((prev) => prev.filter((s) => s.id !== id));
        if (editingId === id) resetFields();
    };

    return (
        <section className="content-area cm-page">
            <h1 className="cm-heading">Societies</h1>
            <span className="cm-hint">
                Draft preview — societies are not saved to the database yet. Entries below live only on this page.
            </span>

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
                <button className="cm-action cm-action--cancel" onClick={resetFields}>
                    Cancel
                </button>
                <button className="cm-action cm-action--submit" onClick={saveSociety}>
                    {editingId ? 'Save Changes' : 'Add Society'}
                </button>
            </div>

            <div className="cm-existing">
                <h2 className="cm-existing__heading">Existing Societies</h2>
                {societies.length === 0 ? (
                    <p className="cm-empty-state">No societies yet — add the first one above.</p>
                ) : (
                    <>
                        <table className="rh-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Committee</th>
                                    <th>Website</th>
                                    <th>Instagram</th>
                                    <th>WhatsApp</th>
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
                                        <td>{s.committeeMembers || '—'}</td>
                                        <td>
                                            {s.website ? (
                                                <a href={s.website} target="_blank" rel="noreferrer">Link</a>
                                            ) : '—'}
                                        </td>
                                        <td>
                                            {s.instagram ? (
                                                <a href={s.instagram} target="_blank" rel="noreferrer">Link</a>
                                            ) : '—'}
                                        </td>
                                        <td>
                                            {s.whatsapp ? (
                                                <a href={s.whatsapp} target="_blank" rel="noreferrer">Link</a>
                                            ) : '—'}
                                        </td>
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
