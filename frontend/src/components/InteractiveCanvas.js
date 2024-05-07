// src/components/InteractiveCanvas.js
import React, { useState, useEffect } from 'react';
import interact from 'interactjs';

// Marker component to render alignment lines
const AlignmentMarkers = ({ target, canvasRect }) => {
    if (!target) return null;

    const targetRect = target.getBoundingClientRect();

    // Calculate the positions of the lines
    const topLineStyle = {
        top: targetRect.top - canvasRect.top + 'px',
        left: 0,
        width: '100%',
        position: 'absolute',
        borderTop: '1px dashed #000',
    };
    const bottomLineStyle = {
        top: targetRect.bottom - canvasRect.top + 'px',
        left: 0,
        width: '100%',
        position: 'absolute',
        borderTop: '1px dashed #000',
    };
    const leftLineStyle = {
        top: 0,
        left: targetRect.left - canvasRect.left + 'px',
        height: '100%',
        position: 'absolute',
        borderLeft: '1px dashed #000',
    };
    const rightLineStyle = {
        top: 0,
        left: targetRect.right - canvasRect.left + 'px',
        height: '100%',
        position: 'absolute',
        borderLeft: '1px dashed #000',
    };

    return (
        <>
            <div style={topLineStyle}></div>
            <div style={bottomLineStyle}></div>
            <div style={leftLineStyle}></div>
            <div style={rightLineStyle}></div>
        </>
    );
};

function InteractiveCanvas({ elements, updateElement, onSelect }) {
    const [selectedElement, setSelectedElement] = useState(null);
    const [canvasRect, setCanvasRect] = useState({});

    useEffect(() => {
        interact('.draggable')
            .draggable({
                inertia: true,
                modifiers: [
                    interact.modifiers.restrictRect({
                        restriction: 'parent',
                        endOnly: true,
                    }),
                ],
                onmove: dragMoveListener,
                onend: function (event) {
                    const textEl = event.target.querySelector('p');
                    textEl &&
                        (textEl.textContent =
                            'moved a distance of ' +
                            (
                                Math.sqrt(
                                    Math.pow(event.pageX - event.x0, 2) +
                                        Math.pow(event.pageY - event.y0, 2) |
                                        0
                                )
                            ).toFixed(2) + 'px');
                },
            });

            function dragMoveListener(event) {
                const target = event.target;
                // Drag sensitivity factor, smaller values make the drag less sensitive
                const dragSensitivityFactor = 0.01; 
            
                // Apply the drag sensitivity factor to the movement deltas
                const x = (parseFloat(target.style.left) || 0) + event.dx * dragSensitivityFactor;
                const y = (parseFloat(target.style.top) || 0) + event.dy * dragSensitivityFactor;
            
                target.style.left = `${x}px`;
                target.style.top = `${y}px`;
            
                if (target.id) {
                    updateElement(target.id, { left: `${x}px`, top: `${y}px` });
                } else {
                    console.error('Dragged element has no id!', target);
                }
            }            
    }, [updateElement]);

    const handleElementClick = (element) => {
        setSelectedElement(document.getElementById(element.id));
        setCanvasRect(document.querySelector('.canvas').getBoundingClientRect());
        onSelect(element);
    };

    return (
        <div
            className="canvas"
            style={{
                width: '100%',
                minHeight: '300px',
                position: 'relative',
                backgroundColor: '#f0f0f0',
            }}
        >
            {elements.map((el) => {
                const style = {
                    ...el.style,
                    position: 'absolute',
                    left: el.style.left,
                    top: el.style.top,
                };
                return (
                    <div
                        key={el.id}
                        id={el.id}
                        className="draggable"
                        style={style}
                        onClick={() => handleElementClick(el)}
                    >
                        {el.tag === 'img' ? (
                            <img src={el.attrs.src} alt={el.attrs.alt} />
                        ) : (
                            el.text
                        )}
                    </div>
                );
            })}
            <AlignmentMarkers target={selectedElement} canvasRect={canvasRect} />
        </div>
    );
}

export default InteractiveCanvas;