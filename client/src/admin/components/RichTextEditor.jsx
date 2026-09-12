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
    // Loads the initial value through Quill's own clipboard API with a
    // "silent" source rather than a raw innerHTML assignment -- setting
    // innerHTML directly leaves Quill's internal Delta model out of sync,
    // so on its next update cycle Quill reconciles by re-emitting the
    // content as if the user had just typed it, firing a spurious
    // text-change that makes a freshly-loaded, untouched editor look dirty.
    quill.clipboard.dangerouslyPasteHTML(valueRef.current || "", "silent");
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
      quillRef.current.clipboard.dangerouslyPasteHTML(value || "", "silent");
      valueRef.current = value;
    }
  }, [value]);

  return <div className="amx-richtext" ref={wrapperRef} />;
}

export default RichTextEditor;
