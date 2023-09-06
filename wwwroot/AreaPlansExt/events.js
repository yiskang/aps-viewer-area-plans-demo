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

/**
 * Fires when the area markup tool has been changed.
 * @event Autodesk.Das.AreaPlans.MODE_CHANGED_EVENT
 * @type {object}
 * @property {string} type - Event type.
 * @property {Autodesk.Viewing.Viewer3D} target - Target that fires this event.*
 * @property {(create|edit|viewing)} mode - Tool mode name.
 */
export const MODE_CHANGED_EVENT = 'areaMarkupToolModeChanged';
/**
 * Fires when the remote markups data has been loaded.
 * @event Autodesk.Das.AreaPlans.MARKUP_LOADED_EVENT
 * @type {object}
 * @property {string} type - Event type.
 * @property {Autodesk.Viewing.Viewer3D} target - Target that fires this event.*
 */
export const MARKUP_LOADED_EVENT = 'areaMarkupLoaded';