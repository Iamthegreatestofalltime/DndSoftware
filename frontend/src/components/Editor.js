import React, { useState, useEffect, useRef, useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { debounce } from 'lodash';
import InteractiveCanvas from './InteractiveCanvas';
import PropertiesPanel from './PropertiesPanel';

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

function parseCss(cssString) {
    const cssObj = {};
    const rules = cssString.split('}');
    rules.forEach(rule => {
        if (rule.trim()) {
            const parts = rule.split('{');
            const selector = parts[0].trim();
            const declarations = parts[1].trim();
            if (selector && declarations) {
                const styles = declarations.split(';').reduce((acc, declaration) => {
                    const [property, value] = declaration.split(':');
                    if (property && value) {
                        acc[property.trim()] = value.trim();
                    }
                    return acc;
                }, {});
                cssObj[selector] = styles;
            }
        }
    });
    return cssObj;
}

function Editor() {
    const [html, setHtml] = useState("<h1>Hello, World!</h1>");
    const [css, setCss] = useState("h1 { color: red; }");
    const [javascript, setJavascript] = useState("");
    const iframeRef = useRef(null);
    const monacoRef = useRef();
    const [selectedElement, setSelectedElement] = useState(null);

    const handleSelectElement = (element) => {
        setSelectedElement(element);
    };

    const updateElementStyle = (id, newStyle) => {
        const updatedElements = elements.map(el => {
            if (el.id === id) {
                return { ...el, style: newStyle };
            }
            return el;
        });
        setElements(updatedElements);
    };

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

    const [elements, setElements] = useState([]);

    const generateHtml = (elements) => {
        return elements.map(el => {
            const attrs = Object.entries(el.attrs || {}).map(([key, value]) => `${key}="${value}"`).join(' ');
            return el.tag === 'img' || el.tag === 'input'
                ? `<${el.tag} id="${el.id}" ${attrs} />`
                : `<${el.tag} id="${el.id}" ${attrs}>${el.text || ''}</${el.tag}>`;
        }).join('\n');
    };
    // Update the CSS generator to use the id as a selector
    const generateCss = (elements) => {
        return elements.map(el => {
            const style = Object.entries(el.style || {}).map(([key, value]) => `${key}: ${value};`).join(' ');
            // Ensure the '#' is included only if 'id' is not already starting with '#'
            return `${el.id.startsWith('#') ? '' : '#'}${el.id} { ${style} }`;
        }).join('\n');
    };
    
    // Whenever elements change, update the html and css state
    useEffect(() => {
        console.log("hitting HTML and CSS");
        const newHtml = generateHtml(elements);
        const newCss = generateCss(elements);
        setHtml(newHtml);
        setCss(newCss);
        console.log("set the code");
        updatePreview(); // Ensure this function is debounced
    }, [elements]);

    useEffect(() => {
        updatePreview();
    }, [html, css, javascript]);

    const updateElement = (id, newStyle) => {
        setElements(prevElements => {
            return prevElements.map(el => {
                if (el.id === id) {
                    return { ...el, style: {...el.style, ...newStyle} };
                }
                return el;
            });
        });
    };    

    const handleAddElement = (tag, text, attrs = {}) => {
        const id = `element-${Date.now()}`;

        const newElement = {
            id,
            tag,
            text,
            attrs,
            style: { position: 'absolute', left: '50px', top: '50px' } // Default styles
        };
        setElements(prevElements => [...prevElements, newElement]);
        const attributeString = Object.entries(attrs).map(([key, value]) => `${key}="${value}"`).join(' ');
        const elementString = tag === 'img' || tag === 'input'
            ? `<${tag} ${attributeString} />`
            : `<${tag} ${attributeString}>${text}</${tag}>`;
        const newHtml = `${html}\n${elementString}`;
        setHtml(newHtml);
    };

    const handleHtmlChange = (newHtml) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(newHtml, 'text/html');
    
        // Assuming elements are identified by their `id`
        const newElements = Array.from(doc.body.children).map(el => {
            const id = el.id;
            const existingElement = elements.find(e => e.id === id);
            if (existingElement) {
                return { ...existingElement, text: el.textContent };
            }
            return null; // or handle new elements if necessary
        }).filter(e => e !== null);
    
        setElements(newElements);
        setHtml(newHtml);
    };
    const debouncedCssUpdate = useCallback(debounce((newCss) => {
        setCss(newCss);
    }, 5000), []);
    const handleCssChange = (newCss) => {
        if (newCss !== css) {
            // Debounce updates to prevent frequent state updates and re-renders
            debouncedCssUpdate(newCss);
    
            // Parse the CSS to update elements' styles
            const cssObj = parseCss(newCss);
            const updatedElements = elements.map(el => {
                const newStyle = cssObj[`#${el.id}`] || el.style;
                return { ...el, style: newStyle };
            });
            setElements(updatedElements);
        }
    };  

    const editorDidMount = useCallback((editor) => {
        monacoRef.current = editor;
        editor.focus();
    }, []);
    
    return (
        <div className="flex flex-col h-screen">
            <header className="flex justify-between bg-teal-400 p-4 text-white">
                <button className="mx-2">Export Code</button>
                <button className="mx-2">Save</button>
            </header>
            <AddElement onAdd={handleAddElement} />
            <div className="flex flex-grow overflow-hidden">
                <div style={{width: '50%'}}>
                    <div style={{ height: '33%' }}>
                    <MonacoEditor
                        height="100%"
                        language="html"
                        value={html}
                        onChange={handleHtmlChange}
                        theme="vs-dark"
                    />
                    </div>
                    <div style={{ height: '33%' }}>
                        <MonacoEditor
                            height="100%"
                            language="css"
                            value={css}
                            onChange={handleCssChange}
                            theme="vs-dark"
                            editorDidMount={editorDidMount}
                        />
                    </div>
                    <div style={{ height: '33%' }}>
                        <MonacoEditor
                            height="100%"
                            language="javascript"
                            value={javascript}
                            onChange={newJavascript => setJavascript(newJavascript)}
                            theme="vs-dark"
                        />
                    </div>
                </div>
                <iframe
                    ref={iframeRef}
                    className="flex-grow"
                    style={{ border: 'none', height: '100%', width: '50%' }}
                    sandbox="allow-scripts"
                />
                <InteractiveCanvas elements={elements} updateElement={updateElement} onSelect={handleSelectElement} />
                <PropertiesPanel selectedElement={selectedElement} updateElementStyle={updateElementStyle} />
            </div>
        </div>
    );
}

export default Editor;