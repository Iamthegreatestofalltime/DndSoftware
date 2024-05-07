// src/components/TemplateLibrary.js
import React from 'react';
import TextImageSection from '../templates/TextImageSection';
import SideScrollingWidget from '../templates/SideScrollingWidget';

const TemplateLibrary = ({ onAddTemplate }) => {
    return (
        <div className="template-library">
            <div draggable onDragStart={(e) => onAddTemplate(e, 'TextImageSection')}>
                <TextImageSection text="Sample Text" imageUrl="https://via.placeholder.com/150" />
            </div>
            <div draggable onDragStart={(e) => onAddTemplate(e, 'SideScrollingWidget')}>
                <SideScrollingWidget text="Sample Content" />
            </div>
        </div>
    );
};

export default TemplateLibrary;