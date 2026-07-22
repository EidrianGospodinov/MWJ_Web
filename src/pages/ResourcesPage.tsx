import React from 'react';
import {getCurrentUser} from 'aws-amplify/auth';
import {client} from '../client';
import type {Schema} from '../../amplify/data/resource';
import Pagination from '../components/Pagination/Pagination';
import {usePagination} from '../components/Pagination/usePagination';
import {friendlyError} from '../utils/errors';
import './ContentManagerPage.css';

type ResourceRecord = Schema['Resource']['type'];

const CATEGORIES = [
    'Study',
    'Admin',
    'Support',
    'IT',
    'Campus',
    'Other',
];

export default function ResourcesPage() {
    const [title, setTitle] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [url, setUrl] = React.useState('');
    const [category, setCategory] = React.useState(CATEGORIES[0]);
    const [resources, setResources] = React.useState<ResourceRecord[]>([]);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [loadError, setLoadError] = React.useState<string | null>(null);
    const [saving, setSaving] = React.useState(false);

    const sorted = React.useMemo(
        () =>
            [...resources].sort((a, b) => {
                const ao = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
                const bo = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
                if (ao !== bo) return ao - bo;
                return a.title.localeCompare(b.title);
            }),
        [resources]
    );

    const resourcesPag = usePagination(sorted);

    const fetchResources = async () => {
        if (!client.models.Resource) return;
        try {
            const {data, errors} = await client.models.Resource.list();
            if (errors?.length) throw new Error(errors[0].message);
            setResources(data);
            setLoadError(null);
        } catch (err) {
            setLoadError(friendlyError(err, 'Could not load the resources. Try refreshing.'));
        }
    };

    React.useEffect(() => {
        fetchResources();
    }, []);

    const resetFields = () => {
        setTitle('');
        setDescription('');
        setUrl('');
        setCategory(CATEGORIES[0]);
        setEditingId(null);
    };

    const saveResource = async () => {
        if (!title.trim()) {
            alert('Please enter a resource name before saving.');
            return;
        }
        if (!url.trim()) {
            alert('Please enter the link students should be sent to.');
            return;
        }
        if (!/^https?:\/\//i.test(url.trim())) {
            alert('The link must start with http:// or https://');
            return;
        }
        if (!client.models.Resource) {
            alert('The Resource model is not deployed yet.');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                title: title.trim(),
                description,
                url: url.trim(),
                category,
            };
            if (editingId) {
                const {errors} = await client.models.Resource.update({id: editingId, ...payload});
                if (errors?.length) throw new Error(errors[0].message);
            } else {
                const createdBy = await getCurrentUser()
                    .then((u) => u.signInDetails?.loginId ?? u.username)
                    .catch(() => undefined);
                const {errors} = await client.models.Resource.create({
                    ...payload,
                    createdBy,
                    displayOrder: resources.length,
                });
                if (errors?.length) throw new Error(errors[0].message);
            }
            resetFields();
            await fetchResources();
        } catch (err) {
            console.error('Save failed', err);
            alert(friendlyError(err, 'Saving the resource failed. Please try again.'));
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (resource: ResourceRecord) => {
        setTitle(resource.title);
        setDescription(resource.description ?? '');
        setUrl(resource.url);
        setCategory(resource.category ?? CATEGORIES[0]);
        setEditingId(resource.id);
        window.scrollTo({top: 0, behavior: 'smooth'});
    };

    const deleteResource = async (id: string) => {
        if (!client.models.Resource) return;
        try {
            const {errors} = await client.models.Resource.delete({id});
            if (errors?.length) throw new Error(errors[0].message);
            if (editingId === id) resetFields();
            await fetchResources();
        } catch (err) {
            alert(friendlyError(err, 'Deleting the resource failed. Please try again.'));
        }
    };

    const moveResource = async (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= sorted.length) return;
        const current = sorted[index];
        const neighbour = sorted[target];
        try {
            await Promise.all([
                client.models.Resource.update({id: current.id, displayOrder: neighbour.displayOrder ?? target}),
                client.models.Resource.update({id: neighbour.id, displayOrder: current.displayOrder ?? index}),
            ]);
            await fetchResources();
        } catch (err) {
            alert(friendlyError(err, 'Reordering the resources failed. Please try again.'));
        }
    };

    return (
        <section className="content-area cm-page">
            <h1 className="cm-heading">Resources</h1>
            <span className="cm-hint">
                Quick links students use to get things done — these appear in the app's Explore tab.
            </span>

            {loadError && (
                <div className="cm-load-error">
                    {loadError}
                    <button
                        className="cm-load-error__retry"
                        onClick={() => { setLoadError(null); fetchResources(); }}
                    >
                        Retry
                    </button>
                </div>
            )}

            <div className="cm-body">

                <aside className="cm-left">
                    <div className="cm-card">
                        <label className="cm-section-label" htmlFor="resource-title">
                            Resource Name
                        </label>
                        <input
                            id="resource-title"
                            className="cm-title-input"
                            type="text"
                            placeholder="e.g. Blackboard"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="cm-card">
                        <label className="cm-section-label" htmlFor="resource-category">
                            Category
                        </label>
                        <select
                            id="resource-category"
                            className="cm-title-input"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            {CATEGORIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                </aside>

                <div className="cm-right">

                    <div className="cm-card">
                        <label className="cm-section-label" htmlFor="resource-url">
                            Link
                        </label>
                        <input
                            id="resource-url"
                            className="cm-title-input"
                            type="url"
                            placeholder="https://learning.westminster.ac.uk/"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                        />
                        <span className="cm-hint">
                            Students tap the resource in the app and this link opens in their browser.
                        </span>
                    </div>

                    <div className="cm-card">
                        <label className="cm-section-label" htmlFor="resource-description">
                            Description
                        </label>
                        <textarea
                            id="resource-description"
                            className="cm-title-input"
                            rows={3}
                            placeholder="What can students do here? e.g. Access your modules and submit coursework"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="cm-footer">
                <button className="cm-action cm-action--cancel" onClick={resetFields} disabled={saving}>
                    Cancel
                </button>
                <button className="cm-action cm-action--submit" onClick={saveResource} disabled={saving}>
                    {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Resource'}
                </button>
            </div>

            <div className="cm-existing">
                <div className="cm-existing__header-row">
                    <h2 className="cm-existing__heading">Existing Resources</h2>
                    <button className="cm-refresh-btn" onClick={fetchResources}>
                        Refresh
                    </button>
                </div>
                {resources.length === 0 ? (
                    <p className="cm-empty-state">No resources yet — add the first one above.</p>
                ) : (
                    <>
                        <table className="rh-table">
                            <thead>
                                <tr>
                                    <th>Order</th>
                                    <th>Name</th>
                                    <th>Category</th>
                                    <th>Description</th>
                                    <th>Link</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {resourcesPag.pageItems.map((r, localIdx) => {
                                    const index = resourcesPag.start + localIdx;
                                    return (
                                        <tr
                                            key={r.id}
                                            className={editingId === r.id ? 'rh-row--editing' : ''}
                                        >
                                            <td>
                                                <div className="cm-existing__order">
                                                    <button
                                                        className="cm-existing__move"
                                                        onClick={() => moveResource(index, -1)}
                                                        disabled={index === 0}
                                                        aria-label="Move up"
                                                    >
                                                        ▲
                                                    </button>
                                                    <button
                                                        className="cm-existing__move"
                                                        onClick={() => moveResource(index, 1)}
                                                        disabled={index === sorted.length - 1}
                                                        aria-label="Move down"
                                                    >
                                                        ▼
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="rh-cell--title">{r.title}</td>
                                            <td>{r.category ?? '—'}</td>
                                            <td>{r.description ? r.description.slice(0, 60) : '—'}</td>
                                            <td>
                                                <a href={r.url} target="_blank" rel="noreferrer">
                                                    Open
                                                </a>
                                            </td>
                                            <td>
                                                <div className="rh-actions">
                                                    <button
                                                        className="cm-existing__edit"
                                                        onClick={() => startEdit(r)}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="cm-existing__delete"
                                                        onClick={() => deleteResource(r.id)}
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
                            page={resourcesPag.page}
                            pageCount={resourcesPag.pageCount}
                            rowsPerPage={resourcesPag.rowsPerPage}
                            total={resourcesPag.total}
                            start={resourcesPag.start}
                            pageSize={resourcesPag.pageItems.length}
                            onPageChange={resourcesPag.setPage}
                            onRowsPerPageChange={resourcesPag.changeRowsPerPage}
                        />
                    </>
                )}
            </div>
        </section>
    );
}
