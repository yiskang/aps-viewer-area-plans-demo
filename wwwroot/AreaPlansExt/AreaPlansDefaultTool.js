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
 * THe tool name of `AreaPlansDefaultTool`
 * @type {string}
 */
export const AreaPlansDefaultToolName = 'area-plans-default-tool';

/**
* Default viewer tool providing markup-hovering only feature.
*/
export default class AreaPlansDefaultTool extends Autodesk.Viewing.ToolInterface {
    /**
     * @type {AreaPlansUtilities}
     * @private
     */
    #utilities = null;
    /**
     * Is tool activated
     * @type {boolean}
     * @private
     */
    #active = false;

    /**
     * AreaPlansDefaultTool constructor
     * @param {AreaPlansUtilities} utilities - The utilities for manipulating area markups
     * @constructor
     */
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

    /**
     * @type {Autodesk.Edit2D.EditLayer}
     */
    get layer() {
        return this.#utilities?.layer;
    }

    /**
     * @type {Autodesk.Edit2D.Selection}
     */
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

    /**
     * Rest this tool. It will clear area markup selection and make all markups unselectable
     */
    reset() {
        this.#utilities.select();
        this.#utilities.freezeShapes();
    }

    /**
     * It will highlight the area markup under the mouse cursor while in viewing mode
     * @param {MouseMoveEvent} event 
     */
    handleMouseMove(event) {
        if (!this.#active)
            return false;

        const mousePos = this.layer.canvasToLayer(event.canvasX, event.canvasY);
        const shape = this.layer.hitTest(mousePos.x, mousePos.y);
        this.#utilities.hover(shape);
    }
}