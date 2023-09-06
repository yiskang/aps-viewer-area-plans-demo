/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Developer Advocacy and Support
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

/// import * as Autodesk from "@types/forge-viewer";

/**
 * Toolbar button on `ShapeEditorWidget` for area plan markup
 * @extends Autodesk.Viewing.EventDispatcher
 * @fires MouseEvent - Will fire mouse click event
 */
export default class ShapeEditorWidgetButton extends Autodesk.Viewing.EventDispatcher {
    /**
     * ShapeEditorWidgetButton constructor
     * @param {HTMLDivElement} parentContainer - The parent container holding this button
     * @param {string} iconClass - The CSS class name for this button icon
     * @constructor
     */
    constructor(parentContainer, iconClass) {
        super();

        // html content to be shown
        const _document = this.getDocument();
        const container = _document.createElement('button');
        const icon = _document.createElement('a');
        parentContainer.appendChild(container);

        this.container = container;
        this.icon = icon;
        this.parentContainer = parentContainer;

        container.classList.add('edit2d-widget-btn');
        icon.classList.add('fa');
        container.appendChild(icon);
        this.setIcon(iconClass);

        container.onclick = (event) => {
            event.stopPropagation();
            event.preventDefault();

            this.fireEvent('click');
        };
    }

    /**
     * Set button icon class name
     * @param {string} iconClass - The CSS class name for this button icon
     */
    setIcon(iconClass) {
        if (this.iconClass)
            this.icon.classList.remove(this.iconClass);

        this.iconClass = iconClass;
        this.icon.classList.add(iconClass);
    }

    /**
     * Disable this button or not
     * @param {boolean} disable - True to disable this button
     */
    setDisabled(disable) {
        this.container.disabled = Boolean(disable);
    }
}

Autodesk.Viewing.GlobalManagerMixin.call(ShapeEditorWidgetButton.prototype);