import React from 'react';

const TextImageSection = ({ text, imageUrl }) => (
    <div className="text-image-section" style={{ display: 'flex' }}>
        <img src={imageUrl} alt="Descriptive Text" style={{ width: '50%' }} />
        <div style={{ width: '50%' }}>
            <p>{text}</p>
        </div>
    </div>
);

export default TextImageSection;