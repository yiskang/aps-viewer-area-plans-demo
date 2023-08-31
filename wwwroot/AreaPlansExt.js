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

class AreaPlansUtilities {
    #viewer = null;

    constructor(viewer) {
        this.#viewer = viewer;
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

    get layer() {
        return this.context?.layer;
    }

    get selection() {
        return this.context?.selection;
    }

    async initialize() {
        let ext = await this.#viewer.loadExtension(EDIT2D_EXT_ID);
        ext.registerDefaultTools();

        return true;
    }

    terminate() {
        let ext = this.#viewer.getExtension(EDIT2D_EXT_ID);
        ext.unregisterDefaultTools();

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

        return controller.activateTool(toolName);
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
    constructor(viewer, options) {
        super(viewer, options);
    }

    get #defaultTools() {
        return this.utilities?.defaultTools;
    }

    enterCreateMode() {
        this.leaveViewingMode();
        this.utilities.changeTool(this.#defaultTools.polygonTool.getName());
    }

    leaveCreateMode() {
        this.enterViewingMode();
    }

    enterEditMode() {
        this.leaveViewingMode();
        this.utilities.changeTool(this.#defaultTools.polygonEditTool.getName());
    }

    leaveEditMode() {
        this.enterViewingMode();
    }

    enterViewingMode() {
        this.utilities.changeTool(this.viewingTool.getName());
    }

    leaveViewingMode() {
        let controller = this.viewer.toolController;
        let activeTool = controller.getActiveTool();
        let isAreaPlan = activeTool && activeTool.getName().startsWith(AreaPlansDefaultToolName);

        if (!isAreaPlan)
            return false;

        controller.deactivateTool(activeTool.getName());
        activeTool = null;

        return true;
    }

    async initialize() {
        const utilities = new AreaPlansUtilities(this.viewer);
        await utilities.initialize();
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

Autodesk.Viewing.theExtensionManager.registerExtension('Autodesk.Das.AreaPlansExtension', AreaPlansExtension);