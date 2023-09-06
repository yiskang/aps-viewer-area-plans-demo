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

import ShapeEditorWidgetButton from './ShapeEditorWidgetButton.js';

/**
 * Sub-Toolbar of `ShapeEditorWidget`
 */
export default class ShapeEditorToolbarWidget {
    /**
     * ShapeEditorToolbarWidget constructor
     * @param {ShapeEditorWidget} parent - Toolbar for area plan markup
     * @constructor
     */
    constructor(parent) {
        // Optional: Shift label by a couple of pixels.
        this.pixelOffset = new THREE.Vector2();
        this.boxSize = new THREE.Vector2();
        this.parent = parent;

        this.initialize();
    }

    /**
     * If this widget is visible on viewer canvas
     * @type {boolean}
     */
    get isVisible() {
        return this.container.style.display == 'block';
    }

    /**
     * Set widget visibility
     * @param {boolean} visible - True to make this widget visible on viewer canvas
     */
    setVisible(visible) {
        visible = Boolean(visible)
        this.container.style.display = visible ? 'block' : 'none';

        if (!visible)
            this.colorPicker && this.colorPicker.hide();
    }

    #getShapeColor() {
        let rgbVals = this.parent.shape.style.fillColor.replace(/[^\d,]/g, '').split(',');
        let rgbAlphaVal = this.parent.shape.style.fillAlpha;
        let color = `rgba(${rgbVals.join(',')},${rgbAlphaVal})`;
        return color;
    }

    /**
     * Initialize this widget
     */
    initialize() {
        const _document = this.getDocument();
        let container = _document.createElement('div');
        container.classList.add('edit2d-widget');
        container.classList.add('edit2d-toolbar-widget');
        container.style.width = '100px';//'150px';
        container.style.height = '20px';
        container.style.paddingTop = '5px';
        container.style.zIndex = '1';
        container.style.pointerEvents = 'auto';
        container.style.borderRadius = '0 0 8px 8px';
        this.parent.layer.viewer.container.appendChild(container);
        this.container = container;

        this.setVisible(false);

        const contentWrapper = _document.createElement('div');
        this.container.appendChild(contentWrapper);

        const colorPickerContainer = _document.createElement('div');
        colorPickerContainer.classList.add('edit2d-color-picker');
        contentWrapper.appendChild(colorPickerContainer);

        const colorPicker = new Pickr({
            el: colorPickerContainer,
            theme: 'nano',
            defaultRepresentation: 'RGBA',
            default: this.#getShapeColor(),
            swatches: [
                'rgba(128,0,0,0.2)',
                'rgba(0,128,0,0.2)',
                'rgba(0,0,128,0.2)'
            ],
            components: {
                // Main components
                preview: true,
                opacity: true,
                hue: true,
                // Input / output Options
                interaction: {
                    input: true,
                    // save: true
                }
            }
        });
        colorPicker.on('change', (color, source, instance) => {
            colorPicker.applyColor();
        });
        this.colorPicker = colorPicker;

        const confirmBtn = new ShapeEditorWidgetButton(contentWrapper, 'fa-check');
        confirmBtn.addEventListener('click', () => {
            let pickedColor = this.colorPicker.getColor().toRGBA();
            this.parent.shape.style.setFillColor(pickedColor[0], pickedColor[1], pickedColor[2]);
            this.parent.shape.style.fillAlpha = pickedColor[3];
            this.parent.layer.update();
            this.setVisible(false);
        });
        this.confirmButton = confirmBtn;

        const cancelBtn = new ShapeEditorWidgetButton(contentWrapper, 'fa-times');
        cancelBtn.addEventListener('click', () => {
            let originalColor = this.#getShapeColor();
            this.colorPicker.setColor(originalColor);
            this.setVisible(false);
        });
        this.cancelButton = cancelBtn;
    }

    /**
     * Terminate this widget and remove it from viewer canvas
     */
    terminate() {
        if (!this.container)
            return;

        if (this.colorPicker) {
            this.colorPicker.destroyAndRemove();
            delete this.colorPicker;
            this.colorPicker = null;
        }

        delete this.confirmBtn;
        this.confirmBtn = null;

        delete this.cancelButton;
        this.cancelButton = null;

        this.container.parentElement.removeChild(this.container);
    }

    /**
     * Update widget visibility and position on viewer canvas, which is called by `ShapeEditorWidget`
     */
    update() {
        const p = this.parent.canvasPos;
        const style = this.container.style;

        // Choose translation offset in % based on X-alignment
        let tx;
        switch (this.parent.alignX) {
            case Autodesk.Edit2D.AlignX.Left: tx = '0%'; break;
            case Autodesk.Edit2D.AlignX.Center: tx = '-50%'; break;
            case Autodesk.Edit2D.AlignX.Right: tx = '-100%'; break;
        }


        let ty;
        switch (this.parent.alignY) {
            case Autodesk.Edit2D.AlignY.Top: ty = '0%'; break;
            case Autodesk.Edit2D.AlignY.Center: ty = '-50%'; break;
            case Autodesk.Edit2D.AlignY.Bottom: ty = '-100%'; break;
        }

        const left = `${p.x}px`;
        const top = `calc(${p.y + 2}px + ${this.parent.container.style.height})`;

        style.transform = `translate(${left}, ${top}) translate(${tx}, ${ty}) rotate(${this.parent.angle}deg)`;
    }
}

Autodesk.Viewing.GlobalManagerMixin.call(ShapeEditorToolbarWidget.prototype);