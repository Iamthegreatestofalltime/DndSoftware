import React, { useRef, useEffect, useState } from 'react';
import transpileCode from './transpileUtils';

const LivePreview = ({ code }) => {
    const iframeRef = useRef(null);

    useEffect(() => {
      if (iframeRef.current && code) {
          const transformedCode = transpileCode(code);
          console.log("Transpiled Code:", transformedCode);  // Add this to check the output
  
          const blob = new Blob([`
              <!DOCTYPE html>
              <html lang="en">
              <head><meta charset="UTF-8"></head>
              <body>
                  <div id="root"></div>
                  <script type="text/javascript">${transformedCode}</script>
              </body>
              </html>
          `], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          iframeRef.current.src = url;
      }
  }, [code]);  

    return (
      <div>
          <iframe
              ref={iframeRef}
              title="Live Preview"
              width="100%"
              height="400px"
              style={{ border: 'none' }}
              sandbox="allow-scripts allow-same-origin"
          />
          <button onClick={() => alert('Run Code Clicked')}>Run Code</button>
      </div>
    );
};
  
export default LivePreview;