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
 * Data Provider for CRUD markup data.
 * @static
 */
export default class AreaPlansRemoteDataProvider {
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

    /**
     * Get remote area markup data
     * @param {object} queries - Query string.
     * @property {string} queries.urn - The model urn where this Markup belongs.
     * @property {string} queries.guid - The model view guid where this Markup belongs.
     * 
     * @returns {object} Markup - Area markup.
     * @property {int} Markup.id - Markup id in DB.
     * @property {string} Markup.urn - The model urn where this Markup belongs.
     * @property {string} Markup.guid - The model view guid where this Markup belongs.
     * @property {string} Markup.svg - The SVG data string for this markup, e.g. '<path d="M 0.14257614023439732,0.784614098708034 L 0.22808291697874675,0.784614094798725 L 0.22808292014765721,0.8539264255834248 L 0.2727796377107461,0.8539264235399225 V 0.6388638557017069 H 0.1425761155084649 Z" stroke="rgb(0,0,128)" fill="rgb(0,0,128)" stroke-width="2" fill-opacity="0.2"/>'
     */
    static async fetchMarkups(queries) {
        const json = await this.#fetch('/api/markups', queries);

        return json;
    }

    /**
     * @param {object} data - Area markup data.
     * @property {string} data.urn - The model urn where this Markup data belongs.
     * @property {string} data.guid - The model view guid where this Markup data belongs.
     * @property {string} data.svg - The SVG data string for this markup data, e.g. '<path d="M 0.14257614023439732,0.784614098708034 L 0.22808291697874675,0.784614094798725 L 0.22808292014765721,0.8539264255834248 L 0.2727796377107461,0.8539264235399225 V 0.6388638557017069 H 0.1425761155084649 Z" stroke="rgb(0,0,128)" fill="rgb(0,0,128)" stroke-width="2" fill-opacity="0.2"/>'
     * 
     * @returns {object} Markup - Area markup.
     * @property {int} Markup.id - Markup id in DB.
     * @property {string} Markup.urn - The model urn where this Markup belongs.
     * @property {string} Markup.guid - The model view guid where this Markup belongs.
     * @property {string} Markup.svg - The SVG data string for this markup, e.g. '<path d="M 0.14257614023439732,0.784614098708034 L 0.22808291697874675,0.784614094798725 L 0.22808292014765721,0.8539264255834248 L 0.2727796377107461,0.8539264235399225 V 0.6388638557017069 H 0.1425761155084649 Z" stroke="rgb(0,0,128)" fill="rgb(0,0,128)" stroke-width="2" fill-opacity="0.2"/>'
     */
    static async addMarkup(data) {
        const json = await this.#post('/api/markups', data);

        return json;
    }

    /**
     * Update remote area markup data of the given id.
     * @param {int} id - Markup id in DB.
     * @param {object} data - Area markup data.
     * @property {int} data.id - Markup id in DB.
     * @property {string} data.urn - The model urn where this Markup data belongs.
     * @property {string} data.guid - The model view guid where this Markup data belongs.
     * @property {string} data.svg - The SVG data string for this markup data, e.g. '<path d="M 0.14257614023439732,0.784614098708034 L 0.22808291697874675,0.784614094798725 L 0.22808292014765721,0.8539264255834248 L 0.2727796377107461,0.8539264235399225 V 0.6388638557017069 H 0.1425761155084649 Z" stroke="rgb(0,0,128)" fill="rgb(0,0,128)" stroke-width="2" fill-opacity="0.2"/>'
     * 
     * @returns {object} Markup - Area markup.
     * @property {int} Markup.id - Markup id in DB.
     * @property {string} Markup.urn - The model urn where this Markup belongs.
     * @property {string} Markup.guid - The model view guid where this Markup belongs.
     * @property {string} Markup.svg - The SVG data string for this markup, e.g. '<path d="M 0.14257614023439732,0.784614098708034 L 0.22808291697874675,0.784614094798725 L 0.22808292014765721,0.8539264255834248 L 0.2727796377107461,0.8539264235399225 V 0.6388638557017069 H 0.1425761155084649 Z" stroke="rgb(0,0,128)" fill="rgb(0,0,128)" stroke-width="2" fill-opacity="0.2"/>'
     */
    static async updateMarkup(id, data) {
        const json = await this.#patch(`/api/markups/${id}`, data);

        return json;
    }

    /**
     * Delete remote area markup data of the given id.
     * @param {int} id - Markup id in DB.
     * @returns {boolean} True if successfully deleted the area markup.
     */
    static async deleteMarkup(id) {
        await this.#delete(`/api/markups/${id}`);

        return true;
    }
}