import React, { useEffect, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

const TOOLBAR = [
  [{ header: [2, 3, false] }],
  ["bold", "italic", "underline"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["link"],
  ["clean"],
];

// Quill owns its own DOM (a toolbar + a contenteditable root) imperatively,
// which doesn't play well with React reconciling the same nodes — so this
// mounts Quill onto a plain child div that React never re-renders into, and
// tears the whole thing down on cleanup rather than leaving stale toolbar
// nodes behind (StrictMode runs this effect's mount/cleanup twice in dev).
function RichTextEditor({ value, onChange, direction = "ltr", placeholder }) {
  const wrapperRef = useRef(null);
  const quillRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valueRef = useRef(value);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const editorEl = document.createElement("div");
    wrapper.appendChild(editorEl);

    const quill = new Quill(editorEl, {
      theme: "snow",
      placeholder,
      modules: { toolbar: TOOLBAR },
    });
    quill.root.innerHTML = valueRef.current || "";
    quill.root.setAttribute("dir", direction);
    quill.on("text-change", () => {
      const html = quill.root.innerHTML;
      valueRef.current = html;
      onChangeRef.current(html);
    });
    quillRef.current = quill;

    return () => {
      quillRef.current = null;
      wrapper.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    quillRef.current?.root.setAttribute("dir", direction);
  }, [direction]);

  useEffect(() => {
    if (quillRef.current && value !== valueRef.current) {
      quillRef.current.root.innerHTML = value || "";
      valueRef.current = value;
    }
  }, [value]);

  return <div className="amx-richtext" ref={wrapperRef} />;
}

export default RichTextEditor;
