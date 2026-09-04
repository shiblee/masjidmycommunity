import React, { useRef } from "react";
import { useLocation } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import TestimonialsPanel from "./TestimonialManagement.jsx";
import SuccessStoriesPanel from "./SuccessStoryManagement.jsx";

// Which panel renders is derived from the route rather than local-only
// useState, since the "Testimonials & Stories" nav dropdown (AdminLayout.jsx)
// is the only way to switch between them — deep-linking to either route
// lands directly on the right panel, and back/forward work correctly.
function TestimonialsAndStories() {
  const { pathname } = useLocation();
  const onStories = pathname.endsWith("/success-stories");
  const panelRef = useRef(null);

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Administration</span>
          <h1>{onStories ? "Success Stories" : "Testimonials"}</h1>
          <p>{onStories ? "Manage the stories shown on the public Success Stories page" : "Manage the testimonials shown on the public Testimonials page"}</p>
        </div>
        <div className="amx-page-actions">
          <button className="amx-btn amx-btn-primary" onClick={() => panelRef.current?.openAdd()}>
            <Icon name="plus" size={15} /> {onStories ? "Add Success Story" : "Add Testimonial"}
          </button>
        </div>
      </div>

      {onStories ? <SuccessStoriesPanel ref={panelRef} /> : <TestimonialsPanel ref={panelRef} />}
    </>
  );
}

export default TestimonialsAndStories;
