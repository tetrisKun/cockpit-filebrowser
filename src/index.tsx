import React from 'react';
import { createRoot } from 'react-dom/client';

import "cockpit-dark-theme";
import { Application } from './app';
import "patternfly/patternfly-6-cockpit.scss";
import './app.scss';

document.addEventListener("DOMContentLoaded", () => {
    // Set lang attribute from Cockpit locale to suppress Chrome translate prompt
    const lang = document.cookie.replace(/(?:(?:^|.*;\s*)CockpitLang\s*=\s*([^;]*).*$)|^.*$/, "$1")
        || navigator.language || "en";
    document.documentElement.lang = lang;

    createRoot(document.getElementById("app")!).render(<Application />);
});
