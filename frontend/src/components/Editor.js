import React, { useState } from "react";
import { Link } from "react-router-dom";
import MonacoEditor from "@monaco-editor/react";
import LanguageSelector from "./LanguageSelector"; // Ensure this path is correct
import { CODE_SNIPPETS, LANGUAGE_VERSIONS } from "./Constants";
import LivePreview from './LivePreview';
import transpileCode from './transpileUtils'; // Import the utility function

function Editor() {
    const [selectedComponent, setSelectedComponent] = useState(null);
    const [language, setLanguage] = useState("react"); // Set React as the initial language
    const [code, setCode] = useState(`
    class App extends React.Component {
        render() {
        return <h1>Hello, world!</h1>;
        }
    }

    ReactDOM.render(<App />, document.getElementById('root'));
    `);

    const initialCode = `
    import React from 'react';
    import ReactDOM from 'react-dom';

    const App = () => {
    return <h1>Hello World!</h1>;
    };

    ReactDOM.render(<App />, document.getElementById('root'));
    `;

    const [files, setFiles] = useState({
    'App.js': { code: initialCode, language: 'javascript' },
    // ... other files
    });
    const [currentFile, setCurrentFile] = useState('App.js');

    const handleSelectComponent = (component) => {
        setSelectedComponent(component);
    };

    const handleLanguageChange = (newLanguage) => {
        setLanguage(newLanguage);
        setCode(CODE_SNIPPETS[newLanguage]); // This will switch the code snippet when a new language is selected
    };

    const handleEditorChange = (value, event) => {
        setCode(value);
    };

    return (
        <div className="flex flex-col h-screen">
            <header className="flex justify-between bg-teal-400 p-4 text-white">
                <div>
                    <button className="mx-2">Export Code</button>
                    <button className="mx-2">Save</button>
                </div>
                <Link to="/" className="mx-2">Home</Link>
            </header>
            <div className="flex flex-grow overflow-hidden">
                <aside className="w-1/4 bg-blue-200 p-5 overflow-auto">
                    Section with UI/UX templates
                </aside>
                <main className="flex-grow flex flex-col bg-red-300">
                    <section className="flex-grow p-5 overflow-auto">
                        Hierarchy of parent and children in return statement
                    </section>
                    <main className="flex-grow flex flex-col bg-red-300">
                        <LanguageSelector language={language} onSelect={handleLanguageChange} />
                        <MonacoEditor
                            height="100%"
                            language={language}
                            value={files[currentFile].code}
                            onChange={(value) => setFiles({ ...files, [currentFile]: { ...files[currentFile], code: value } })}
                            theme="vs-dark"
                        />
                        <LivePreview code={transpileCode(files[currentFile].code)} />
                    </main>
                </main>
                <aside className="w-1/4 bg-cyan-300 p-5">
                    <button className="mb-4">Edit mode/Live build Button</button>
                    <div className="bg-white flex-grow p-2 overflow-auto">
                        Live editor/simulator
                    </div>
                </aside>
            </div>
        </div>
    );
}

export default Editor;