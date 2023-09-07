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

import AreaPlansUtilities from './AreaPlansUtilities.js';
import AreaPlansDefaultTool, { AreaPlansDefaultToolName } from './AreaPlansDefaultTool.js';
import AreaPlansPolygonToolExtra, { AreaPlansPolygonToolExtraName } from './AreaPlansPolygonToolExtra.js';
import AreaPlansRemoteDataProvider from './AreaPlansRemoteDataProvider.js';
import { loadCSS } from './utils.js';
import { MODE_CHANGED_EVENT, MARKUP_LOADED_EVENT, ERROR_OCCURRED_EVENT } from './events.js';

/**
 * Area Plan Core extension
 * @class
 */
export default class AreaPlansExtension extends Autodesk.Viewing.Extension {
    /**
     * Is under creating mode
     * @type {boolean}
     * @private
     */
    #isViewing = false;
    /**
     * Is under editing mode
     * @type {boolean}
     * @private
     */
    #isCreating = false;
    /**
     * Is under viewing mode
     * @type {boolean}
     * @private
     */
    #isEditing = false;
    /**
     * The markup style will be applied while in the creating mode
     * @type {Autodesk.Edit2D.Style}
     * @private
     */
    #style = null;

    /**
     * AreaPlansExtension constructor
     * @param {Autodesk.Viewing.Viewer3D} viewer - The viewer instance
     * @param {object} options - Extension options
     * @property {boolean} [options.autoLoad=true] - True to load remote markup data automatically when loading this extension
     * @constructor
     */
    constructor(viewer, options) {
        options = options || { autoLoad: true };
        super(viewer, options);
    }

    /**
     * The default tool set of Edit2D
     * @type {object[]}
     * @private
     */
    get #defaultTools() {
        return this.utilities?.defaultTools;
    }

    /**
     * Is under creating mode
     * @type {boolean}
     */
    get isCreating() {
        return this.#isCreating;
    }

    /**
     * Is under editing mode
     * @type {boolean}
     */
    get isEditing() {
        return this.#isEditing;
    }

    /**
     * Is under viewing mode
     * @type {boolean}
     */
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

    /**
     * Add shape editor widgets to all existing area markups on viewer screen
     */
    showEditorWidgets() {
        this.utilities.layer?.shapes.forEach(shape => this.#attachEditorWidgetIfNotExist(shape));
    }

    /**
     * Remove shape editor widgets for existing area markups on viewer screen
     */
    hideEditorWidgets() {
        this.utilities.layer?.shapes.forEach(shape => this.detachEditorWidget(shape));
    }

    /**
     * Enter area markup creating mode
     * @fires Autodesk.Das.AreaPlans.MODE_CHANGED_EVENT
     */
    enterCreateMode() {
        this.leaveViewingMode();
        this.#defaultTools.polygonTool.setStyles(this.#style, true);
        this.utilities.changeTool(this.#defaultTools.polygonTool.getName());
        this.viewer.toolController.activateTool(AreaPlansPolygonToolExtraName);

        this.utilities.undoStack.addEventListener(
            Autodesk.Edit2D.UndoStack.AFTER_ACTION,
            this.#onShapeAdded
        );

        this.#isCreating = true;
        this.#isViewing = false;
        this.#isEditing = false;

        this.viewer.dispatchEvent({ type: MODE_CHANGED_EVENT, mode: 'create' });
    }

    /**
     * Exit area markup creating mode
     */
    leaveCreateMode() {
        this.utilities.undoStack.removeEventListener(
            Autodesk.Edit2D.UndoStack.AFTER_ACTION,
            this.#onShapeAdded
        );

        this.viewer.toolController.deactivateTool(AreaPlansPolygonToolExtraName);
        this.enterViewingMode();
        this.#isCreating = false;
    }

    /**
     * Enter area markup editing mode
     * @fires Autodesk.Das.AreaPlans.MODE_CHANGED_EVENT
     */
    enterEditMode() {
        this.leaveViewingMode();
        this.utilities.changeTool(this.#defaultTools.polygonEditTool.getName());
        this.#isEditing = true;
        this.#isCreating = false;
        this.#isViewing = false;

        this.viewer.dispatchEvent({ type: MODE_CHANGED_EVENT, mode: 'edit' });
    }

    /**
     * Exit area markup editing mode
     */
    leaveEditMode() {
        this.enterViewingMode();
        this.#isEditing = false;
    }

    /**
     * Enter area markup viewing mode
     * @fires Autodesk.Das.AreaPlans.MODE_CHANGED_EVENT
     */
    enterViewingMode() {
        this.utilities.changeTool(this.viewingTool.getName());
        this.#isViewing = true;
        this.#isEditing = false;
        this.#isCreating = false;

        this.viewer.dispatchEvent({ type: MODE_CHANGED_EVENT, mode: 'viewing' });
    }

    /**
     * Exit area markup viewing mode
     */
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

    /**
     * Toggle creating mode
     */
    toggleCreateMode() {
        if (this.#isCreating)
            return this.leaveCreateMode();

        this.enterCreateMode();
    }

    /**
     * Toggle editing mode
     */
    toggleEditMode() {
        if (this.#isEditing)
            return this.leaveEditMode();

        this.enterEditMode();
    }

    /**
     * Toggle viewing mode
     */
    toggleViewingMode() {
        if (this.#isViewing)
            return this.leaveViewingMode();

        this.enterViewingMode();
    }

    /**
     * Clear all area markups on the current viewer canvas and enter viewing mode. See also {@link AreaPlansUtilities#clearLayer}
     * @param {boolean} [enableUndo=true] - True to allow undo/redo the clear action.
     */
    clearLayer(enableUndo = true) {
        this.utilities.clearLayer(enableUndo);
        this.enterViewingMode();
    }

    /**
     * Initialize this extension
     * @returns {Promise<boolean>} True if the initialization is successful.
     */
    async initialize() {
        await Promise.all([
            loadCSS('https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/themes/nano.min.css'),
            Autodesk.Viewing.Private.theResourceLoader.loadScript('https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/pickr.es5.min.js')
        ]);

        const utilities = new AreaPlansUtilities();
        await utilities.initialize(this);
        this.utilities = utilities;

        // Change style for creating mode (make border line thinner)
        this.#style = new Autodesk.Edit2D.Style({ lineWidth: 2.0 });

        const tool = new AreaPlansDefaultTool(utilities);
        this.viewer.toolController.registerTool(tool);
        this.viewingTool = tool;

        const extraPolygonTool = new AreaPlansPolygonToolExtra(utilities);
        this.viewer.toolController.registerTool(extraPolygonTool);
        this.extraPolygonTool = extraPolygonTool;

        return true;
    }

    /**
     * Terminate this extension.  See also {@link AreaPlansUtilities#terminate}
     * @returns {boolean} True if the termination is successful
     */
    terminate() {
        if (!this.viewingTool || !this.extraPolygonTool)
            return false;

        this.viewer.toolController.deactivateTool(AreaPlansPolygonToolExtraName);
        this.viewer.toolController.deregisterTool(this.extraPolygonTool);
        delete this.extraPolygonTool;
        this.extraPolygonTool = null;

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
        this.#style = null;

        return true;
    }

    /**
     * Load remote area markups
     * @fires Autodesk.Das.AreaPlans.MARKUP_LOADED_EVENT
     */
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
        if (!markups || markups.length <= 0) {
            markups = [];
        }

        markups.forEach(markup => {
            let shape = this.utilities.deserialize(markup.svg);
            shape.dbId = markup.id;
            shape.selectable = false;
        });

        this.viewer.dispatchEvent({ type: MARKUP_LOADED_EVENT });
    }

    /**
     * Reload remote area markups. It will clear existing area markups first before loading data
     */
    async reloadMarkups() {
        this.leaveCreateMode();
        this.clearLayer(false);
        await this.loadMarkups();
    }

    #reportError(message, detail, internalError, code = 'AJAX') {
        const error = {
            message,
            detail,
            internalError,
            code
        };

        this.viewer.dispatchEvent({ type: ERROR_OCCURRED_EVENT, ...error });
        return error;
    }

    /**
     * Send newly created area markups to sever for saving into server storage
     */
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
                let path = this.utilities.serialize(markup);
                const error = this.#reportError(
                    'Failed to save the markup',
                    `data: \`${path}\``,
                    JSON.parse(ex.message)
                );
                console.error(error, path);
            }
        });
    }

    /**
     * Send changed area markups to sever for saving into server storage
     */
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
                const error = this.#reportError(
                    `Failed to update the markup with id: \`${shape.dbId}\``,
                    ex?.message,
                    ex
                );
                console.error(error, shape);
            }
        });
    }

    /**
     * Delete area markups from sever storage
     */
    async #deleteMarkups(remoteMarkups) {
        let remoteMarkupIds = remoteMarkups.map(markup => markup.id);
        let localMarkupIds = this.utilities.filterShapes(shape => shape.dbId)
            .map(shape => shape.dbId);

        remoteMarkupIds.filter(remoteId => !localMarkupIds.includes(remoteId))
            .forEach(async dbId => {
                try {
                    await AreaPlansRemoteDataProvider.deleteMarkup(dbId);
                } catch (ex) {
                    const error = this.#reportError(
                        `Failed to delete the markup with id: \`${dbId}\``,
                        ex?.message,
                        ex
                    );
                    console.error(error);
                }
            });
    }

    /**
     * Save changes on area markups and send to server.
     */
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

    /**
     * Load this extension into viewer. See also {@link AreaPlansExtension#initialize}
     * @returns {boolean} True if the load is successful
     */
    async load() {
        await this.initialize();

        if (this.options.autoLoad)
            await this.loadMarkups();

        return true;
    }

    /**
     * Unload this extension from viewer. See also {@link AreaPlansExtension#terminate}
     * @returns {boolean} True if the unload is successful
     */
    unload() {
        this.terminate();
        return true;
    }
}

AutodeskNamespace('Autodesk.Das.AreaPlans');
Autodesk.Das.AreaPlans.AreaPlansExtension = AreaPlansExtension;
Autodesk.Das.AreaPlans.MODE_CHANGED_EVENT = MODE_CHANGED_EVENT;
Autodesk.Das.AreaPlans.MARKUP_LOADED_EVENT = MARKUP_LOADED_EVENT;
Autodesk.Das.AreaPlans.ERROR_OCCURRED_EVENT = ERROR_OCCURRED_EVENT;

Autodesk.Viewing.theExtensionManager.registerExtension('Autodesk.Das.AreaPlansExtension', AreaPlansExtension);