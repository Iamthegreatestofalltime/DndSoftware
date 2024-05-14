/* global Babel */
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

function parseHtml(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const body = doc.body;

    function recurseElement(element) {
        console.log('Processing element:', element.tagName);  // Log the tag being processed
        return Array.from(element.childNodes).filter(node => node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE).map(node => {
            const attrs = Array.from(node.attributes || []).reduce((acc, attr) => ({
                ...acc,
                [attr.name]: attr.value
            }), {});
            let content = '';
            if (node.nodeType === Node.ELEMENT_NODE) {
                content = node.childNodes.length > 0 ? recurseElement(node) : node.textContent.trim();
            } else if (node.nodeType === Node.TEXT_NODE) {
                content = node.textContent.trim();  // Handle text nodes directly
            }
            console.log(`Tag: ${node.tagName || 'TEXT'}, Content: '${content}'`);  // Log the content of each node
            return {
                tag: node.tagName ? node.tagName.toLowerCase() : 'text',
                attrs: attrs,
                content: content
            };
        });
    }

    return recurseElement(body);
}

function convertToReactComponents(parsedHtml, cssObj) {
    function convertNode(node) {
        const { tag, attrs, content } = node;
        const reactAttrs = Object.entries(attrs).map(([key, value]) => {
            if (key.toLowerCase() === 'class') { // Convert "class" to "className"
                return `className="${value}"`;
            } else if (key.toLowerCase() === 'style') {
                return ''; // Ignore inline style attributes, handled separately
            }
            return `${key}="${value}"`;
        }).join(' ');
    
        const styles = cssObj[`#${attrs.id}`] || {};
        const styleString = Object.keys(styles).length > 0 ? `style={{${Object.entries(styles).map(([prop, val]) => `${camelCase(prop)}: "${val}"`).join(', ')}}}` : '';
    
        if (tag === 'text') {
            // Directly return text content for text nodes
            return content;
        } else if (Array.isArray(content) && content.length > 0) {
            return `<${tag} ${reactAttrs} ${styleString}>
                ${content.map(convertNode).join('')}
            </${tag}>`;
        }
    
        return `<${tag} ${reactAttrs} ${styleString}>${content || ''}</${tag}>`;
    }      

    const componentBody = parsedHtml.map(convertNode).join('\n');
    return `
        return (
            <>
                ${componentBody}
            </>
        );
    `;
}

function camelCase(str) {
    return str.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
}

function Editor() {
    const [html, setHtml] = useState("<h1>Hello, World!</h1>");
    const [css, setCss] = useState("h1 { color: red; }");
    const [javascript, setJavascript] = useState("");
    const iframeRef = useRef(null);
    const monacoRef = useRef();
    const [selectedElement, setSelectedElement] = useState(null);
    const [reactCode, setReactCode] = useState("");
    const [mode, setMode] = useState("html");
    const [reactCss, setReactCss] = useState("");

    const exportToReact = useCallback(() => {
        const parsedHtml = parseHtml(html);
        const parsedCss = parseCss(css);
        const reactComponents = convertToReactComponents(parsedHtml, parsedCss);
        setReactCode(reactComponents);
        console.log("React Components:", reactComponents);
    }, [html, css]);

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

    const updatePreview = useCallback(() => {
        console.log("Updating preview for mode:", mode);
        try {
            let srcdoc = '';

            if (mode === "react") {
                // Remove import statements and handle hooks and components globally
                let preparedCode = reactCode.replace(/import\s+[^;]+;/g, '');

                // Add global references for React and ReactDOM
                let globalReferences = `
                    var React = window.React;
                    var ReactDOM = window.ReactDOM;
                `;

                // Add global references for React hooks
                const reactHooks = ['useState', 'useEffect', 'useRef', 'useCallback', 'useContext', 'useReducer', 'useMemo', 'useImperativeHandle', 'useLayoutEffect', 'useDebugValue'];
                reactHooks.forEach(hook => {
                    globalReferences += `var ${hook} = React.${hook};\n`;
                });

                preparedCode = `
                    (function() {
                        ${globalReferences}
                        ${preparedCode}
                        ReactDOM.render(<App />, document.getElementById('root'));
                    })();
                `;

                const transpiledCode = Babel.transform(preparedCode, {
                    presets: ['react']  // Use React preset to handle JSX
                }).code;

                console.log("Transpiled code:", transpiledCode);

                srcdoc = `
                    <html>
                        <head>
                            <script src="https://unpkg.com/react@17/umd/react.development.js"></script>
                            <script src="https://unpkg.com/react-dom@17/umd/react-dom.development.js"></script>
                            <style>${reactCss}</style>
                        </head>
                        <body>
                            <div id="root"></div>
                            <script type="text/javascript">
                                ${transpiledCode}
                            </script>
                        </body>
                    </html>
                `;
            } else {
                srcdoc = `
                    <html>
                        <head>
                            <style>${css}</style>
                        </head>
                        <body>
                            ${html}
                            <script>
                                ${javascript}
                            </script>
                        </body>
                    </html>
                `;
            }

            if (iframeRef.current) {
                iframeRef.current.srcdoc = srcdoc;
            }
        } catch (error) {
            console.error("Error in transpiling code:", error);
        }
    }, [reactCode, reactCss, css, html, javascript, mode]); 
    
    const [elements, setElements] = useState([]);

    function convertReactToHtmlCss(reactCode) {
        const jsx = reactCode; // This would be the React code you get from your editor
        // Here you would parse the JSX to HTML and extract CSS
        // This is a simplified and not fully functional parser
        const html = jsx.replace(/<([A-Z][A-Za-z]*)\s?([^>]*)>/g, '<div $2>').replace(/<\/[A-Z][A-Za-z]*>/g, '</div>');
        const css = ""; // You would need to extract styles and convert them to CSS here

        console.log('Converted HTML:', html);
        console.log('Converted CSS:', css);
    }

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
    }, [html, css, javascript, reactCss]);

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

    const handleReactCssChange = useCallback(debounce((newCss) => {
        if (newCss !== reactCss) {
            console.log("React CSS Edited:", newCss); // Log raw CSS input
            setReactCss(newCss);
        }
    }, 3000), [reactCss]);

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
                <button onClick={exportToReact} className="mx-2">Convert Code</button>
                <button onClick={() => convertReactToHtmlCss(reactCode)} className="mx-2">Convert to HTML/CSS</button>
                <div>
                    <button className={`mx-2 ${mode === 'html' ? 'bg-white text-teal-400' : ''}`} onClick={() => setMode('html')}>HTML/CSS/JS Mode</button>
                    <button className={`mx-2 ${mode === 'react' ? 'bg-white text-teal-400' : ''}`} onClick={() => setMode('react')}>React Mode</button>
                </div>
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
                    {mode === 'html' && (
                        <>
                            <MonacoEditor
                                height="100%"
                                language="html"
                                value={html}
                                onChange={setHtml}
                                theme="vs-dark"
                            />
                            <MonacoEditor
                                height="100%"
                                language="css"
                                value={css}
                                onChange={setCss}
                                theme="vs-dark"
                            />
                            <MonacoEditor
                                height="100%"
                                language="javascript"
                                value={javascript}
                                onChange={setJavascript}
                                theme="vs-dark"
                            />
                        </>
                    )}
                    {mode === 'react' && (
                        <>
                            <MonacoEditor
                                height="50%"
                                language="javascript"
                                value={reactCode}
                                onChange={(newReactCode) => {
                                    console.log("React code updated:", newReactCode); // Log new code for debugging
                                    setReactCode(newReactCode);
                                }}
                                theme="vs-dark"
                            />
                            <MonacoEditor
                                height="50%"
                                language="css"
                                value={reactCss}
                                onChange={(newReactCss) => {
                                    console.log("React CSS updated:", newReactCss); // Log new CSS for debugging
                                    setReactCss(newReactCss);
                                }}
                                theme="vs-dark"
                            />
                        </>
                    )}
                </Resizable>
                <iframe
                    ref={iframeRef}
                    className="flex-grow"
                    style={{ border: 'none', height: '100%', width: '50%' }}
                    sandbox="allow-scripts allow-same-origin"
                />
                <InteractiveCanvas elements={elements} updateElement={updateElement} onSelect={handleSelectElement} />
                <PropertiesPanel
                    selectedElement={selectedElement}
                    updateElementStyle={updateElementStyle}
                    updateElementText={updateElementText}
                    updateElementSrc={updateElementSrc}
                />
            </div>
        </div>
    );
}

export default Editor;