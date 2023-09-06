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

let domParser = null;

/**
 * Parse and convert svg attributes in given string to a Edit2D style object.
 * @param {string} svg - SVG data string e.g. '<path d="M 0.14257614023439732,0.784614098708034 L 0.22808291697874675,0.784614094798725 L 0.22808292014765721,0.8539264255834248 L 0.2727796377107461,0.8539264235399225 V 0.6388638557017069 H 0.1425761155084649 Z" stroke="rgb(0,0,128)" fill="rgb(0,0,128)" stroke-width="2" fill-opacity="0.2"/>'
 * @returns {Autodesk.Edit2D.Style} Edit2D style object
 */
export const parseSvgStyle = (svg) => {
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

/**
 * Load CSS style sheet from given URL.
 * @param {string} href - URL of CSS style sheet 
 */
export const loadCSS = (href) => new Promise(function (resolve, reject) {
    const el = document.createElement('link');
    el.rel = 'stylesheet';
    el.href = href;
    el.onload = resolve;
    el.onerror = reject;
    document.head.appendChild(el);
});