/*global Babel*/
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

function parseHtml(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const body = doc.body;

    function recurseElement(element) {
        return Array.from(element.childNodes).filter(node => node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE).map(node => {
            const attrs = Array.from(node.attributes || []).reduce((acc, attr) => ({
                ...acc,
                [attr.name]: attr.value
            }), {});
            let content = '';
            if (node.nodeType === Node.ELEMENT_NODE) {
                content = node.childNodes.length > 0 ? recurseElement(node) : node.textContent.trim();
            } else if (node.nodeType === Node.TEXT_NODE) {
                content = node.textContent.trim();
            }
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
            if (key.toLowerCase() === 'class') {
                return `className="${value}"`;
            } else if (key.toLowerCase() === 'style') {
                return '';
            }
            return `${key}="${value}"`;
        }).join(' ');

        const styles = cssObj[`#${attrs.id}`] || {};
        const styleString = Object.keys(styles).length > 0 ? `style={{${Object.entries(styles).map(([prop, val]) => `${camelCase(prop)}: "${val}"`).join(', ')}}}` : '';

        if (tag === 'text') {
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

const loadScript = (src) => {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
};

function Editor() {
    const [html, setHtml] = useState("<h1>Hello, World!</h1>");
    const [css, setCss] = useState("h1 { color: red; }");
    const [javascript, setJavascript] = useState("");
    const [reactCode, setReactCode] = useState("");
    const [reactCss, setReactCss] = useState("");
    const [mode, setMode] = useState("html");
    const [files, setFiles] = useState([
        { name: "App.js", language: "javascript", value: `import React from 'react';\n\nfunction App() {\n    return <div>Hello, React!</div>;\n}\n\nexport default App;` },
        { name: "App.css", language: "css", value: `div { color: blue; }` }
    ]);
    const [selectedFile, setSelectedFile] = useState(files[0]);
    const iframeRef = useRef(null);
    const [selectedElement, setSelectedElement] = useState("");
    const [libraries, setLibraries] = useState([]); // New state for user-defined libraries
    const monacoRef = useRef();

    const exportToReact = useCallback(() => {
        const parsedHtml = parseHtml(html);
        const parsedCss = parseCss(css);
        const reactComponents = convertToReactComponents(parsedHtml, parsedCss);
        setReactCode(reactComponents);
    }, [html, css]);

    const handleDrop = (e) => {
        e.preventDefault();
        const templateType = e.dataTransfer.getData("templateType");
        const newElement = createTemplateElement(templateType);
        setElements([...elements, newElement]);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    }

    const handleSelectElement = (element) => {
        setSelectedElement(element);
    };

    const createTemplateElement = (templateType) => {
        if (templateType === 'TextImageSection') {
            return { type: 'TextImageSection', props: { text: 'Editable text', imageUrl: 'https://via.placeholder.com/150' }};
        } else if (templateType === 'SideScrollingWidget') {
            return { type: 'SideScrollingWidget', props: { content: 'Editable content' }};
        }
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

    const updateElementText = (id, newText) => {
        setElements(prevElements => prevElements.map(el => {
            if (el.id === id) {
                return { ...el, text: newText };
            }
            return el;
        }));
    };

    const updatePreview = useCallback(async () => {
        try {
            let srcdoc = '';
    
            if (mode === "react") {
                let jsFiles = files.filter(file => file.language === 'javascript');
                let cssFiles = files.filter(file => file.language === 'css');
                
                let bundledJs = jsFiles.map(file => file.value).join('\n');
                let bundledCss = cssFiles.map(file => file.value).join('\n');
    
                let preparedCode = bundledJs.replace(/import\s+[^;]+;/g, '').replace(/export\s+default\s+\w+;/g, '');
    
                let globalReferences = `
                    var React = window.React;
                    var ReactDOM = window.ReactDOM;
                `;
    
                const reactHooks = ['useState', 'useEffect', 'useRef', 'useCallback', 'useContext', 'useReducer', 'useMemo', 'useImperativeHandle', 'useLayoutEffect', 'useDebugValue'];
                reactHooks.forEach(hook => {
                    globalReferences += `var ${hook} = React.${hook};\n`;
                });

                // Load user-defined libraries
                for (let lib of libraries) {
                    await loadScript(lib);
                }
    
                preparedCode = `
                    ${globalReferences}
                    ${preparedCode}
                    (function() {
                        ${globalReferences}
                        ${preparedCode}
                        ReactDOM.render(React.createElement(App), document.getElementById('root'));
                    })();
                `;
    
                const transpiledCode = Babel.transform(preparedCode, {
                    presets: ['react']
                }).code;

                srcdoc = `
                    <html>
                        <head>
                            <script src="https://unpkg.com/react@17/umd/react.development.js"></script>
                            <script src="https://unpkg.com/react-dom@17/umd/react-dom.development.js"></script>
                            <style>${bundledCss}</style>
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
    }, [reactCode, css, html, javascript, mode, files, libraries]); // Include libraries in the dependency array

    const [elements, setElements] = useState([]);

    function convertReactToHtmlCss(reactCode) {
        const jsx = reactCode;
        const html = jsx.replace(/<([A-Z][A-Za-z]*)\s?([^>]*)>/g, '<div $2>').replace(/<\/[A-Z][A-Za-z]*>/g, '</div>');
        const css = "";
    }

    const generateHtml = (elements) => {
        return elements.map(el => {
            const attrs = Object.entries(el.attrs || {}).map(([key, value]) => `${key}="${value}"`).join(' ');
            return el.tag === 'img' || el.tag === 'input'
                ? `<${el.tag} id="${el.id}" ${attrs} />`
                : `<${el.tag} id="${el.id}" ${attrs}>${el.text || ''}</${el.tag}>`;
        }).join('\n');
    };

    const generateCss = (elements) => {
        return elements.map(el => {
            const style = Object.entries(el.style || {}).map(([key, value]) => `${key}: ${value};`).join(' ');
            return `${el.id.startsWith('#') ? '' : '#'}${el.id} { ${style} }`;
        }).join('\n');
    };

    useEffect(() => {
        const newHtml = generateHtml(elements);
        const newCss = generateCss(elements);
        setHtml(newHtml);
        setCss(newCss);
        updatePreview();
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
            style: { position: 'absolute', left: '50px', top: '50px' }
        };
        setElements(prevElements => [...prevElements, newElement]);
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
                const id = el.id || `element-${Date.now()}`;
                const tag = el.tagName.toLowerCase();
                const text = el.textContent;
                const attrs = {};
                Array.from(el.attributes).forEach(attr => {
                    attrs[attr.name] = attr.value;
                });
                let existingElement = elements.find(e => e.id === id);
                let style = existingElement ? existingElement.style : { position: 'absolute', left: '50px', top: '50px' };
                if (!existingElement) {
                    existingElement = { id, tag, attrs, text, style };
                    setElements(prevElements => [...prevElements, existingElement]);
                } else {
                    existingElement = { ...existingElement, tag, attrs, text, style };
                }
                return existingElement;
            });

            setElements(newElements);
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
            setCss(newCss);
            const cssObj = parseCss(newCss);
            const updatedElements = elements.map(el => {
                const newStyle = cssObj[`#${el.id}`] || el.style;
                return { ...el, style: newStyle };
            });
            setElements(updatedElements);
        }
    }, 3000), [css, elements]);

    const handleReactCssChange = useCallback(debounce((newReactCss) => {
        if (newReactCss !== reactCss) {
            setReactCss(newReactCss);
        }
    }, 3000), [reactCss]);

    const editorDidMount = useCallback((editor) => {
        monacoRef.current = editor;
        editor.focus();
    }, []);

    const handleFileChange = (file) => {
        setSelectedFile(file);
    };

    const addFile = () => {
        const newFile = { name: `NewFile${files.length + 1}.js`, language: "javascript", value: "" };
        setFiles([...files, newFile]);
        setSelectedFile(newFile);
    };

    const deleteFile = (fileName) => {
        const filteredFiles = files.filter(file => file.name !== fileName);
        setFiles(filteredFiles);
        if (selectedFile.name === fileName && filteredFiles.length > 0) {
            setSelectedFile(filteredFiles[0]);
        } else if (filteredFiles.length === 0) {
            setSelectedFile(null);
        }
    };

    // Handle adding user-defined libraries
    const addLibrary = (url) => {
        setLibraries([...libraries, url]);
    };

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
                <div>
                    <input
                        type="text"
                        placeholder="Library URL"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.target.value) {
                                addLibrary(e.target.value);
                                e.target.value = '';
                            }
                        }}
                        className="mx-2 p-1 text-black"
                    />
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
                            <div className="file-tabs">
                                {files.map(file => (
                                    <div key={file.name} className={`file-tab ${selectedFile.name === file.name ? 'active' : ''}`} onClick={() => handleFileChange(file)}>
                                        {file.name}
                                        <button onClick={() => deleteFile(file.name)}>x</button>
                                    </div>
                                ))}
                                <button onClick={addFile}>+ Add File</button>
                            </div>
                            <MonacoEditor
                                height="100%"
                                language={selectedFile.language}
                                value={selectedFile.value}
                                onChange={(newValue) => {
                                    setSelectedFile({ ...selectedFile, value: newValue });
                                    setFiles(files.map(file => file.name === selectedFile.name ? { ...file, value: newValue } : file));
                                }}
                                theme="vs-dark"
                            />
                            {selectedFile.language === "css" && (
                                <MonacoEditor
                                    height="100%"
                                    language="css"
                                    value={reactCss}
                                    onChange={handleReactCssChange}
                                    theme="vs-dark"
                                />
                            )}
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