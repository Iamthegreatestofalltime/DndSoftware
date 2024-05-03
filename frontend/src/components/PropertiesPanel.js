import React from 'react';

function PropertiesPanel({ selectedElement, updateElementStyle }) {
    const handleStyleChange = (styleName, value) => {
        const updatedStyle = { ...selectedElement.style, [styleName]: value };
        updateElementStyle(selectedElement.id, updatedStyle);
    };

    if (!selectedElement) {
        return <div>Select an element to see its properties</div>;
    }

    return (
        <div>
            <h3>Properties for: {selectedElement.id}</h3>
            <div>
                <label>Width: </label>
                <input type="text" value={selectedElement.style.width || ''} onChange={(e) => handleStyleChange('width', e.target.value)} />
            </div>
            <div>
                <label>Height: </label>
                <input type="text" value={selectedElement.style.height || ''} onChange={(e) => handleStyleChange('height', e.target.value)} />
            </div>
            {/* Add more style controls as needed */}
        </div>
    );
}

export default PropertiesPanel;