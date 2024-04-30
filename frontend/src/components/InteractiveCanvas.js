// src/components/InteractiveCanvas.js
import React, { useState, useEffect } from 'react';
import interact from 'interactjs';

function InteractiveCanvas({ elements, updateElement }) {
    useEffect(() => {
        interact('.draggable')
            .draggable({
                // enable inertial throwing
                inertia: true,
                // keep the element within the area of its parent
                modifiers: [
                    interact.modifiers.restrictRect({
                        restriction: 'parent',
                        endOnly: true
                    })
                ],
                // call this function on every dragmove event
                onmove: dragMoveListener,
                // call this function on every dragend event
                onend: function (event) {
                    var textEl = event.target.querySelector('p');
                    textEl && (textEl.textContent =
                        'moved a distance of ' +
                        (Math.sqrt(Math.pow(event.pageX - event.x0, 2) +
                            Math.pow(event.pageY - event.y0, 2) | 0))
                        .toFixed(2) + 'px');
                }
            });

            function dragMoveListener(event) {
                var target = event.target;
                var x = (parseFloat(target.style.left) || 0) + event.dx;
                var y = (parseFloat(target.style.top) || 0) + event.dy;
            
                target.style.left = `${x}px`;
                target.style.top = `${y}px`;
            
                if(target.id) {
                    updateElement(target.id, { left: `${x}px`, top: `${y}px` });
                } else {
                    console.error('Dragged element has no id!', target);
                }
            }                  
    }, []);

    return (
        <div className="canvas" style={{ width: '100%', minHeight: '300px', position: 'relative', backgroundColor: '#f0f0f0' }}>
            {elements.map((el) => {
                const style = {
                    ...el.style,
                    position: 'absolute',
                    left: el.style.left,
                    top: el.style.top,
                };
                return <div key={el.id} id={el.id} className="draggable" style={style}>
                    {el.tag === 'img' ? (
                        <img src={el.attrs.src} alt={el.attrs.alt} />
                    ) : (
                        el.text
                    )}
                </div>;
            })}
        </div>
    );    
}

export default InteractiveCanvas;