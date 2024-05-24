import React, { useState, useEffect } from 'react';
import MonacoEditor from '@monaco-editor/react';
import axios from 'axios';
import InteractiveCanvas from './components/InteractiveCanvas'; // Make sure the path is correct
import './App.css';

function App() {
  const [files, setFiles] = useState({});
  const [currentFile, setCurrentFile] = useState('App.js');
  const [code, setCode] = useState('');
  const [outputPath, setOutputPath] = useState('');
  const [elements, setElements] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:1000/files')
      .then((res) => {
        setFiles(res.data);
        if (res.data['App.js']) {
          setCode(res.data['App.js']);
          extractElements(res.data['App.js']); // Extract elements from the initial code
        }
      })
      .catch((err) => {
        console.error('Failed to fetch files:', err);
      });
  }, []);

  const extractElements = (code) => {
    axios.post('http://localhost:1000/extract-elements', { code })
      .then((res) => {
        console.log('Extracted Elements:', res.data); // Debug log
        setElements(res.data);
      })
      .catch((err) => {
        console.error('Failed to extract elements:', err);
      });
  };

  const handleEditorChange = (value) => {
    setCode(value);
    extractElements(value); // Extract elements whenever the code changes
  };

  const handleFileChange = (file) => {
    setCurrentFile(file);
    setCode(files[file] || '');
    extractElements(files[file] || ''); // Extract elements when file changes
  };

  const handleNewFile = () => {
    const newFileName = prompt('Enter new file name', 'newFile.js');
    if (newFileName && !files[newFileName]) {
      setFiles({ ...files, [newFileName]: '' });
      setCurrentFile(newFileName);
      setCode('');
      setElements([]); // Reset elements for the new file
    }
  };

  const handleSave = () => {
    console.log('Saving file:', currentFile);
    axios.post('http://localhost:1000/save', { filename: currentFile, content: code })
      .then(() => {
        setFiles({ ...files, [currentFile]: code });
        console.log('File saved successfully');
      })
      .catch((err) => {
        console.error('Failed to save file:', err);
      });
  };

  const handleCompile = () => {
    console.log('Compiling file:', currentFile);
    axios.post('http://localhost:1000/compile', { filename: currentFile, content: code })
      .then((res) => {
        console.log('Compilation result:', res.data);
        setOutputPath(res.data.output);
      })
      .catch((err) => {
        console.error('Failed to compile code:', err);
      });
  };

  const updateElement = (id, style) => {
    console.log('Updating element:', id, style);
    setElements(prevElements => 
      prevElements.map(el => (el.id === id ? { ...el, style: { ...el.style, ...style } } : el))
    );

    const styles = elements.map(el => `.${el.id} { left: ${el.style.left}; top: ${el.style.top}; position: ${el.style.position}; }`).join('\n');
    axios.post('http://localhost:1000/save-styles', { styles })
      .then(() => console.log('Styles updated successfully'))
      .catch(err => console.error('Failed to update styles:', err));
  };

  useEffect(() => {
    if (outputPath) {
      console.log(`Output path set to: ${outputPath}`);
    }
  }, [outputPath]);

  return (
    <div className="App">
      <div className="left-pane">
        <div className="file-manager">
          {Object.keys(files).map((file) => (
            <button key={file} onClick={() => handleFileChange(file)}>
              {file}
            </button>
          ))}
          <button onClick={handleNewFile}>New File</button>
        </div>
        <MonacoEditor
          height="40vh"
          language="javascript"
          theme="vs-dark"
          value={code}
          onChange={handleEditorChange}
        />
        <button onClick={handleSave}>Save</button>
        <button onClick={handleCompile}>Compile</button>
      </div>
      <div className="right-pane">
        <InteractiveCanvas
          elements={elements}
          updateElement={updateElement}
          onSelect={(element) => console.log('Selected element:', element)}
        />
        {outputPath && (
          <iframe
            src={`http://localhost:1000${outputPath}`}
            title="Output"
            onLoad={() => console.log('Iframe loaded')}
            onError={() => console.error('Iframe load error')}
          />
        )}
      </div>
    </div>
  );
}

export default App;