/* global Babel */

import React from 'react';
import { LiveProvider, LiveEditor, LiveError, LivePreview } from 'react-live';

const initialCode = `
function App() {
  return <h1>Hello, World!</h1>;
}
`;

function LiveCodeEditor() {
    return (
        <LiveProvider code={initialCode} scope={{ React }} transformCode={code => Babel.transform(code, {
       presets: ['es2015', 'react']
   }).code}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '50%', padding: '10px' }}>
                    <LiveEditor />
                </div>
                <div style={{ width: '50%', padding: '10px', borderLeft: '1px solid #ccc' }}>
                    <LivePreview />
                    <LiveError style={{ color: 'red' }} />
                </div>
            </div>
        </LiveProvider>
    );
}

export default LiveCodeEditor;