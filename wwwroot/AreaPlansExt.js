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

const AreaPlansDefaultToolName = 'area-plans-default-tool';
const EDIT2D_EXT_ID = 'Autodesk.Edit2D';
const MODE_CHANGED_EVENT = 'modeChanged';

let domParser = null;

const parseSvgStyle = (svg) => {
    // init on first use
    domParser = domParser || new DOMParser();

    const dom = domParser.parseFromString(svg, 'application/xml');

    if (dom.childNodes.length !== 1) {
        throw 'Function does only support svg with a single element: path, circle';
    }

    const node = dom.firstChild;
    const attributes = node.attributes;

    let style = new Autodesk.Edit2D.Style();

    if (attributes.hasOwnProperty('fill'))
        style.fillColor = attributes.getNamedItem('fill').value;

    if (attributes.hasOwnProperty('fill-opacity')) {
        let fillAlpha = attributes.getNamedItem('fill-opacity').value;
        style.fillAlpha = fillAlpha != undefined ? parseFloat(fillAlpha) : 0.2;
    }

    if (attributes.hasOwnProperty('stroke'))
        style.lineColor = attributes.getNamedItem('stroke').value;

    if (attributes.hasOwnProperty('stroke-width')) {
        let lineWidth = attributes.getNamedItem('stroke-width').value;
        style.lineWidth = lineWidth != undefined ? parseFloat(lineWidth) : 3.0;
    }

    if (attributes.hasOwnProperty('stroke-opacity')) {
        let lineAlpha = attributes.getNamedItem('stroke-opacity').value;
        style.lineAlpha = lineAlpha != undefined ? parseFloat(lineAlpha) : 1.0;
    }    

    return style;
}

const loadCSS = (href) => new Promise(function (resolve, reject) {
    const el = document.createElement('link');
    el.rel = 'stylesheet';
    el.href = href;
    el.onload = resolve;
    el.onerror = reject;
    document.head.appendChild(el);
});

function initializeShapeWidget(scope) {
    /**
     * Toolbar button for area plan markup
     */
    class ShapeEditorWidgetButton extends Autodesk.Viewing.EventDispatcher {
        constructor(parent, iconClass) {
            super();

            // html content to be shown
            const _document = this.getDocument();
            const container = _document.createElement('button');
            const icon = _document.createElement('a');
            parent.container.appendChild(container);

            this.container = container;
            this.icon = icon;
            this.parent = parent;

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

        setIcon(iconClass) {
            if (this.iconClass)
                this.icon.classList.remove(this.iconClass);

            this.iconClass = iconClass;
            this.icon.classList.add(iconClass);
        }

        setDisabled(disable) {
            this.container.disabled = Boolean(disable);
        }
    }

    Autodesk.Viewing.GlobalManagerMixin.call(ShapeEditorWidgetButton.prototype);

    class ShapeEditorToolbarWidget {
        constructor(parent) {
            // Optional: Shift label by a couple of pixels.
            this.pixelOffset = new THREE.Vector2();
            this.boxSize = new THREE.Vector2();
            this.parent = parent;

            this.initialize();
        }

        get isVisible() {
            return this.container.style.display == 'block';
        }

        setVisible(visible) {
            visible = Boolean(visible)
            this.container.style.display = visible ? 'block' : 'none';

            if (!visible)
                Coloris.close();
        }

        #getShapeColor() {
            let rgbVals = this.parent.shape.style.fillColor.replace(/[^\d,]/g, '').split(',');
            let rgbAlphaVal = this.parent.shape.style.fillAlpha;
            let color = `rgba(${rgbVals.join(',')},${rgbAlphaVal})`;
            return color;
        }

        initialize() {
            const _document = this.getDocument();
            let container = _document.createElement('div');
            container.classList.add('edit2d-label');
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

            const colorPicker = _document.createElement('input');
            colorPicker.type = 'text';
            colorPicker.classList.add('edit2d-color-picker');
            colorPicker.value = this.#getShapeColor();
            this.container.appendChild(colorPicker);

            Coloris({
                el: '.edit2d-color-picker',
                theme: 'polaroid',
                //closeButton: true,
                focusInput: false,
                forceAlpha: true,
                format: 'rgb',
                swatches: [
                    'rgba(128,0,0,0.2)',
                    'rgba(0,128,0,0.2)',
                    'rgba(0,0,128,0.2)'
                ]
            });

            const confirmBtn = new ShapeEditorWidgetButton(this, 'fa-check');
            confirmBtn.addEventListener('click', () => {
                let pickedColorVals = colorPicker.value.replace(/[^\d.d,]/g, '').split(',');
                this.parent.shape.style.setFillColor(pickedColorVals[0], pickedColorVals[1], pickedColorVals[2]);
                this.parent.shape.style.fillAlpha = pickedColorVals[3];
                this.parent.layer.update();
                this.setVisible(false);
            });
            this.confirmButton = confirmBtn;

            const cancelBtn = new ShapeEditorWidgetButton(this, 'fa-times');
            cancelBtn.addEventListener('click', () => {
                let originalColor = this.#getShapeColor();
                colorPicker.value = originalColor;
                // colorPicker.style.color = originalColor;
                this.container.querySelector('.clr-field').style.color = originalColor;
                this.setVisible(false);
            });
            this.cancelButton = cancelBtn;

            //this.setVisible(true);
        }

        terminate() {
            if (!this.container)
                return;

            Coloris.close();

            delete this.confirmBtn;
            this.confirmBtn = null;

            delete this.cancelButton;
            this.cancelButton = null;

            this.container.parentElement.removeChild(this.container);
        }

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

    /**
     * Toolbar for area plan markup
     */
    class ShapeEditorWidget extends Autodesk.Edit2D.CanvasGizmo {
        constructor(shape, utilities) {
            let visible = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true; let className = arguments.length > 3 ? arguments[3] : undefined;
            super(utilities.layer, visible, className);

            // Use measure-tool styles by default
            this.container.classList.add('edit2d-label');
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

        initialize() {
            const toolbar = new ShapeEditorToolbarWidget(this);
            this.toolbar = toolbar;

            const colorPickerBtn = new ShapeEditorWidgetButton(this, 'fa-palette');
            colorPickerBtn.addEventListener('click', () => {
                toolbar.setVisible(true);
            });
            this.colorPickerButton = colorPickerBtn;

            const editBtn = new ShapeEditorWidgetButton(this, 'fa-pencil-alt');
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

            const deleteBtn = new ShapeEditorWidgetButton(this, 'fa-trash-alt');
            deleteBtn.addEventListener('click', () => {
                if (this.utilities.parentExtension.isCreating) {
                    this.utilities.defaultTools.polygonTool.cancelEdit(); //!<<< Prevent starting creating poly after clicking on `Delete`.
                }

                this.utilities.destroy(this.shape);
            });

            this.deleteButton = deleteBtn;
        }

        terminate() {
            if (!this.container)
                return;

            delete this.colorPickerButton;
            this.colorPickerButton = null;

            delete this.editButton;
            this.editButton = null;

            delete this.deleteButton;
            this.deleteButton = null;

            delete this.shape.editorWidget;
            this.shape.editorWidget = null;
            this.removeFromCanvas();
        }

        stopEditing(isStop) {
            this.editButton.setDisabled(isStop);
        }

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

        setShape(shape) {
            this.shape = shape;
            this.update();
        }
    }

    scope.ShapeEditorWidget = ShapeEditorWidget;
}

/**
 * Data Provider for CRUD markup data.
 */
class AreaPlansRemoteDataProvider {
    static async #fetch(uri, queries) {
        const url = new URL(`${document.location.protocol}//${document.location.host}${uri}`);

        if (queries)
            url.search = new URLSearchParams(queries);

        const resp = await fetch(url);
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const json = await resp.json();
        return json;
    }

    static async #post(url, data) {
        const resp = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: new Headers({ 'Content-Type': 'application/json' })
        });
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const json = await resp.json();
        return json;
    }

    static async #patch(url, data) {
        const resp = await fetch(url, {
            method: 'PATCH',
            body: JSON.stringify(data),
            headers: new Headers({ 'Content-Type': 'application/json' })
        });
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const json = await resp.json();
        return json;
    }

    static async #delete(url) {
        const resp = await fetch(url, {
            method: 'DELETE'
        });

        if (!resp.ok) {
            throw new Error(await resp.text());
        }
    }

    static async fetchMarkups(queries) {
        const json = await this.#fetch('/api/markups', queries);

        return json;
    }

    static async addMarkup(data) {
        const json = await this.#post('/api/markups', data);

        return json;
    }

    static async updateMarkup(id, data) {
        const json = await this.#patch(`/api/markups/${id}`, data);

        return json;
    }

    static async deleteMarkup(id) {
        await this.#delete(`/api/markups/${id}`);

        return true;
    }
}

/**
 * Utilities for manipulating Area Plan markups
 */
class AreaPlansUtilities {
    constructor() { }

    get #viewer() {
        return this.parentExtension.viewer;
    }

    get #edit2dExt() {
        return this.#viewer.getExtension(EDIT2D_EXT_ID);
    }

    get defaultTools() {
        return this.#edit2dExt?.defaultTools;
    }

    get context() {
        return this.#edit2dExt?.defaultContext;
    }

    get undoStack() {
        return this.context?.undoStack;
    }

    get layer() {
        return this.context?.layer;
    }

    get selection() {
        return this.context?.selection;
    }

    #onLayerClear = (event) => {
        if (!(event.action instanceof Autodesk.Edit2D.Actions.RemoveShapes) || !event.action.shapes)
            return;

        event.action.shapes.forEach(shape => this.detachEditorWidget(shape));
    };

    async initialize(parentExtension) {
        if (this.parentExtension) {
            delete this.parentExtension;
            this.parentExtension = null;
        }

        this.parentExtension = parentExtension;

        let ext = await this.#viewer.loadExtension(EDIT2D_EXT_ID);
        ext.registerDefaultTools();
        this.defaultTools.polygonEditTool.hoverEnabled = false; //!<<< Avoid incorrect hovering behavior while switching edit2d tools.

        initializeShapeWidget(globalThis);

        return true;
    }

    terminate() {
        this.clearLayer(false);

        if (this.defaultTools) {
            this.defaultTools.polygonEditTool.hoverEnabled = true; //!<<< restore
            let ext = this.#viewer.getExtension(EDIT2D_EXT_ID);
            ext.unregisterDefaultTools();
        }

        delete this.parentExtension;
        this.parentExtension = null;

        return true;
    }

    attachEditorWidget(shape) {
        if (!(shape instanceof Autodesk.Edit2D.Shape))
            throw 'Invalid Shape type';

        let isWidgetCreated = this.layer.canvasGizmos.some(gizmos => gizmos instanceof ShapeEditorWidget && (gizmos.shape.id == shape.id));
        if (isWidgetCreated)
            return;

        new ShapeEditorWidget(shape, this);
        //const editorWidget = new ShapeEditorWidget(shape, this);
        //this.layer.addCanvasGizmo(editorWidget);
        return true;
    }

    detachEditorWidget(shape) {
        if (!(shape instanceof Autodesk.Edit2D.Shape))
            throw 'Invalid Shape type';

        let { editorWidget } = shape;
        // this.layer.removeCanvasGizmo(editorWidget);
        editorWidget?.terminate();
        return true;
    }

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

    addShape(shape) {
        if (!(shape instanceof Autodesk.Edit2D.Shape))
            throw 'Invalid Shape type';

        this.context.addShape(shape);
    }

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

    removeShape(shape) {
        if (!(shape instanceof Autodesk.Edit2D.Shape))
            throw 'Invalid Shape type';

        this.context.removeShape(shape);
    }

    serialize(shape, exportStyle = true) {
        if (!(shape instanceof Autodesk.Edit2D.Shape))
            throw 'Invalid Shape type';

        return shape.toSVG({ exportStyle })
    }

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

    serializeAll(exportStyle = true) {
        return this.layer.shapes.map(shape => this.serialize(shape, exportStyle));
    }

    deserializeAll(svgPaths) {
        if (!svgPaths || svgPaths.length <= 0)
            throw 'Invalid SVG Path array';

        return svgPaths.map(deserialize);
    }

    /**
     * Disable selections on all shapes.
     */
    freezeShapes() {
        this.layer.shapes.forEach(shape => {
            shape.selectable = false;
        });
    }

    /**
     * Make shape selectable.
     * @param {string} shapeId 
     */
    thawShape(shapeId) {
        const shape = this.layer.shapes.find(shape => shape.id == shapeId);

        shape.selectable = true;
        return shape;
    }

    filterShapes(predate) {
        return this.layer.shapes.filter(predate);
    }

    findShapeById(shapeId) {
        return this.layer.findShapeById(shapeId);
    }

    editShape(shape) {
        if (!(shape instanceof Autodesk.Edit2D.Shape))
            throw 'Invalid Shape type';

        this.#viewer.toolController.setIsLocked(false);
        this.parentExtension.leaveViewingMode();
        this.parentExtension.enterEditMode();
        shape = this.thawShape(shape.id);
        this.select([shape]);
    }

    finishEditingShape() {
        this.#viewer.toolController.setIsLocked(false);
        this.parentExtension.leaveEditMode();
    }

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

    select(shapes) {
        this.selection.setSelection(shapes);
    }

    hover(shape) {
        this.selection.setHoveredId(shape ? shape.id : 0);
    }
}

/**
 * Default viewer tool providing markup-hovering only feature.
 */
class AreaPlansDefaultTool extends Autodesk.Viewing.ToolInterface {
    #utilities = null;
    #active = false;

    constructor(utilities) {
        super();

        this.names = [AreaPlansDefaultToolName];
        this.#utilities = utilities;
        this.#active = false;

        // Hack: delete functions defined *on the instance* of the tool.
        // We want the tool controller to call our class methods instead.
        delete this.register;
        delete this.deregister;
        delete this.activate;
        delete this.deactivate;
        delete this.handleMouseMove;
    }

    get layer() {
        return this.#utilities?.layer;
    }

    get selection() {
        return this.#utilities?.selection;
    }

    register() {
        console.log('AreaPlansDefaultTool registered.');
    }

    deregister() {
        console.log('AreaPlansDefaultTool unregistered.');
    }

    activate() {
        if (this.#active)
            return;

        this.reset();
        console.log('AreaPlansDefaultTool activated.');
        this.#active = true;
    }

    deactivate(name) {
        if (!this.#active)
            return;

        this.reset();
        console.log('AreaPlansDefaultTool deactivated.');
        this.#active = false;
    }

    reset() {
        this.#utilities.select();
        this.#utilities.freezeShapes();
    }

    handleMouseMove(event) {
        if (!this.#active)
            return false;

        const mousePos = this.layer.canvasToLayer(event.canvasX, event.canvasY);
        const shape = this.layer.hitTest(mousePos.x, mousePos.y);
        this.#utilities.hover(shape);
    }
}
/**
 * Area Plan Core extension
 */
class AreaPlansExtension extends Autodesk.Viewing.Extension {
    #isViewing = false;
    #isCreating = false;
    #isEditing = false;

    constructor(viewer, options) {
        super(viewer, options);
    }

    get #defaultTools() {
        return this.utilities?.defaultTools;
    }

    get isCreating() {
        return this.#isCreating;
    }

    get isEditing() {
        return this.#isEditing;
    }

    get isViewing() {
        return this.#isViewing;
    }

    #onShapeAdded = (event) => {
        if (!(event.action instanceof Autodesk.Edit2D.Actions.AddShape) || !event.action.shape)
            return;

        this.#attachEditorWidgetIfNotExist(event.action.shape);
    };

    #attachEditorWidgetIfNotExist = (shape) => {
        if (!(shape instanceof Autodesk.Edit2D.Shape))
            throw 'Invalid Shape type';

        let isWidgetCreated = this.utilities.layer.canvasGizmos.some(gizmos => gizmos instanceof ShapeEditorWidget && (gizmos.shape.id == shape.id));
        if (isWidgetCreated)
            return;

        this.utilities.attachEditorWidget(shape);
    }

    showEditorWidgets() {
        this.utilities.layer.shapes.forEach(shape => this.#attachEditorWidgetIfNotExist(shape));
    }

    hideEditorWidgets() {
        this.utilities.layer.shapes.forEach(shape => this.detachEditorWidget(shape));
    }

    enterCreateMode() {
        this.leaveViewingMode();
        this.utilities.changeTool(this.#defaultTools.polygonTool.getName());
        this.utilities.undoStack.addEventListener(
            Autodesk.Edit2D.UndoStack.AFTER_ACTION,
            this.#onShapeAdded
        );

        this.#isCreating = true;
        this.#isViewing = false;
        this.#isEditing = false;

        this.dispatchEvent({ type: MODE_CHANGED_EVENT, mode: 'create' });
    }

    leaveCreateMode() {
        this.utilities.undoStack.removeEventListener(
            Autodesk.Edit2D.UndoStack.AFTER_ACTION,
            this.#onShapeAdded
        );

        this.enterViewingMode();
        this.#isCreating = false;
    }

    enterEditMode() {
        this.leaveViewingMode();
        this.utilities.changeTool(this.#defaultTools.polygonEditTool.getName());
        this.#isEditing = true;
        this.#isCreating = false;
        this.#isViewing = false;

        this.dispatchEvent({ type: MODE_CHANGED_EVENT, mode: 'edit' });
    }

    leaveEditMode() {
        this.enterViewingMode();
        this.#isEditing = false;
    }

    enterViewingMode() {
        this.utilities.changeTool(this.viewingTool.getName());
        this.#isViewing = true;
        this.#isEditing = false;
        this.#isCreating = false;

        this.dispatchEvent({ type: MODE_CHANGED_EVENT, mode: 'viewing' });
    }

    leaveViewingMode() {
        let controller = this.viewer.toolController;
        let activeTool = controller.getActiveTool();
        let isAreaPlan = activeTool && activeTool.getName().startsWith(AreaPlansDefaultToolName);

        if (!isAreaPlan)
            return false;

        controller.deactivateTool(activeTool.getName());
        activeTool = null;
        this.#isViewing = false;

        return true;
    }

    toggleCreateMode() {
        if (this.#isCreating)
            return this.leaveCreateMode();

        this.enterCreateMode();
    }

    toggleEditMode() {
        if (this.#isEditing)
            return this.leaveEditMode();

        this.enterEditMode();
    }

    toggleViewingMode() {
        if (this.#isViewing)
            return this.leaveViewingMode();

        this.enterViewingMode();
    }

    clearLayer(enableUndo = true) {
        this.utilities.clearLayer(enableUndo);
        this.enterViewingMode();
    }

    async initialize() {
        await Promise.all([
            loadCSS('https://cdn.jsdelivr.net/gh/mdbassit/Coloris@latest/dist/coloris.min.css'),
            Autodesk.Viewing.Private.theResourceLoader.loadScript('https://cdn.jsdelivr.net/gh/mdbassit/Coloris@latest/dist/coloris.min.js')
        ]);

        const utilities = new AreaPlansUtilities();
        await utilities.initialize(this);
        this.utilities = utilities;

        const tool = new AreaPlansDefaultTool(utilities);
        this.viewer.toolController.registerTool(tool);
        this.viewingTool = tool;
    }

    terminate() {
        if (!this.viewingTool)
            return;

        this.viewer.toolController.deactivateTool(AreaPlansDefaultToolName);
        this.viewer.toolController.deregisterTool(this.viewingTool);
        delete this.viewingTool;
        this.viewingTool = null;

        this.utilities.terminate();
        delete this.utilities;
        this.utilities = null;

        this.#isCreating = false;
        this.#isEditing = false;
        this.#isViewing = false;
    }

    async loadMarkups() {
        this.utilities.clearLayer(false);

        let model = this.viewer.model;
        let modelUrn = model?.getData().urn;
        let modelGuid = model?.getDocumentNode().guid();
        let queries = {
            urn: modelUrn,
            guid: modelGuid
        };

        let markups = await AreaPlansRemoteDataProvider.fetchMarkups(queries);
        if (!markups || markups.length <= 0) return;

        markups.forEach(markup => {
            let shape = this.utilities.deserialize(markup.svg);
            shape.dbId = markup.id;
            shape.selectable = false;
        });
    }

    async reloadMarkups() {
        this.leaveCreateMode();
        this.clearLayer(false);
        await this.loadMarkups();
    }

    async #saveNewMarkups() {
        let model = this.viewer.model;
        let modelUrn = model?.getData().urn;
        let modelGuid = model?.getDocumentNode().guid();
        let newMarkups = this.utilities.filterShapes(shape => !shape.dbId);

        newMarkups.forEach(async markup => {
            try {
                let path = this.utilities.serialize(markup);
                let data = {
                    urn: modelUrn,
                    guid: modelGuid,
                    svg: path
                };

                let json = await AreaPlansRemoteDataProvider.addMarkup(data);
                markup.dbId = json.id;
            } catch (ex) {
                console.error(`Failed to save the markup`, markup, ex);
            }
        });
    }

    async #saveModifiedMarkups(remoteMarkups) {
        let remoteMarkupIds = remoteMarkups.map(markup => markup.id);
        // Find modified markups
        let modifiedMarkups = this.utilities.filterShapes(shape => shape.dbId && remoteMarkupIds.includes(shape.dbId))
            .filter(shape => {
                let remoteMarkup = remoteMarkups.find(markup => markup.id == shape.dbId);
                if (remoteMarkup) {
                    let path = this.utilities.serialize(shape);
                    if (remoteMarkup.svg != path) {
                        return true;
                    }
                }

                return false;
            });

        // Save modifications
        modifiedMarkups.forEach(async shape => {
            try {
                let path = this.utilities.serialize(shape);
                let dbId = shape.dbId;
                let data = remoteMarkups.find(markup => markup.id == dbId);
                data.svg = path;

                await AreaPlansRemoteDataProvider.updateMarkup(dbId, data);
            } catch (ex) {
                console.error(`Failed to update the markup with id: \`${shape.dbId}\``, shape, ex);
            }
        });
    }

    async #deleteMarkups(remoteMarkups) {
        let remoteMarkupIds = remoteMarkups.map(markup => markup.id);
        let localMarkupIds = this.utilities.filterShapes(shape => shape.dbId)
            .map(shape => shape.dbId);

        remoteMarkupIds.filter(remoteId => !localMarkupIds.includes(remoteId))
            .forEach(async dbId => {
                try {
                    await AreaPlansRemoteDataProvider.deleteMarkup(dbId);
                } catch (ex) {
                    console.error(`Failed to delete the markup with id: \`${dbId}\``, ex);
                }
            });
    }

    async saveChanges() {
        await this.#saveNewMarkups();

        let model = this.viewer.model;
        let modelUrn = model?.getData().urn;
        let modelGuid = model?.getDocumentNode().guid();
        let queries = {
            urn: modelUrn,
            guid: modelGuid
        };

        let remoteMarkups = await AreaPlansRemoteDataProvider.fetchMarkups(queries);
        if (remoteMarkups) {
            await this.#saveModifiedMarkups(remoteMarkups);
            await this.#deleteMarkups(remoteMarkups);
        }

        this.reloadMarkups();
    }

    // async deleteMarkup(shapeId) {
    //     let shape = this.utilities.findShapeById(shapeId);
    //     if (!shape)
    //         throw `Shape not found with given id \`${shapeId}\``;

    //     if (shape.dbId)
    //         await AreaPlansRemoteDataProvider.deleteMarkup(shape.dbId);

    //     this.utilities.destroy(shape);
    // }

    async load() {
        await this.initialize();

        await this.loadMarkups();
        return true;
    }

    unload() {
        this.terminate();
        return true;
    }
}

AutodeskNamespace('Autodesk.Das.AreaPlans');
Autodesk.Das.AreaPlans.AreaPlansExtension = AreaPlansExtension;
Autodesk.Das.AreaPlans.MODE_CHANGED_EVENT = MODE_CHANGED_EVENT;

Autodesk.Viewing.EventDispatcher.prototype.apply(AreaPlansExtension.prototype);
Autodesk.Viewing.theExtensionManager.registerExtension('Autodesk.Das.AreaPlansExtension', AreaPlansExtension);