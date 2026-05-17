import React from 'react';
import type { Block } from '../../types/Blocks';
import './BlockItem.css';

type Props = {
    block: Block;
    index: number;
    isActive: boolean;
    isDragging: boolean;
    isDragOver: boolean;
    onClick: () => void;
    onDelete: () => void;
    onDragStart: (i: number) => void;
    onDragOver: (e: React.DragEvent<HTMLDivElement>, i: number) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>, i: number) => void;
    onDragEnd: () => void;
};

const TYPE_LABELS: Record<Block['type'], string> = {
    text: 'Text Block',
    questionnaire: 'Questionnaire Block',
    image: 'Image Block',
    video: 'Video Block',
};

export default function BlockItem({
    block, index, isActive, isDragging, isDragOver,
    onClick, onDelete, onDragStart, onDragOver, onDrop, onDragEnd,
}: Props) {
    const classes = [
        'block-item',
        isActive   ? 'block-item--active'    : '',
        isDragging ? 'block-item--dragging'  : '',
        isDragOver ? 'block-item--drag-over' : '',
    ].filter(Boolean).join(' ');

    return (
        <div
            className={classes}
            draggable
            onClick={onClick}
            onDragStart={() => onDragStart(index)}
            onDragOver={(e) => onDragOver(e, index)}
            onDrop={(e) => onDrop(e, index)}
            onDragEnd={onDragEnd}
        >
            <span className="block-item__handle" title="Drag to reorder">⠿</span>
            <span className="block-item__label">{TYPE_LABELS[block.type]}</span>
            <button
                className="block-item__delete"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                title="Remove block"
            >
                ✕
            </button>
        </div>
    );
}
