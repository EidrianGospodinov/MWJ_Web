import React from 'react';
import {getCurrentUser} from 'aws-amplify/auth';
import {client} from '../client';
import type {Schema} from '../../amplify/data/resource';
import type {Block} from '../types/Blocks';
import BlockItem from '../components/BlockItem/BlockItem';
import BlockPreview from '../components/BlockPreview/BlockPreview';
import ThumbnailUploader from '../components/ThumbnailUploader/ThumbnailUploader';
import MediaPicker from '../components/MediaPicker/MediaPicker';
import Pagination from '../components/Pagination/Pagination';
import {usePagination} from '../components/Pagination/usePagination';
import {friendlyError} from '../utils/errors';
import {logAudit} from '../utils/audit';
import {
    CONTENT_TYPES,
    CONTENT_TYPE_HINTS,
    NEWS_CATEGORIES,
    normaliseContentType,
    type ContentType,
} from '../utils/contentTypes';
import './ContentManagerPage.css';

type BlockType = Block['type'];

const BLOCK_BUTTONS: { type: BlockType; label: string }[] = [
    {type: 'text', label: 'Text'},
    {type: 'questionnaire', label: 'Questionnaire'},
    {type: 'image', label: 'Upload Image'},
    {type: 'video', label: 'Upload Video'},
];

function makeBlock(type: BlockType): Block {
    const id = crypto.randomUUID();
    switch (type) {
        case 'text':
            return {id, type, content: {text: ''}};
        case 'questionnaire':
            return {id, type, content: {questions: []}};
        case 'image':
            return {id, type, content: {}};
        case 'video':
            return {id, type, content: {}};
    }
}

export default function ContentManagerPage() {
    const debugShowJson = false;

    const [title, setTitle] = React.useState('');
    const [contentType, setContentType] = React.useState<ContentType>('Module');
    const [typeFilter, setTypeFilter] = React.useState<ContentType | 'All'>('All');
    const [thumbnailKey, setThumbnailKey] = React.useState<string | null>(null);
    const [isRecommended, setIsRecommended] = React.useState(false);
    const [description, setDescription] = React.useState('');
    const [mediaKey, setMediaKey] = React.useState<string | null>(null);
    const [mediaType, setMediaType] = React.useState<'image' | 'video' | null>(null);
    const [category, setCategory] = React.useState(NEWS_CATEGORIES[0]);
    const [ctaLabel, setCtaLabel] = React.useState('');
    const [ctaUrl, setCtaUrl] = React.useState('');
    const [hashtags, setHashtags] = React.useState('');
    const [isPinned, setIsPinned] = React.useState(false);
    const [blocks, setBlocks] = React.useState<Block[]>([]);
    const [activeId, setActiveId] = React.useState<string | null>(null);
    const [dragIdx, setDragIdx] = React.useState<number | null>(null);
    const [dropIdx, setDropIdx] = React.useState<number | null>(null);
    const [showList, setShowList] = React.useState(false);
    const [savedContent, setSavedContent] = React.useState<Schema['ContentManagement']['type'][]>([]);
    const [editingId, setEditingId] = React.useState<string | null>(null);

    const activeBlock = blocks.find((b) => b.id === activeId) ?? null;

    // ── Block CRUD ────────────────────────────────────────────
    const addBlock = (type: BlockType) => {
        const b = makeBlock(type);
        setBlocks((prev) => [...prev, b]);
        setActiveId(b.id);
    };

    const deleteBlock = (id: string) => {
        setBlocks((prev) => prev.filter((b) => b.id !== id));
        if (activeId === id) setActiveId(null);
    };

    // ── Drag & drop ───────────────────────────────────────────
    const onDragStart = (i: number) => setDragIdx(i);

    const onDragOver = (e: React.DragEvent<HTMLDivElement>, i: number) => {
        e.preventDefault();
        setDropIdx(i);
    };

    const onDrop = (e: React.DragEvent<HTMLDivElement>, i: number) => {
        e.preventDefault();
        if (dragIdx === null || dragIdx === i) return;
        const next = [...blocks];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(i, 0, moved);
        setBlocks(next);
        setDragIdx(null);
        setDropIdx(null);
    };

    const onDragEnd = () => {
        setDragIdx(null);
        setDropIdx(null);
    };

    // ── Persistence ───────────────────────────────────────────
    const saveData = async () => {
        if (!title.trim()) {
            alert('Please enter a title before saving.');
            return;
        }
        const isModule = contentType === 'Module';
        if (!isModule && !description.trim()) {
            alert('Please enter a description before saving.');
            return;
        }
        if (contentType === 'News' && ctaUrl.trim() && !/^https?:\/\//i.test(ctaUrl.trim())) {
            alert('The call to action link must start with http:// or https://');
            return;
        }
        const typePayload = {
            contentType,
            blocks: isModule ? JSON.stringify(blocks) : '[]',
            thumbnailKey: isModule ? thumbnailKey : null,
            isRecommended: isModule ? isRecommended : false,
            description: isModule ? null : description.trim(),
            mediaKey: isModule ? null : mediaKey,
            mediaType: isModule ? null : mediaType,
            category: contentType === 'News' ? category : null,
            ctaLabel: contentType === 'News' ? ctaLabel.trim() : null,
            ctaUrl: contentType === 'News' ? ctaUrl.trim() : null,
            hashtags: contentType === 'Social' ? hashtags.trim() : null,
            isPinned: contentType === 'Social' ? isPinned : false,
        };
        try {
            if (editingId) {
                const result = await client.models.ContentManagement.update({
                    id: editingId,
                    title,
                    ...typePayload,
                });
                console.log('updated', result);
                logAudit('Content', 'updated', title, contentType);
            } else {
                const createdBy = await getCurrentUser()
                    .then((u) => u.signInDetails?.loginId ?? u.username)
                    .catch(() => undefined);
                const result = await client.models.ContentManagement.create({
                    title,
                    visibility: 'Public',
                    createdBy,
                    ...typePayload,
                });
                console.log('saved', result);
                logAudit('Content', 'created', title, contentType);
            }
            resetContentManagerFields();
            await fetchContent();
        } catch (err) {
            console.error('Save failed', err);
            alert(friendlyError(err, 'Saving the module failed. Please try again.'));
        }
    };
    const duplicateContent = async (
        item: Schema['ContentManagement']['type']
    ) => {
        try {
            // Find all items that are based on this title
            const baseTitle = item.title.replace(/\s\(\d+\)$/, '');

            const matchingItems = savedContent.filter((content) =>
                content.title.startsWith(baseTitle)
            );

            let nextNumber = 1;

            matchingItems.forEach((content) => {
                const match = content.title.match(/\((\d+)\)$/);

                if (match) {
                    const num = Number(match[1]);
                    if (num >= nextNumber) {
                        nextNumber = num + 1;
                    }
                }
            });

            const duplicatedTitle = `${baseTitle} (${nextNumber})`;

            const createdBy = await getCurrentUser()
                .then((u) => u.signInDetails?.loginId ?? u.username)
                .catch(() => undefined);

            await client.models.ContentManagement.create({
                title: duplicatedTitle,
                blocks: item.blocks,
                contentType: normaliseContentType(item.contentType),
                visibility: item.visibility,
                thumbnailKey: item.thumbnailKey,
                createdBy,
                isRecommended: item.isRecommended,
            });

            logAudit('Content', 'duplicated', duplicatedTitle, `from "${item.title}"`);
            await fetchContent();
        } catch (err) {
            console.error('Duplicate failed', err);
            alert(friendlyError(err, 'Duplicating the module failed. Please try again.'));
        }
    };

    function resetTypeFields(): void {
        setDescription('');
        setMediaKey(null);
        setMediaType(null);
        setCategory(NEWS_CATEGORIES[0]);
        setCtaLabel('');
        setCtaUrl('');
        setHashtags('');
        setIsPinned(false);
    }

    function resetContentManagerFields(): void {
        setTitle('');
        setContentType('Module');
        setThumbnailKey(null);
        setIsRecommended(false);
        setBlocks([]);
        setActiveId(null);
        setEditingId(null);
        resetTypeFields();
    }

    const startEdit = (item: Schema['ContentManagement']['type']) => {
        setTitle(item.title);
        setContentType(normaliseContentType(item.contentType));
        setThumbnailKey(item.thumbnailKey ?? null);
        setIsRecommended(item.isRecommended ?? false);
        setBlocks(JSON.parse(String(item.blocks ?? '[]')));
        setDescription(item.description ?? '');
        setMediaKey(item.mediaKey ?? null);
        setMediaType(item.mediaType === 'video' ? 'video' : item.mediaKey ? 'image' : null);
        setCategory(item.category ?? NEWS_CATEGORIES[0]);
        setCtaLabel(item.ctaLabel ?? '');
        setCtaUrl(item.ctaUrl ?? '');
        setHashtags(item.hashtags ?? '');
        setIsPinned(item.isPinned ?? false);
        setEditingId(item.id);
        setActiveId(null);
        document.querySelector('.content-area')?.scrollTo({top: 0, behavior: 'smooth'});
    };

    const fetchContent = async () => {
        const {data} = await client.models.ContentManagement.list();
        setSavedContent(data);
    };

    const deleteContent = async (id: string) => {
        const item = savedContent.find((c) => c.id === id);
        await client.models.ContentManagement.delete({id});
        logAudit('Content', 'deleted', item?.title ?? id);
        await fetchContent();
    };

    const updateVisibility = async (id: string, visibility: string) => {
        const item = savedContent.find((c) => c.id === id);
        await client.models.ContentManagement.update({id, visibility});
        logAudit('Content', 'visibility changed', item?.title ?? id, `→ ${visibility}`);
        await fetchContent();
    };

    const sortedContent = React.useMemo(
        () =>
            [...savedContent]
                .filter((c) => typeFilter === 'All' || normaliseContentType(c.contentType) === typeFilter)
                .sort((a, b) => {
                    const ao = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
                    const bo = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
                    if (ao !== bo) return ao - bo;
                    return String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? ''));
                }),
        [savedContent, typeFilter]
    );

    const moveModule = async (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= sortedContent.length) return;
        const current = sortedContent[index];
        const neighbour = sortedContent[target];
        const currentOrder = current.displayOrder ?? index;
        const neighbourOrder = neighbour.displayOrder ?? target;
        try {
            await Promise.all([
                client.models.ContentManagement.update({id: current.id, displayOrder: neighbourOrder}),
                client.models.ContentManagement.update({id: neighbour.id, displayOrder: currentOrder}),
            ]);
            logAudit('Content', 'reordered', current.title, direction === -1 ? 'moved up' : 'moved down');
            await fetchContent();
        } catch (err) {
            console.error('Reorder failed', err);
            alert(friendlyError(err, 'Reordering the modules failed. Please try again.'));
        }
    };

    const contentPag = usePagination(sortedContent);

    React.useEffect(() => {
        fetchContent();
    }, []);

    const handleCancel = () => {
        setShowList(false);
        resetContentManagerFields();
    };

    return (
        <section className="content-area cm-page">
            <h1 className="cm-heading">Content Manager</h1>

            <div className="cm-body">

                <aside className="cm-left">
                    <div className="cm-card cm-card--compact">
                        <span className="cm-section-label">Content Type</span>
                        <div className="cm-segment" role="group" aria-label="Content type">
                            {CONTENT_TYPES.map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    className={`cm-segment__btn${contentType === option ? ' cm-segment__btn--active' : ''}`}
                                    onClick={() => { setContentType(option); if (!editingId) resetTypeFields(); }}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                        <span className="cm-hint">{CONTENT_TYPE_HINTS[contentType]}</span>
                    </div>

                    <div className="cm-card">
                        <label className="cm-section-label" htmlFor="module-title">
                            {contentType === 'Module' ? 'Module Title' : contentType === 'News' ? 'Headline' : 'Post Title'}
                        </label>
                        <input
                            id="module-title"
                            className="cm-title-input"
                            type="text"
                            placeholder={
                                contentType === 'Module'
                                    ? 'Enter module title…'
                                    : contentType === 'News'
                                    ? 'Enter headline…'
                                    : 'Enter a short post title…'
                            }
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                        {contentType === 'Module' && (
                            <label className="cm-toggle cm-toggle--sm">
                                <span className="cm-toggle__text">Recommend on homepage</span>
                                <input
                                    type="checkbox"
                                    className="cm-toggle__input"
                                    checked={isRecommended}
                                    onChange={(e) => setIsRecommended(e.target.checked)}
                                />
                                <span className="cm-toggle__track">
                                    <span className="cm-toggle__thumb"/>
                                </span>
                            </label>
                        )}
                    </div>

                    {contentType === 'Module' && (
                        <>
                            <div className="cm-card">
                                <span className="cm-section-label">Module Thumbnail</span>
                                <ThumbnailUploader thumbnailKey={thumbnailKey} onChange={setThumbnailKey}/>
                            </div>

                            <div className="cm-card">
                                <span className="cm-section-label">Add Content Block</span>
                                <div className="cm-add-stack">
                                    {BLOCK_BUTTONS.map(({type, label}) => (
                                        <button
                                            key={type}
                                            className={`cm-add-btn cm-add-btn--${type}`}
                                            onClick={() => addBlock(type)}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {contentType === 'News' && (
                        <div className="cm-card">
                            <label className="cm-section-label" htmlFor="news-category">
                                News Category
                            </label>
                            <select
                                id="news-category"
                                className="cm-title-input"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                            >
                                {NEWS_CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            <span className="cm-hint">
                                Shown as a tag on the news card and article header.
                            </span>
                        </div>
                    )}

                    {contentType === 'Social' && (
                        <div className="cm-card">
                            <span className="cm-section-label">Feed Placement</span>
                            <label className="cm-toggle cm-toggle--sm">
                                <span className="cm-toggle__text">Pin to top of feed</span>
                                <input
                                    type="checkbox"
                                    className="cm-toggle__input"
                                    checked={isPinned}
                                    onChange={(e) => setIsPinned(e.target.checked)}
                                />
                                <span className="cm-toggle__track">
                                    <span className="cm-toggle__thumb"/>
                                </span>
                            </label>
                            <span className="cm-hint">
                                Pinned posts appear first on the app home feed, above newer posts.
                            </span>
                        </div>
                    )}
                </aside>

                {/* ── Right Column ────────────────────────── */}
                <div className="cm-right">

                    {contentType !== 'Module' && (
                        <>
                            <div className="cm-card">
                                <label className="cm-section-label" htmlFor="ct-description">
                                    Description
                                </label>
                                <textarea
                                    id="ct-description"
                                    className="cm-title-input"
                                    rows={contentType === 'News' ? 6 : 4}
                                    placeholder={
                                        contentType === 'News'
                                            ? 'Write the article…'
                                            : 'Write the post caption…'
                                    }
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>

                            <div className="cm-card">
                                <span className="cm-section-label">Photo or Video</span>
                                <MediaPicker
                                    mediaKey={mediaKey}
                                    mediaType={mediaType}
                                    onChange={(key, type) => { setMediaKey(key); setMediaType(type); }}
                                />
                            </div>
                        </>
                    )}

                    {contentType === 'News' && (
                        <div className="cm-card">
                            <span className="cm-section-label">Call to Action</span>
                            <label className="cm-section-label" htmlFor="news-cta-label">
                                Button text
                            </label>
                            <input
                                id="news-cta-label"
                                className="cm-title-input"
                                type="text"
                                placeholder="e.g. Register now"
                                value={ctaLabel}
                                onChange={(e) => setCtaLabel(e.target.value)}
                            />
                            <label className="cm-section-label" htmlFor="news-cta-url">
                                Link
                            </label>
                            <input
                                id="news-cta-url"
                                className="cm-title-input"
                                type="url"
                                placeholder="https://…"
                                value={ctaUrl}
                                onChange={(e) => setCtaUrl(e.target.value)}
                            />
                            <span className="cm-hint">
                                Optional. Shown as a button at the bottom of the article.
                            </span>
                        </div>
                    )}

                    {contentType === 'Social' && (
                        <div className="cm-card">
                            <label className="cm-section-label" htmlFor="social-hashtags">
                                Hashtags
                            </label>
                            <input
                                id="social-hashtags"
                                className="cm-title-input"
                                type="text"
                                placeholder="#WestminsterLife #FreshersWeek"
                                value={hashtags}
                                onChange={(e) => setHashtags(e.target.value)}
                            />
                            <span className="cm-hint">
                                Separate with spaces. Shown under the caption in the app feed.
                            </span>
                        </div>
                    )}

                    {contentType === 'Module' && (
                    <div className="cm-card">
                        <span className="cm-section-label">Block Editor</span>
                        {blocks.length === 0 ? (
                            <p className="cm-empty-state">
                                No blocks yet — use the left panel to add one.
                            </p>
                        ) : (
                            <div className="cm-block-list">
                                {blocks.map((block, index) => (
                                    <BlockItem
                                        key={block.id}
                                        block={block}
                                        index={index}
                                        isActive={activeId === block.id}
                                        isDragging={dragIdx === index}
                                        isDragOver={dropIdx === index && dragIdx !== index}
                                        onClick={() => setActiveId(block.id)}
                                        onDelete={() => deleteBlock(block.id)}
                                        onDragStart={onDragStart}
                                        onDragOver={onDragOver}
                                        onDrop={onDrop}
                                        onDragEnd={onDragEnd}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                    )}

                    {contentType === 'Module' && (
                        <div className="cm-card">
                            <span className="cm-section-label">Block Preview</span>
                            <BlockPreview block={activeBlock} setBlocks={setBlocks}/>
                        </div>
                    )}

                    {contentType === 'Module' && (
                        <button
                            className="cm-list-toggle"
                            onClick={() => setShowList((v) => !v)}
                        >
                            {showList ? 'Hide block list' : 'List all blocks'}
                        </button>
                    )}

                    {contentType === 'Module' && showList && (
                        <div className="cm-card cm-block-directory">
                            <span className="cm-section-label">All Blocks</span>
                            {blocks.length === 0 ? (
                                <p className="cm-empty-state">No blocks added yet.</p>
                            ) : (
                                <ol className="cm-directory-list">
                                    {blocks.map((b, i) => (
                                        <li key={b.id} className="cm-directory-item">
                                            <span className="cm-directory-index">#{i + 1}</span>
                                            {b.type.charAt(0).toUpperCase() + b.type.slice(1)} Block
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Bottom Actions ───────────────────────────── */}
            <div className="cm-footer">
                <button className="cm-action cm-action--cancel" onClick={handleCancel}>
                    Cancel
                </button>
                <button className="cm-action cm-action--add" onClick={saveData}>
                    Add
                </button>
                <button className="cm-action cm-action--submit" onClick={saveData}>
                    {editingId ? 'Save Changes' : 'Preview & Submit'}
                </button>
            </div>
            {/* Show list of blocks as json for Debug*/}
            {debugShowJson && (<pre style={{
                backgroundColor: '#fdf1de',
                fontSize: '0.85rem',
            }}>
                {JSON.stringify(blocks, null, 2)}
            </pre>)}

            <div className="cm-existing">
                <div className="cm-existing__header-row">
                    <h2 className="cm-existing__heading">Existing Content</h2>
                    <div className="cm-segment cm-segment--filter" role="group" aria-label="Filter by type">
                        {(['All', ...CONTENT_TYPES] as (ContentType | 'All')[]).map((option) => (
                            <button
                                key={option}
                                type="button"
                                className={`cm-segment__btn${typeFilter === option ? ' cm-segment__btn--active' : ''}`}
                                onClick={() => setTypeFilter(option)}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
                {sortedContent.length === 0 ? (
                    <p className="cm-empty-state">
                        {savedContent.length === 0
                            ? 'No saved content yet.'
                            : `No ${typeFilter} content yet.`}
                    </p>
                ) : (
                    <>
                        <table className="rh-table">
                            <thead>
                                <tr>
                                    <th>Order</th>
                                    <th>Title</th>
                                    <th>Type</th>
                                    <th>Created</th>
                                    <th>Author</th>
                                    <th>Visibility</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {contentPag.pageItems.map((item, localIdx) => {
                                    const index = contentPag.start + localIdx;
                                    return (
                                        <tr
                                            key={item.id}
                                            className={editingId === item.id ? 'rh-row--editing' : ''}
                                        >
                                            <td>
                                                <div className="cm-existing__order">
                                                    <button
                                                        className="cm-existing__move"
                                                        onClick={() => moveModule(index, -1)}
                                                        disabled={index === 0}
                                                        aria-label="Move up"
                                                    >
                                                        ▲
                                                    </button>
                                                    <button
                                                        className="cm-existing__move"
                                                        onClick={() => moveModule(index, 1)}
                                                        disabled={index === sortedContent.length - 1}
                                                        aria-label="Move down"
                                                    >
                                                        ▼
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="rh-cell--title">{item.title}</td>
                                            <td>{normaliseContentType(item.contentType)}</td>
                                            <td>
                                                {item.createdAt
                                                    ? new Date(item.createdAt).toLocaleString(undefined, {
                                                        dateStyle: 'medium',
                                                        timeStyle: 'short'
                                                    })
                                                    : '—'}
                                            </td>
                                            <td>{item.createdBy ?? 'N/A'}</td>
                                            <td>
                                                <select
                                                    className={`cm-vis-select cm-vis-select--${(item.visibility ?? 'Public').toLowerCase()}`}
                                                    value={item.visibility ?? 'Public'}
                                                    onChange={(e) => updateVisibility(item.id, e.target.value)}
                                                >
                                                    <option value="Public">Public</option>
                                                    <option value="Private">Private</option>
                                                </select>
                                            </td>
                                            <td>
                                                <div className="rh-actions">
                                                    <button
                                                        className="cm-existing__edit"
                                                        onClick={() => startEdit(item)}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="cm-existing__duplicate"
                                                        onClick={() => duplicateContent(item)}
                                                    >
                                                        Duplicate
                                                    </button>
                                                    <button
                                                        className="cm-existing__delete"
                                                        onClick={() => deleteContent(item.id)}
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
                            page={contentPag.page}
                            pageCount={contentPag.pageCount}
                            rowsPerPage={contentPag.rowsPerPage}
                            total={contentPag.total}
                            start={contentPag.start}
                            pageSize={contentPag.pageItems.length}
                            onPageChange={contentPag.setPage}
                            onRowsPerPageChange={contentPag.changeRowsPerPage}
                        />
                    </>
                )}
            </div>
        </section>
    );
}
