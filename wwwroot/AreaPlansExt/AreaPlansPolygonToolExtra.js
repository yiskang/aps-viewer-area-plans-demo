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
 * THe tool name of `AreaPlansPolygonToolExtra`
 * @type {string}
 */
export const AreaPlansPolygonToolExtraName = 'area-plans-polygon-tool-extra';

/**
* Extra viewer tool to extend Edit2D polygon tool.
*/
export default class AreaPlansPolygonToolExtra extends Autodesk.Viewing.ToolInterface {
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

        this.names = [AreaPlansPolygonToolExtraName];
        this.#utilities = utilities;
        this.#active = false;

        // Hack: delete functions defined *on the instance* of the tool.
        // We want the tool controller to call our class methods instead.
        delete this.register;
        delete this.deregister;
        delete this.activate;
        delete this.deactivate;
        delete this.handleKeyDown;
    }

    register() {
        console.log('AreaPlansPolygonToolExtra registered.');
    }

    deregister() {
        console.log('AreaPlansPolygonToolExtra unregistered.');
    }

    activate() {
        if (this.#active)
            return;

        console.log('AreaPlansPolygonToolExtra activated.');
        this.#active = true;
    }

    deactivate(name) {
        if (!this.#active)
            return;

        console.log('AreaPlansPolygonToolExtra deactivated.');
        this.#active = false;
    }

    /**
     * It will leave creating mode when pressing ESCAPE key while under creating mode.
     * @param {MouseMoveEvent} event 
     */
    handleKeyDown(event, keyCode) {
        if (!this.#active)
            return false;

        if (keyCode == Autodesk.Viewing.KeyCode.ESCAPE && this.#utilities.parentExtension.isCreating) {
            this.#utilities.parentExtension.leaveCreateMode();
        }

        return true;
    }
}