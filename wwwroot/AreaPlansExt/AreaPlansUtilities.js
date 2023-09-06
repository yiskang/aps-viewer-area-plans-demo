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

import { EDIT2D_EXT_ID } from './globals.js';
import { initializeShapeWidget } from './UI/ShapeEditorWidget.js';
import { parseSvgStyle } from './utils.js';

/**
 * Utilities for manipulating area markups
 * @class
 */
export default class AreaPlansUtilities {
    /**
     * AreaPlansUtilities constructor
     * @constructor
     */
    constructor() {
        /**
         * Added shape editor widgets
         * @type {ShapeEditorWidget[]}
         * @private
         */
        this.editorWidgets = [];
    }

    get #viewer() {
        return this.parentExtension.viewer;
    }

    get #edit2dExt() {
        return this.#viewer.getExtension(EDIT2D_EXT_ID);
    }

    /**
     * The default tool set of Edit2D
     * @type {object[]}
     */
    get defaultTools() {
        return this.#edit2dExt?.defaultTools;
    }

    /**
     * @type {Autodesk.Edit2D.Edit2DContext}
     */
    get context() {
        return this.#edit2dExt?.defaultContext;
    }

    /**
     * @type {Autodesk.Edit2D.UndoStack}
     */
    get undoStack() {
        return this.context?.undoStack;
    }

    /**
     * @type {Autodesk.Edit2D.EditLayer}
     */
    get layer() {
        return this.context?.layer;
    }

    /**
     * @type {Autodesk.Edit2D.Selection}
     */
    get selection() {
        return this.context?.selection;
    }

    #onLayerClear = (event) => {
        if (!(event.action instanceof Autodesk.Edit2D.Actions.RemoveShapes) || !event.action.shapes)
            return;

        event.action.shapes.forEach(shape => this.detachEditorWidget(shape));
    };

    /**
     * Clear and delete added shape editor widgets
     */
    #terminateAllEditorWidgets() {
        while (this.editorWidgets.length > 0) {
            let editorWidget = this.editorWidgets.pop();
            editorWidget?.terminate();
        }
    }

    /**
     * Initialize this utilities
     * @param {AreaPlansExtension} parentExtension - The AreaPlansExtension.
     * @returns {Promise<boolean>} True if the initialization is successful.
     */
    async initialize(parentExtension) {
        if (this.parentExtension) {
            delete this.parentExtension;
            this.parentExtension = null;
        }

        /**
         * The AreaPlansExtension
         * @type {AreaPlansExtension}
         */
        this.parentExtension = parentExtension;

        let ext = await this.#viewer.loadExtension(EDIT2D_EXT_ID);
        ext.registerDefaultTools();
        this.defaultTools.polygonEditTool.hoverEnabled = false; //!<<< Avoid incorrect hovering behavior while switching edit2d tools.

        initializeShapeWidget(globalThis);

        return true;
    }

    /**
     * Terminate this utilities. It will clear Edit2D layer, unregister Edit2D tools and terminate all added shape editor widgets
     * @returns {boolean} True if the termination is successful
     */
    terminate() {
        this.clearLayer(false);

        this.#terminateAllEditorWidgets();

        if (this.defaultTools) {
            this.defaultTools.polygonEditTool.hoverEnabled = true; //!<<< restore
            let ext = this.#viewer.getExtension(EDIT2D_EXT_ID);
            ext.unregisterDefaultTools();
        }

        delete this.parentExtension;
        this.parentExtension = null;

        return true;
    }

    /**
     * Create a shape editor widget for given area markup
     * @param {Autodesk.Edit2D.Shape} shape - The Edit2D shape representing a area markup
     * @returns {boolean} True if the shape editor widget has been added to the area markup. Otherwise, False when there is an shape editor widget for given area markup
     * @throws Will throw an error if the given shape is not an instance of {@link Autodesk.Edit2D.Shape}
     */
    attachEditorWidget(shape) {
        if (!(shape instanceof Autodesk.Edit2D.Shape))
            throw 'Invalid Shape type';

        let isWidgetCreated = this.layer.canvasGizmos.some(gizmos => gizmos instanceof ShapeEditorWidget && (gizmos.shape.id == shape.id));
        if (isWidgetCreated)
            return false;

        const editorWidget = new ShapeEditorWidget(shape, this);
        //this.layer.addCanvasGizmo(editorWidget);
        this.editorWidgets.push(editorWidget);

        return true;
    }

    /**
     * Remove shape editor widget from the given area markup
     * @param {Autodesk.Edit2D.Shape} shape - The Edit2D shape representing a area markup
     * @returns {boolean} True if the shape editor widget has been removed from the area markup
     * @throws Will throw an error if the given shape is not an instance of {@link Autodesk.Edit2D.Shape}
     */
    detachEditorWidget(shape) {
        if (!(shape instanceof Autodesk.Edit2D.Shape))
            throw 'Invalid Shape type';

        let { editorWidget } = shape;
        const index = this.editorWidgets.indexOf(editorWidget);

        if (index === -1) {
            return false;
        }
        this.editorWidgets.splice(index, 1);

        // this.layer.removeCanvasGizmo(editorWidget);
        editorWidget?.terminate();

        return true;
    }

    /**
     * Change viewer default tool
     * @param {string} toolName - Name of Edit2D tool
     * @returns {boolean} True if viewer default tool has been changed to the given tool name. Otherwise, False when there is no tool named with the given name
     */
    changeTool(toolName) {
        let controller = this.#viewer.toolController;

        // Check if currently active tool is from Edit2D
        let activeTool = controller.getActiveTool();
        let isEdit2D = activeTool && activeTool.getName().startsWith("Edit2");

        // deactivate any previous edit2d tool
        if (isEdit2D) {
            controller.deactivateTool(activeTool.getName());
            activeTool = null;
        }

        // stop editing tools
        if (!toolName) {
            return false;
        }

        let result = controller.activateTool(toolName);

        return result;
    }

    /**
     * Clear all area markups on the current viewer canvas
     * @param {boolean} [enableUndo=true] - True to allow undo/redo the clear action.
     */
    clearLayer(enableUndo = true) {
        this.undoStack?.addEventListener(
            Autodesk.Edit2D.UndoStack.AFTER_ACTION,
            this.#onLayerClear
        );

        this.context?.clearLayer(true);

        this.undoStack?.removeEventListener(
            Autodesk.Edit2D.UndoStack.AFTER_ACTION,
            this.#onLayerClear
        );

        if (!enableUndo)
            this.undoStack?.clear();
    }

    /**
     * Add an area markup to current viewer canvas
     * @param {Autodesk.Edit2D.Shape} shape - The Edit2D shape representing a area markup
     * @throws Will throw an error if the given shape is not an instance of {@link Autodesk.Edit2D.Shape}
     */
    addShape(shape) {
        if (!(shape instanceof Autodesk.Edit2D.Shape))
            throw 'Invalid Shape type';

        this.context.addShape(shape);
    }

    /**
     * Add a set of area markups to current viewer canvas
     * @param {Autodesk.Edit2D.Shape[]} shapes - The Edit2D shapes representing area markups
     */
    addShapes(shapes) {
        try {
            shapes = shapes || [];

            shapes.forEach(shape => this.addShape(shape));
        } catch (ex) {
            console.error('Failed to add shapes', ex);
        } finally {
            this.#edit2dExt?.undoStack.clear();
        }
    }

    /**
     * Remove the area markup from current viewer canvas
     * @param {Autodesk.Edit2D.Shape} shape - The Edit2D shape representing a area markup
     * @throws Will throw an error if the given shape is not an instance of {@link Autodesk.Edit2D.Shape}
     */
    removeShape(shape) {
        if (!(shape instanceof Autodesk.Edit2D.Shape))
            throw 'Invalid Shape type';

        this.context.removeShape(shape);
    }

    /**
     * Convert the given area markup to SVG data string
     * @param {Autodesk.Edit2D.Shape} shape - The Edit2D shape representing a area markup
     * @param {boolean} [exportStyle=true] - True to convert the area markup to SVG data string
     * @returns {string} A SVG data string representing the given area markup
     */
    serialize(shape, exportStyle = true) {
        if (!(shape instanceof Autodesk.Edit2D.Shape))
            throw 'Invalid Shape type';

        return shape.toSVG({ exportStyle })
    }

    /**
     * Create a Edit2D shape from given SVG data string
     * @param {string} svg - A SVG data string representing the area markup
     * @returns {Autodesk.Edit2D.Path} The Edit2D shape representing a area markup. Both `Autodesk.Edit2D.Path` and `Autodesk.Edit2D.Polygon` are a type of Edit2D polygon.
     */
    deserialize(svg) {
        if (!svg || (typeof svg !== 'string'))
            throw 'Invalid SVG Path';

        let shape = Autodesk.Edit2D.Shape.fromSVG(svg);
        let style = parseSvgStyle(svg); //!<<< Parse styles from SVG attributes since Edit2D skip this part.

        shape.style.lineColor = style.lineColor;
        shape.style.lineAlpha = style.lineAlpha;
        shape.style.lineWidth = style.lineWidth;
        shape.style.fillColor = style.fillColor;
        shape.style.fillAlpha = style.fillAlpha;

        shape.updateBBox();

        this.addShape(shape);
        return shape;
    }

    /**
     * Convert existing area markups to SVG data strings
     * @param {boolean} [exportStyle=true] - True to convert the area markup to SVG data string
     * @returns {string[]} SVG data strings representing the existing area markups on viewer canvas
     */
    serializeAll(exportStyle = true) {
        return this.layer.shapes.map(shape => this.serialize(shape, exportStyle));
    }

    /**
     * Create Edit2D shapes from given SVG data string
     * @param {string[]} svgPaths - A set of SVG data strings representing the area markups
     * @returns {Autodesk.Edit2D.Path[]} A set of Edit2D shapes representing area markups converted from the given SVG data strings. Both `Autodesk.Edit2D.Path` and `Autodesk.Edit2D.Polygon` are a type of Edit2D polygon.
     */
    deserializeAll(svgPaths) {
        if (!svgPaths || svgPaths.length <= 0)
            throw 'Invalid SVG Path array';

        return svgPaths.map(deserialize);
    }

    /**
     * Disable selections on all area markups
     */
    freezeShapes() {
        this.layer.shapes.forEach(shape => {
            shape.selectable = false;
        });
    }

    /**
     * Make area markup selectable by given id
     * @param {string} shapeId - The ID of Edit2D Shape
     * @returns {Autodesk.Edit2D.Shape} The Edit2D shape representing a area markup
     */
    thawShape(shapeId) {
        const shape = this.layer.shapes.find(shape => shape.id == shapeId);

        shape.selectable = true;
        return shape;
    }

    /**
     * Filter area markups by given Predation function
     * @param {(shape: Autodesk.Edit2D.Shape) => boolean} predate - Predation function as filter condition
     * @returns {Autodesk.Edit2D.Shape[]} Area markup matched given Predation function
     */
    filterShapes(predate) {
        return this.layer.shapes.filter(predate);
    }

    /**
     * Find area markup by given id
     * @param {int} shapeId The ID of Edit2D Shape
     * @returns {Autodesk.Edit2D.Shape} The Edit2D shape representing a area markup
     */
    findShapeById(shapeId) {
        return this.layer.findShapeById(shapeId);
    }

    /**
     * Edit the given area markup. It will enter editing mode and make the markup selectable and select it.
     * @param {Autodesk.Edit2D.Shape} shape - The Edit2D shape representing a area markup
     */
    editShape(shape) {
        if (!(shape instanceof Autodesk.Edit2D.Shape))
            throw 'Invalid Shape type';

        this.#viewer.toolController.setIsLocked(false);
        this.parentExtension.leaveViewingMode();
        this.parentExtension.enterEditMode();
        shape = this.thawShape(shape.id);
        this.select([shape]);
    }

    /**
     * Finish editing an area markup and will enter viewing mode.
     */
    finishEditingShape() {
        this.#viewer.toolController.setIsLocked(false);
        this.parentExtension.leaveEditMode();
    }

    /**
     * Remove the given area markup from viewer canvas and will enter viewing mode.
     * @param {Autodesk.Edit2D.Shape} shape - The Edit2D shape representing a area markup
     */
    destroy(shape) {
        if (!(shape instanceof Autodesk.Edit2D.Shape))
            throw 'Invalid Shape type';

        this.detachEditorWidget(shape);
        this.removeShape(shape);

        // Leave edit mode immediately if ext is under editing mode
        if (this.parentExtension.isEditing) {
            this.#viewer.toolController.setIsLocked(false);
            this.parentExtension.leaveEditMode();
        }
    }

    /**
     * Select given area markup. Note. Must enter edit mode (see: {@link AreaPlansExtension#enterEditMode}) and make the area markup selectable first (see: {@link AreaPlansUtilities#thawShape})
     * @param {Autodesk.Edit2D.Shape[]} shapes - The Edit2D shapes representing area markups
     */
    select(shapes) {
        this.selection.setSelection(shapes);
    }

    /**
     * Highlight given area markup. Note. This is not allowed in the edit mode.
     * @param {Autodesk.Edit2D.Shape} shape - The Edit2D shape representing a area markup
     */
    hover(shape) {
        this.selection.setHoveredId(shape ? shape.id : 0);
    }
}