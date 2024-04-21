import React, { useRef, useEffect, useState } from 'react';
import transpileCode from './transpileUtils';

const LivePreview = () => {
    return (
      <div>
          <iframe
              title="Live Preview" // A descriptive title
              width="100%"
              height="400px" // Give a fixed height for testing
              style={{ border: '1px solid black' }}
              sandbox="allow-scripts"
          />
          <button onClick={() => alert('Run Code Clicked')}>Run Code</button>
      </div>
    );
  };  

export default LivePreview;