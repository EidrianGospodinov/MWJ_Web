import React from 'react';
import {getCurrentUser} from 'aws-amplify/auth';
import {client} from '../client';
import type {Schema} from '../../amplify/data/resource';
import type {Block} from '../types/Blocks';
import BlockItem from '../components/BlockItem/BlockItem';
import BlockPreview from '../components/BlockPreview/BlockPreview';
import ThumbnailUploader from '../components/ThumbnailUploader/ThumbnailUploader';
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
    const [thumbnailKey, setThumbnailKey] = React.useState<string | null>(null);
    const [isRecommended, setIsRecommended] = React.useState(false);
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
            alert('Please enter a module title before saving.');
            return;
        }
        try {
            if (editingId) {
                const result = await client.models.ContentManagement.update({
                    id: editingId,
                    title,
                    blocks: JSON.stringify(blocks),
                    thumbnailKey,
                    isRecommended,
                });
                console.log('updated', result);
            } else {
                const createdBy = await getCurrentUser()
                    .then((u) => u.signInDetails?.loginId ?? u.username)
                    .catch(() => undefined);
                const result = await client.models.ContentManagement.create({
                    title,
                    blocks: JSON.stringify(blocks),
                    visibility: 'Public',
                    createdBy,
                    thumbnailKey,
                    isRecommended,
                });
                console.log('saved', result);
            }
            resetContentManagerFields();
            await fetchContent();
        } catch (err) {
            console.error('Save failed', err);
            alert('Save failed. Please try again.');
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
                visibility: item.visibility,
                thumbnailKey: item.thumbnailKey,
                createdBy,
                isRecommended: item.isRecommended,
            });

            await fetchContent();
        } catch (err) {
            console.error('Duplicate failed', err);
            alert('Failed to duplicate content.');
        }
    };

    function resetContentManagerFields(): void {
        setTitle('');
        setThumbnailKey(null);
        setIsRecommended(false);
        setBlocks([]);
        setActiveId(null);
        setEditingId(null);
    }

    const startEdit = (item: Schema['ContentManagement']['type']) => {
        setTitle(item.title);
        setThumbnailKey(item.thumbnailKey ?? null);
        setIsRecommended(item.isRecommended ?? false);
        setBlocks(JSON.parse(String(item.blocks ?? '[]')));
        setEditingId(item.id);
        setActiveId(null);
    };

    const fetchContent = async () => {
        const {data} = await client.models.ContentManagement.list();
        setSavedContent(data);
    };

    const deleteContent = async (id: string) => {
        await client.models.ContentManagement.delete({id});
        await fetchContent();
    };

    const updateVisibility = async (id: string, visibility: string) => {
        await client.models.ContentManagement.update({id, visibility});
        await fetchContent();
    };

    const sortedContent = React.useMemo(
        () =>
            [...savedContent].sort((a, b) => {
                const ao = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
                const bo = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
                if (ao !== bo) return ao - bo;
                return String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? ''));
            }),
        [savedContent]
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
            await fetchContent();
        } catch (err) {
            console.error('Reorder failed', err);
            alert('Failed to reorder modules.');
        }
    };

    React.useEffect(() => {
        fetchContent();
    }, []);

    const handleCancel = () => {
        setTitle('');
        setThumbnailKey(null);
        setIsRecommended(false);
        setBlocks([]);
        setActiveId(null);
        setShowList(false);
        setEditingId(null);
    };

    return (
        <section className="content-area cm-page">
            <h1 className="cm-heading">Content Manager</h1>

            <div className="cm-body">

                {/* ── Left Column ─────────────────────────── */}
                <aside className="cm-left">
                    <div className="cm-card">
                        <label className="cm-section-label" htmlFor="module-title">
                            Module Title
                        </label>
                        <input
                            id="module-title"
                            className="cm-title-input"
                            type="text"
                            placeholder="Enter module title…"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="cm-card">
                        <span className="cm-section-label">Module Thumbnail</span>
                        <ThumbnailUploader thumbnailKey={thumbnailKey} onChange={setThumbnailKey}/>
                    </div>

                    <div className="cm-card">
                        <label className="cm-toggle">
                            <span className="cm-section-label">Recommend on Homepage</span>
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
                </aside>

                {/* ── Right Column ────────────────────────── */}
                <div className="cm-right">

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

                    <div className="cm-card">
                        <span className="cm-section-label">Block Preview</span>
                        <BlockPreview block={activeBlock} setBlocks={setBlocks}/>
                    </div>

                    <button
                        className="cm-list-toggle"
                        onClick={() => setShowList((v) => !v)}
                    >
                        {showList ? 'Hide block list' : 'List all blocks'}
                    </button>

                    {showList && (
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
                <h2 className="cm-existing__heading">Existing Content</h2>
                {savedContent.length === 0 ? (
                    <p className="cm-empty-state">No saved content yet.</p>
                ) : (
                    <div className="cm-existing__list">
                        {sortedContent.map((item, index) => (
                            <div key={item.id}
                                 className={`cm-existing__row${editingId === item.id ? ' cm-existing__row--editing' : ''}`}>
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
                                <div className="cm-existing__info">
                                    <span className="cm-existing__title">{item.title}</span>
                                    <span className="cm-existing__meta">
                                        {item.createdAt
                                            ? new Date(item.createdAt).toLocaleString(undefined, {
                                                dateStyle: 'medium',
                                                timeStyle: 'short'
                                            })
                                            : '—'}
                                        {' · '}
                                        {item.createdBy ?? 'N/A'}
                                    </span>
                                </div>
                                <div className="cm-existing__controls">
                                    <select
                                        className={`cm-vis-select cm-vis-select--${(item.visibility ?? 'Public').toLowerCase()}`}
                                        value={item.visibility ?? 'Public'}
                                        onChange={(e) => updateVisibility(item.id, e.target.value)}
                                    >
                                        <option value="Public">Public</option>
                                        <option value="Private">Private</option>
                                    </select>
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
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
