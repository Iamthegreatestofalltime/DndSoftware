import React, { useEffect, useState } from 'react';
import { debounce } from 'lodash';

function PropertiesPanel({ selectedElement, updateElementStyle, updateElementText, updateElementSrc }) {
    const [inputStyles, setInputStyles] = useState({});
    const [textContent, setTextContent] = useState('');
    const [imageSrc, setImageSrc] = useState('');

    useEffect(() => {
        if (selectedElement) {
            if (selectedElement.tag === 'img') {
                setImageSrc(selectedElement.attrs.src || '');
            }
            const camelCaseStyles = convertToCamelCase(selectedElement.style);
            setInputStyles(camelCaseStyles);
            setTextContent(selectedElement.text || '');
        } else {
            setInputStyles(defaultStyles);
        }
    }, [selectedElement]);

    const handleImageSrcChange = (event) => {
        setImageSrc(event.target.value);
        updateElementSrc(selectedElement.id, event.target.value);
    };

    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setImageSrc(e.target.result);
                updateElementSrc(selectedElement.id, e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleTextChange = (event) => {
        setTextContent(event.target.value);
        updateElementText(selectedElement.id, event.target.value);
    };

    function convertToCamelCase(styles) {
        return Object.keys(styles).reduce((acc, key) => {
            const camelCaseKey = key.replace(/-./g, match => match[1].toUpperCase());
            acc[camelCaseKey] = styles[key];
            return acc;
        }, {});
    }    

    const defaultStyles = {
        width: '',
        height: '',
        padding: '',
        margin: '',
        color: '#000000', // Default for color input
        borderRadius: '',
        fontSize: '',
        backgroundColor: '#ffffff', // Default for color input
        fontWeight: 'normal'
    };

    const debouncedUpdateStyle = debounce((id, newStyles) => {
        console.log('Updating styles for element', id, newStyles); // Debugging line
        if (id) {
            const cssStyle = convertToCssStyle(newStyles);
            updateElementStyle(id, cssStyle);
        }
    }, 3000);

    const handleStyleChange = (styleName, value) => {
        console.log('Style change:', styleName, value); // Debugging line
        const newStyles = { ...inputStyles, [styleName]: value };
        setInputStyles(newStyles);
        debouncedUpdateStyle(selectedElement.id, newStyles);
    };

    function convertToCssStyle(styles) {
        return Object.keys(styles).reduce((acc, key) => {
            const cssKey = key.replace(/([A-Z])/g, g => `-${g[0].toLowerCase()}`);
            acc[cssKey] = styles[key];
            return acc;
        }, {});
    }

    function filterStylesWithValues(styles) {
        return Object.keys(styles).reduce((acc, key) => {
            if (styles[key]) { // Only add style if it has a non-empty value
                acc[key] = styles[key];
            }
            return acc;
        }, {});
    }

    if (!selectedElement) {
        return <div>Select an element to see its properties</div>;
    }

    return (
        <div>
            <h3>Properties for: {selectedElement.id}</h3>
            {Object.keys(defaultStyles).map(key => (
                <div key={key}>
                    <label>{key.charAt(0).toUpperCase() + key.slice(1)}:</label>
                    <input
                        type={/color/i.test(key) ? 'color' : 'text'}
                        value={inputStyles[key] || ''}
                        onChange={(e) => handleStyleChange(key, e.target.value)}
                    />
                </div>
            ))}
            {/* Add text content editing for elements that can have text */}
            {selectedElement.tag !== 'img' && (
                <div>
                    <label>Text Content:</label>
                    <textarea value={textContent} onChange={handleTextChange} />
                </div>
            )}
            {selectedElement.tag === 'img' && (
                <div>
                    <label>Image URL:</label>
                    <input type="text" value={imageSrc} onChange={handleImageSrcChange} />
                    <label>Or upload image:</label>
                    <input type="file" onChange={handleImageUpload} />
                </div>
            )}
        </div>
    );
}

export default PropertiesPanel;