import { useState } from 'react';
import { client } from '../client';
import TextBlock from '../components/TextBlock/TextBlock';

type Block = {
    id: string;
    type: 'text';
    content: { text: string };
};

export default function ContentManagerPage() {
    const [blocks, setBlocks] = useState<Block[]>([]);

    const addTextBlock = () => {
        setBlocks((prev) => [
            ...prev,
            { id: crypto.randomUUID(), type: 'text', content: { text: '' } },
        ]);
    };

    const updateTextBlock = (id: string, text: string) => {
        setBlocks((prev) =>
            prev.map((block) =>
                block.id === id ? { ...block, content: { ...block.content, text } } : block
            )
        );
    };

    const saveData = async () => {
        const result = await client.models.ContentManagement.create({
            title: 'My First ',
            blocks: JSON.stringify(blocks),
        });
        console.log('saved', result);
    };

    return (
        <section className="content-area">
            <h1>Content Manager</h1>
            <div className="content-placeholder">
                <p>Manage your posts, images, and other media here.</p>
                <button onClick={saveData}>Save Data</button>
                <button onClick={addTextBlock}>Add Text Block</button>
                {blocks.map((block) => (
                    <TextBlock
                        key={block.id}
                        value={block.content.text}
                        onChange={(text) => updateTextBlock(block.id, text)}
                    />
                ))}
                <pre>{JSON.stringify(blocks, null, 2)}</pre>
            </div>
        </section>
    );
}
