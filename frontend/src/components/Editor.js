import React, { useState, useEffect, useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { debounce } from 'lodash';

function AddElement({ onAdd }) {
    return (
        <div>
            <button onClick={() => onAdd('h1', 'Hello, World!')}>Add Heading</button>
            <button onClick={() => onAdd('p', 'Sample text paragraph.')}>Add Paragraph</button>
            <button onClick={() => onAdd('button', 'Click Me', { type: 'button', onclick: "alert('Button clicked!');" })}>Add Button</button>
            <button onClick={() => onAdd('img', null, { src: 'https://via.placeholder.com/150', alt: 'Placeholder Image' })}>Add Image</button>
        </div>
    );
}

function Editor() {
    const [html, setHtml] = useState("<h1>Hello, World!</h1>");
    const [css, setCss] = useState("h1 { color: red; }");
    const [javascript, setJavascript] = useState("console.log('Hello, World!');");
    const iframeRef = useRef(null);

    const updatePreview = debounce(() => {
        const srcdoc = `
            <html>
                <head>
                    <style>${css}</style>
                </head>
                <body>
                    ${html}
                    <script>${javascript}</script>
                </body>
            </html>
        `;
        if (iframeRef.current) {
            iframeRef.current.srcdoc = srcdoc;
        }
    }, 300);

    useEffect(() => {
        updatePreview();
    }, [html, css, javascript]);

    const handleAddElement = (tag, text, attrs = {}) => {
        const attributeString = Object.entries(attrs).map(([key, value]) => `${key}="${value}"`).join(' ');
        const elementString = tag === 'img' || tag === 'input'
            ? `<${tag} ${attributeString} />`
            : `<${tag} ${attributeString}>${text}</${tag}>`;
        const newHtml = `${html}\n${elementString}`;
        setHtml(newHtml);
    };

    return (
        <div className="flex flex-col h-screen">
            <header className="flex justify-between bg-teal-400 p-4 text-white">
                <button className="mx-2">Export Code</button>
                <button className="mx-2">Save</button>
            </header>
            <AddElement onAdd={handleAddElement} />
            <div className="flex flex-grow overflow-hidden">
                <div style={{ width: '33%' }}>
                    <MonacoEditor
                        height="100%"
                        language="html"
                        value={html}
                        onChange={newHtml => setHtml(newHtml)}
                        theme="vs-dark"
                    />
                </div>
                <div style={{ width: '33%' }}>
                    <MonacoEditor
                        height="100%"
                        language="css"
                        value={css}
                        onChange={newCss => setCss(newCss)}
                        theme="vs-dark"
                    />
                </div>
                <div style={{ width: '33%' }}>
                    <MonacoEditor
                        height="100%"
                        language="javascript"
                        value={javascript}
                        onChange={newJavascript => setJavascript(newJavascript)}
                        theme="vs-dark"
                    />
                </div>
                <iframe
                    ref={iframeRef}
                    className="flex-grow"
                    style={{ border: 'none', height: '100%', width: '50%' }}
                    sandbox="allow-scripts"
                />
            </div>
        </div>
    );
}

export default Editor;