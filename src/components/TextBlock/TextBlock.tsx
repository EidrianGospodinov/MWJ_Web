import React from "react";
import type { TextBlockType } from "../../types/Blocks";
import { parseLinks, toHref } from "../../utils/parseLinks";

type Props = {
    block: TextBlockType;
    setBlocks: React.Dispatch<React.SetStateAction<any[]>>;
};

const buttonStyle: React.CSSProperties = {
    padding: '0.4rem 0.8rem',
    fontSize: '0.9rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    background: '#f7f4fb',
    cursor: 'pointer',
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem',
    fontSize: '0.95rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxSizing: 'border-box',
};

export default function TextBlock({ block, setBlocks }: Props) {
    const textAreaRef = React.useRef<HTMLTextAreaElement>(null);
    const [linkFormOpen, setLinkFormOpen] = React.useState(false);
    const [linkLabel, setLinkLabel] = React.useState('');
    const [linkTarget, setLinkTarget] = React.useState('');
    const [linkError, setLinkError] = React.useState('');
    const [selection, setSelection] = React.useState({ start: 0, end: 0 });

    const text: string = block.content.text ?? '';

    const updateText = (newText: string) => {
        setBlocks((oldBlocks) =>
            oldBlocks.map((currentBlock) => {
                if (currentBlock.id !== block.id) {
                    return currentBlock;
                }

                return {
                    ...currentBlock,
                    content: {
                        ...currentBlock.content,
                        text: newText,
                    },
                };
            })
        );
    };

    // Opens the link form, using any highlighted words as the link text.
    const openLinkForm = () => {
        const area = textAreaRef.current;
        const start = area?.selectionStart ?? text.length;
        const end = area?.selectionEnd ?? text.length;
        setSelection({ start, end });
        setLinkLabel(text.slice(start, end));
        setLinkTarget('');
        setLinkError('');
        setLinkFormOpen(true);
    };

    const insertLink = () => {
        const label = linkLabel.trim();
        const target = linkTarget.trim();
        if (!label) {
            setLinkError('Please enter the words people will tap on.');
            return;
        }
        if (!toHref(target)) {
            setLinkError('Please enter a web address (https://...) or an email address.');
            return;
        }
        const link = `[${label.replace(/[[\]]/g, '')}](${target})`;
        updateText(text.slice(0, selection.start) + link + text.slice(selection.end));
        setLinkFormOpen(false);
    };

    const segments = parseLinks(text);
    const hasLinks = segments.some((segment) => segment.url);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
            padding: '1rem',
            border: '1px solid #ddd',
            borderRadius: '6px', 
            backgroundColor: '#fff'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button type="button" style={buttonStyle} onClick={openLinkForm}>
                    Insert link
                </button>
                <span style={{ fontSize: '0.85rem', color: '#666' }}>
                    Highlight words first to turn them into a link. Web and email addresses are clickable in the app automatically.
                </span>
            </div>

            {linkFormOpen && (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    border: '1px solid #e2d6f0',
                    borderRadius: '6px',
                    background: '#faf7fd',
                }}>
                    <label style={{ fontSize: '0.85rem' }}>
                        Link text (what people tap on)
                        <input
                            style={inputStyle}
                            value={linkLabel}
                            onChange={(e) => setLinkLabel(e.target.value)}
                            placeholder="e.g. Book an appointment"
                        />
                    </label>
                    <label style={{ fontSize: '0.85rem' }}>
                        Web address or email
                        <input
                            style={inputStyle}
                            value={linkTarget}
                            onChange={(e) => setLinkTarget(e.target.value)}
                            placeholder="https://... or name@westminster.ac.uk"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); insertLink(); } }}
                        />
                    </label>
                    {linkError && <span style={{ color: '#b42318', fontSize: '0.85rem' }}>{linkError}</span>}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" style={{ ...buttonStyle, background: '#6b3fa0', color: '#fff', borderColor: '#6b3fa0' }} onClick={insertLink}>
                            Add link
                        </button>
                        <button type="button" style={buttonStyle} onClick={() => setLinkFormOpen(false)}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <textarea
                ref={textAreaRef}
                value={text}
                onChange={(e) => updateText(e.target.value)}
                placeholder="Write text..."
                style={{
                    width: '100%',
                    minHeight: '120px', 
                    padding: '0.75rem',
                    fontSize: '1rem', 
                    fontFamily: 'inherit', 
                    lineHeight: '1.5', 
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                }}
            />

            {hasLinks && (
                <div style={{ fontSize: '0.9rem', color: '#333', lineHeight: 1.5 }}>
                    <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem' }}>
                        How it will look in the app:
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', padding: '0.6rem', background: '#f7f7f7', borderRadius: '4px' }}>
                        {segments.map((segment, index) =>
                            segment.url ? (
                                <a key={index} href={segment.url} target="_blank" rel="noreferrer" style={{ color: '#6b3fa0', fontWeight: 600 }}>
                                    {segment.text}
                                </a>
                            ) : (
                                <React.Fragment key={index}>{segment.text}</React.Fragment>
                            )
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
