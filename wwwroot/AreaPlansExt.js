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

function initializeShapeWidget(scope) {
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

            container.classList.add('btn');
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
    }

    Autodesk.Viewing.GlobalManagerMixin.call(ShapeEditorWidgetButton.prototype);

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
            // this.container.appendChild(btn1);
            const editBtn = new ShapeEditorWidgetButton(this, 'fa-pencil-alt');
            editBtn.addEventListener('click', () => {
                if (this.utilities.parentExtension.isEditing) {
                    this.utilities.finishEditingShape();
                    editBtn.setIcon('fa-pencil-alt');
                } else {
                    this.utilities.editShape(this.shape);
                    editBtn.setIcon('fa-save');
                }
            });

            const deleteBtn = new ShapeEditorWidgetButton(this, 'fa-trash-alt');
            deleteBtn.addEventListener('click', () => {
                this.utilities.destroy(this.shape);
            });
        }

        terminate() {
            if (!this.container)
                return;

            delete this.shape.editorWidget;
            this.shape.editorWidget = null;

            // while (this.container.firstChild) {
            //     this.container.removeChild(this.container.firstChild);
            // }
            // this.container.parentElement.removeChild(this.container);
            // delete this.container;
            // this.container = null;
            this.removeFromCanvas();
        }

        update() {
            if (this.shape) {
                // Set it to visible (in case polygon was null before)
                this.container.style.visibility = 'visible';

                this.shape.computeBBox();
                this.shape.bbox.getCenter(this.layerPos);
                this.shape.bbox.getSize(this.boxSize);

                this.layerPos.x += this.boxSize.x / 2;

                // Optional: Shift by a few pixels
                if (this.pixelOffset) {
                    const toUnits = this.layer.getUnitsPerPixel();
                    const shiftX = this.pixelOffset.x * toUnits;
                    const shiftY = this.pixelOffset.y * toUnits;
                    this.layerPos.x += shiftX;
                    this.layerPos.y += shiftY;
                }

                super.update();
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

    async initialize(parentExtension) {
        if (this.parentExtension) {
            delete this.parentExtension;
            this.parentExtension = null;
        }

        this.parentExtension = parentExtension;

        let ext = await this.#viewer.loadExtension(EDIT2D_EXT_ID);
        ext.registerDefaultTools();
        initializeShapeWidget(globalThis);

        return true;
    }

    terminate() {
        let ext = this.#viewer.getExtension(EDIT2D_EXT_ID);
        ext.unregisterDefaultTools();

        delete this.parentExtension;
        this.parentExtension = null;

        return true;
    }

    attachEditorWidget(shape) {
        if (!(shape instanceof Autodesk.Edit2D.Shape))
            throw 'Invalid Shape type';

        const editorWidget = new ShapeEditorWidget(shape, this);
        this.layer.addCanvasGizmo(editorWidget);
    }

    detachEditorWidget(shape) {
        if (!(shape instanceof Autodesk.Edit2D.Shape))
            throw 'Invalid Shape type';

        let { editorWidget } = shape;
        // this.layer.removeCanvasGizmo(editorWidget);
        editorWidget.terminate();
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
        this.context?.clearLayer(enableUndo);
    }

    addShape(shape) {
        if (!(shape instanceof Autodesk.Edit2D.Shape))
            throw 'Invalid Shape type';

        this.context.addShape(shape);
    }

    addShapes(shapes) {
        try {
            shapes = shapes || [];

            shapes.forEach(addShape);
        } catch {

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
            throw 'Invalid SVG';

        let shape = Autodesk.Edit2D.Shape.fromSVG(svg);
        this.addShape(shape);
        return shape;
    }

    serializeAll(exportStyle = true) {
        return this.layer.shapes.map(shape => this.serialize(shape, exportStyle));
    }

    deserializeAll(svgs) {
        if (!svgs || svgs.length <= 0)
            throw 'Invalid SVG array';

        return svgs.map(deserialize);
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

        let isWidgetCreated = this.utilities.layer.canvasGizmos.some(gizmos => gizmos instanceof ShapeEditorWidget && (gizmos.shape.id == event.action.shape.id));
        if (isWidgetCreated)
            return;

        this.utilities.attachEditorWidget(event.action.shape);
    };

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
        this.utilities.undoStack.addEventListener(
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
    }

    async initialize() {
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

        this.#isCreating = false;
        this.#isEditing = false;
        this.#isViewing = false;

        this.viewer.toolController.deactivateTool(AreaPlansDefaultToolName);
        this.viewer.toolController.deregisterTool(this.viewingTool);
        delete this.viewingTool;
        this.viewingTool = null;

        this.utilities.terminate();
        delete this.utilities;
        this.utilities = null;
    }

    async load() {
        await this.initialize();
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