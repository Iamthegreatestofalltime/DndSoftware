import React, { useState, useEffect, useRef, useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { debounce } from 'lodash';
import InteractiveCanvas from './InteractiveCanvas';
import PropertiesPanel from './PropertiesPanel';
import { Resizable } from 're-resizable';
import '../App.css';
import TemplateLibrary from './TemplateLibrary';

function AddElement({ onAdd }) {
    return (
        <div>
            <button onClick={() => onAdd('h1', 'Hello, World!')}>Add Heading</button>
            <button onClick={() => onAdd('p', 'Sample text paragraph.')}>Add Paragraph</button>
            <button onClick={() => onAdd('button', 'Click Me', { type: 'button', onclick: "alert('Button clicked!');" })}>Add Button</button>
            <button onClick={() => onAdd('img', null, { src: 'https://via.placeholder.com/150', alt: 'Placeholder Image' })}>Add Image</button>
            <button onClick={() => onAdd('div', 'Editable Div' )}>Add Div</button>
            <button onClick={() => onAdd('section', 'Editable Section')}>Add Section</button>
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
                        acc[property.trim()] = value.trim(); // Keep CSS format here
                    }
                    return acc;
                }, {});
                cssObj[selector] = styles; // Store styles in CSS format
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

    const handleDrop = (e) => {
        e.preventDefault();
        const templateType = e.dataTransfer.getData("templateType");
        const newElement = createTemplateElement(templateType);
        setElements([...elements, newElement]);
    };

    const handleDragOver = (e) => {
        e.preventDefault();  // This allows us to drop.
    }

    const handleSelectElement = (element) => {
        setSelectedElement(element);
    };

    const createTemplateElement = (templateType) => {
        // Based on the type, return a new element object
        if (templateType === 'TextImageSection') {
            return { type: 'TextImageSection', props: { text: 'Editable text', imageUrl: 'https://via.placeholder.com/150' }};
        } else if (templateType === 'SideScrollingWidget') {
            return { type: 'SideScrollingWidget', props: { content: 'Editable content' }};
        }
    };

    const updateElementStyle = (id, newStyle) => {
        const updatedElements = elements.map(el => {
            if (el.id === id) {
                console.log("Updating element style for ID:", id, "New Style:", newStyle); // Log style updates
                return { ...el, style: newStyle };
            }
            return el;
        });
        setElements(updatedElements);
    };    
    
    const updateElementText = (id, newText) => {
        setElements(prevElements => prevElements.map(el => {
            if (el.id === id) {
                return { ...el, text: newText };
            }
            return el;
        }));
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
        // Update elements state first
        setElements(prevElements => [...prevElements, newElement]);
        // Then update the HTML by appending the new element
        const attributeString = Object.entries(attrs).map(([key, value]) => `${key}="${value}"`).join(' ');
        const elementString = tag === 'img' || tag === 'input'
            ? `<${tag} id="${id}" ${attributeString} />`
            : `<${tag} id="${id}" ${attributeString}>${text}</${tag}>`;
        const newHtml = `${html}\n${elementString}`;
        setHtml(newHtml);
    };    

    const debouncedUpdateHtml = useCallback(debounce((newHtml) => {
        if (newHtml !== html) {
            setHtml(newHtml);
            updatePreview();
        }
    }, 3000), [html, updatePreview]);

    const handleHtmlChange = useCallback(debounce((newHtml) => {
        if (newHtml !== html) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(newHtml, 'text/html');
            const newElements = Array.from(doc.body.children).map(el => {
                const id = el.id || `element-${Date.now()}`; // Ensure each element has an ID
                const tag = el.tagName.toLowerCase();
                const text = el.textContent;
                const attrs = {};
                Array.from(el.attributes).forEach(attr => {
                    attrs[attr.name] = attr.value;
                });
                let existingElement = elements.find(e => e.id === id);
                let style = existingElement ? existingElement.style : { position: 'absolute', left: '50px', top: '50px' }; // Apply default style if new
                if (!existingElement) {
                    // If it's a new element not previously managed, initialize it properly
                    existingElement = { id, tag, attrs, text, style };
                    setElements(prevElements => [...prevElements, existingElement]); // Add to elements array if it's new
                } else {
                    // Update existing element's text and attributes only
                    existingElement = { ...existingElement, tag, attrs, text, style };
                }
                return existingElement;
            });
    
            setElements(newElements); // Update the elements state
            debouncedUpdateHtml(newHtml);
        }
    }, 3000), [html]);   

    const updateElementSrc = (id, newSrc) => {
        setElements(prevElements => prevElements.map(el => {
            if (el.id === id && el.tag === 'img') {
                return { ...el, attrs: {...el.attrs, src: newSrc} };
            }
            return el;
        }));
    };    

    const handleCssChange = useCallback(debounce((newCss) => {
        if (newCss !== css) {
            console.log("CSS Edited:", newCss); // Log raw CSS input
            setCss(newCss);
            const cssObj = parseCss(newCss);
            console.log("Parsed CSS Object:", cssObj); // Log parsed CSS object
            const updatedElements = elements.map(el => {
                const newStyle = cssObj[`#${el.id}`] || el.style;
                return { ...el, style: newStyle };
            });
            setElements(updatedElements);
        }
    }, 3000), [css, elements]);    

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
                <Resizable
                    defaultSize={{
                        width: '50%',
                        height: '100%',
                    }}
                    style={{ display: 'flex', flexDirection: 'column' }}
                >
                    <Resizable
                        defaultSize={{
                            width: '100%',
                            height: '33%',
                        }}
                    >
                        <MonacoEditor
                            height="100%"
                            language="html"
                            value={html}
                            onChange={handleHtmlChange}
                            theme="vs-dark"
                        />
                    </Resizable>
                    <Resizable
                        defaultSize={{
                            width: '100%',
                            height: '33%',
                        }}
                    >
                        <MonacoEditor
                            height="100%"
                            language="css"
                            value={css}
                            onChange={handleCssChange}
                            theme="vs-dark"
                        />
                    </Resizable>
                    <MonacoEditor
                        height="100%"
                        language="javascript"
                        value={javascript}
                        onChange={newJavascript => setJavascript(newJavascript)}
                        theme="vs-dark"
                    />
                </Resizable>
                <iframe
                    ref={iframeRef}
                    className="flex-grow"
                    style={{ border: 'none', height: '100%', width: '50%' }}
                    sandbox="allow-scripts"
                />
                <InteractiveCanvas elements={elements} updateElement={updateElement} onSelect={handleSelectElement} />
                <PropertiesPanel
                    selectedElement={selectedElement}
                    updateElementStyle={updateElementStyle}
                    updateElementText={updateElementText}
                    updateElementSrc={updateElementSrc}
                />
                <TemplateLibrary onAddTemplate={(e, type) => {
                    e.dataTransfer.setData("templateType", type);
                }} />
            </div>
        </div>
    );
}

export default Editor;