import React, { useState, useEffect } from 'react';
import interact from 'interactjs';
import axios from 'axios';

const AlignmentMarkers = ({ target, canvasRect }) => {
  if (!target) return null;

  const targetRect = target.getBoundingClientRect();

  const lineStyle = {
    position: 'absolute',
    borderStyle: 'dashed',
    borderColor: '#000',
  };

  return (
    <>
      <div style={{ ...lineStyle, top: targetRect.top - canvasRect.top, left: 0, width: '100%', borderTopWidth: 1 }}></div>
      <div style={{ ...lineStyle, top: targetRect.bottom - canvasRect.top, left: 0, width: '100%', borderTopWidth: 1 }}></div>
      <div style={{ ...lineStyle, top: 0, left: targetRect.left - canvasRect.left, height: '100%', borderLeftWidth: 1 }}></div>
      <div style={{ ...lineStyle, top: 0, left: targetRect.right - canvasRect.left, height: '100%', borderLeftWidth: 1 }}></div>
    </>
  );
};

function InteractiveCanvas({ elements, updateElement, onSelect }) {
  const [selectedElement, setSelectedElement] = useState(null);
  const [canvasRect, setCanvasRect] = useState({});

  useEffect(() => {
    console.log('InteractiveCanvas elements:', elements); // Debug log

    const dragMoveListener = (event) => {
      const target = event.target;
      const sensitivity = 0.5; // Adjust this value to change sensitivity (lower = less sensitive)
      const x = (parseFloat(target.style.left) || 0) + event.dx * sensitivity;
      const y = (parseFloat(target.style.top) || 0) + event.dy * sensitivity;

      target.style.left = `${x}px`;
      target.style.top = `${y}px`;

      if (target.id) {
        updateElement(target.id, { left: `${x}px`, top: `${y}px` });
      } else {
        console.error('Dragged element has no id!', target);
      }
    };

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
        onend: (event) => {
          const textEl = event.target.querySelector('p');
          if (textEl) {
            textEl.textContent = `moved a distance of ${
              (Math.sqrt(Math.pow(event.pageX - event.x0, 2) + Math.pow(event.pageY - event.y0, 2)) || 0).toFixed(2)
            }px`;
          }
        },
      });

  }, [updateElement, elements]);

  const handleElementClick = (element) => {
    setSelectedElement(document.getElementById(element.id));
    setCanvasRect(document.querySelector('.canvas').getBoundingClientRect());
    onSelect(element);
  };

  useEffect(() => {
    const updateStyles = () => {
      const styles = elements.map(el => `#${el.id} { left: ${el.style.left}; top: ${el.style.top}; position: ${el.style.position}; }`).join('\n');
      axios.post('http://localhost:1000/save-styles', { styles })
        .then(() => console.log('Styles updated successfully'))
        .catch(err => console.error('Failed to update styles:', err));
    };

    const interval = setInterval(updateStyles, 5000); // Adjust the interval as needed

    return () => clearInterval(interval);
  }, [elements]);

  return (
    <div
      className="canvas"
      style={{
        width: '100%',
        minHeight: '90%',
        position: 'relative',
        backgroundColor: '#ffffff',
      }}
    >
      {elements.map((el) => (
        <div
          key={el.id}
          id={el.id}
          className="draggable"
          style={{ ...el.style, position: 'absolute' }}
          onClick={() => handleElementClick(el)}
        >
          {el.tag === 'img' ? (
            <img src={el.attrs.src} alt={el.attrs.alt} />
          ) : (
            el.text
          )}
        </div>
      ))}
      <AlignmentMarkers target={selectedElement} canvasRect={canvasRect} />
    </div>
  );
}

export default InteractiveCanvas;