import { useState, useRef } from "react";
import MonacoEditor from "@monaco-editor/react";
import { debounce } from 'lodash';

function Editor() {
    const [html, setHtml] = useState("<h1>Hello, World!</h1>");
    const [css, setCss] = useState("h1 { color: red; }");
    const [javascript, setJavascript] = useState(`
        console.log('Hello, World!');
        // Load interact.js from CDN
        var script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/interactjs/dist/interact.min.js';
        document.head.appendChild(script);
        script.onload = function() {
            // Initialize draggable and resizable on all elements except script, style, head, and body
            interact('body *:not(script):not(style):not(head):not(body)').draggable({
                onmove: function (event) {
                    var target = event.target,
                        // keep the dragged position in the data-x/data-y attributes
                        x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
                        y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                    // translate the element
                    target.style.transform = 'translate(' + x + 'px, ' + y + 'px)';

                    // update the position attributes
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);
                }
            }).resizable({
                edges: { left: true, right: true, bottom: true, top: true }
            }).on('resizemove', function (event) {
                var target = event.target,
                    x = (parseFloat(target.getAttribute('data-x')) || 0),
                    y = (parseFloat(target.getAttribute('data-y')) || 0);

                // update the element's style
                target.style.width  = event.rect.width + 'px';
                target.style.height = event.rect.height + 'px';

                // translate when resizing from top or left edges
                x += event.deltaRect.left;
                y += event.deltaRect.top;

                target.style.transform = 'translate(' + x + 'px,' + y + 'px)';

                target.setAttribute('data-x', x);
                target.setAttribute('data-y', y);
            });
        };
    `);
    const iframeRef = useRef(null);

    const updatePreview = debounce(() => {
        const srcdoc = `
            <html>
                <head>
                    <style>${css}</style>
                </head>
                <body>
                    ${html}
                    <script>${javascript}</script>
                </body>
            </html>
        `;
        if (iframeRef.current) {
            iframeRef.current.srcdoc = srcdoc;
        }
    }, 300);

    return (
        <div className="flex flex-col h-screen">
            <header className="flex justify-between bg-teal-400 p-4 text-white">
                <button className="mx-2">Export Code</button>
                <button className="mx-2">Save</button>
            </header>
            <div className="flex flex-grow overflow-hidden">
                <div className="w-1/3">
                    <MonacoEditor
                        height="100%"
                        language="html"
                        value={html}
                        onChange={(newHtml) => {
                            setHtml(newHtml);
                            updatePreview();
                        }}
                        theme="vs-dark"
                    />
                </div>
                <div className="w-1/3">
                    <MonacoEditor
                        height="100%"
                        language="css"
                        value={css}
                        onChange={(newCss) => {
                            setCss(newCss);
                            updatePreview();
                        }}
                        theme="vs-dark"
                    />
                </div>
                <div className="w-1/3">
                    <MonacoEditor
                        height="100%"
                        language="javascript"
                        value={javascript}
                        onChange={(newJavascript) => {
                            setJavascript(newJavascript);
                            updatePreview();
                        }}
                        theme="vs-dark"
                    />
                </div>
                <iframe
                    ref={iframeRef}
                    className="flex-grow"
                    style={{ border: 'none', height: '100%', width: '50%' }}
                    sandbox="allow-scripts"
                />
            </div>
        </div>
    );
}

export default Editor;