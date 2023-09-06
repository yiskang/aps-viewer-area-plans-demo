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
import ShapeEditorToolbarWidget from './ShapeEditorToolbarWidget.js';

/**
 * Define ShapeEditorWidget class
 * @param {globalThis} scope 
 */
export function initializeShapeWidget(scope) {
    /**
     * Toolbar for area plan markup
     * @extends Autodesk.Edit2D.CanvasGizmo
     */
    class ShapeEditorWidget extends Autodesk.Edit2D.CanvasGizmo {
        /**
         * ShapeEditorWidget constructor
         * @param {Autodesk.Edit2D.Shape} shape - The Edit2D shape representing a area markup
         * @param {AreaPlansUtilities} utilities - The utilities for manipulating area markups
         * @constructor
         */
        constructor(shape, utilities) {
            let visible = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true; let className = arguments.length > 3 ? arguments[3] : undefined;
            super(utilities.layer, visible, className);

            // Use measure-tool styles by default
            this.container.classList.add('edit2d-widget');
            this.container.classList.add('visible');
            this.container.style.width = '100px';//'150px';
            this.container.style.height = '20px';
            this.container.style.pointerEvents = 'auto';

            shape.editorWidget = this;
            this.shape = shape;
            this.utilities = utilities;

            // Optional: Shift label by a couple of pixels.
            this.pixelOffset = new THREE.Vector2();
            this.boxSize = new THREE.Vector2();
            this.initialize();

            this.update();
        }

        /**
         * Initialize this widget
         */
        initialize() {
            const toolbar = new ShapeEditorToolbarWidget(this);
            this.toolbar = toolbar;

            const colorPickerBtn = new ShapeEditorWidgetButton(this.container, 'fa-palette');
            colorPickerBtn.addEventListener('click', () => {
                if (this.utilities.parentExtension.isCreating) {
                    this.utilities.defaultTools.polygonTool.cancelEdit(); //!<<< Prevent starting creating poly after clicking on `Delete`.
                }

                toolbar.setVisible(true);
            });
            this.colorPickerButton = colorPickerBtn;

            const editBtn = new ShapeEditorWidgetButton(this.container, 'fa-pencil-alt');
            editBtn.addEventListener('click', () => {
                let editorWidgets = this.utilities.layer.canvasGizmos.filter(gizmos => gizmos instanceof ShapeEditorWidget)
                    .filter(gizmos => gizmos.shape.id != this.shape.id);

                if (this.utilities.parentExtension.isEditing) {
                    this.utilities.finishEditingShape();
                    editBtn.setIcon('fa-pencil-alt');

                    editorWidgets.forEach(gizmos => gizmos.stopEditing(false));
                } else {
                    this.utilities.editShape(this.shape);
                    editBtn.setIcon('fa-save');

                    editorWidgets.forEach(gizmos => gizmos.stopEditing(true));
                }
            });

            this.editButton = editBtn;

            const deleteBtn = new ShapeEditorWidgetButton(this.container, 'fa-trash-alt');
            deleteBtn.addEventListener('click', () => {
                if (this.utilities.parentExtension.isCreating) {
                    this.utilities.defaultTools.polygonTool.cancelEdit(); //!<<< Prevent starting creating poly after clicking on `Delete`.
                }

                this.utilities.destroy(this.shape);
            });

            this.deleteButton = deleteBtn;
        }

        /**
         * Terminate this widget and remove it from viewer canvas
         */
        terminate() {
            if (!this.container)
                return;

            delete this.colorPickerButton;
            this.colorPickerButton = null;

            delete this.editButton;
            this.editButton = null;

            delete this.deleteButton;
            this.deleteButton = null;

            this.toolbar.terminate();
            delete this.toolbar;
            this.toolbar = null;

            delete this.shape.editorWidget;
            this.shape.editorWidget = null;
            this.removeFromCanvas();
        }

        /**
         * Disable the edit button on this widget to ensure only allow editing one area markup at once
         * @param {boolean} isStop - True to disable the edit button on this widget
         */
        stopEditing(isStop) {
            this.editButton.setDisabled(isStop);
        }

        /**
         * Update widget visibility and position on viewer canvas, which is called by Edit2D
         */
        update() {
            if (this.shape) {
                // Set it to visible (in case polygon was null before)
                this.container.style.visibility = 'visible';

                this.shape.computeBBox();
                this.shape.bbox.getCenter(this.layerPos);
                this.shape.bbox.getSize(this.boxSize);

                this.layerPos.x += this.boxSize.x / 2;
                this.layerPos.y -= this.boxSize.y / 8; //!<<< Avoid overlap the right edge gizmos.

                // Optional: Shift by a few pixels
                if (this.pixelOffset) {
                    const toUnits = this.layer.getUnitsPerPixel();
                    const shiftX = this.pixelOffset.x * toUnits;
                    const shiftY = this.pixelOffset.y * toUnits;
                    this.layerPos.x += shiftX;
                    this.layerPos.y += shiftY;
                }

                super.update();
                this.toolbar.update();
            } else {
                this.container.style.visibility = 'hidden';
            }
        }

        /**
         * Change area markup to others
         * @param {Autodesk.Edit2D.Shape} shape - The Edit2D shape representing a area markup
         */
        setShape(shape) {
            this.shape = shape;
            this.update();
        }
    }

    scope.ShapeEditorWidget = ShapeEditorWidget;
}