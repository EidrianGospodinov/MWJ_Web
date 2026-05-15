import {useState} from 'react';
import {client} from '../client';
import TextBlock from '../components/TextBlock/TextBlock';
import BlockTools from "../components/TextBlock/BlockTools.tsx";
import type {
    Block,
} from "../types/Blocks";
import QuestionnaireBlock from "../components/TextBlock/QuestionnaireBlock.tsx";


export default function ContentManagerPage() {
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [showJson, setShowJson] = useState(false);
    
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
                <BlockTools setBlocks={setBlocks} />
                
                {blocks.map((block) => {
                    if (block.type === "text") {
                        return (
                            <TextBlock
                                key={block.id}
                                block={block}
                                setBlocks={setBlocks}
                            />
                        );
                    }else if (block.type === "questionnaire") {
                        
                        return (
                            <QuestionnaireBlock
                                key={block.id}
                                block={block}
                                setBlocks={setBlocks}
                            />
                        );
                    }


                    return null;
                })}
                
                
                <button onClick={() =>
                    setShowJson((prev) => !prev)
                }> Show Json
                </button>
                {showJson && (<pre>
                    {JSON.stringify(blocks, null, 2)}
                </pre>
                )}
            </div>
        </section>
    );
}
