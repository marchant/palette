/**
 @module "palette/ui/editor.reel"
 @requires montage
 @requires montage/ui/component
 */
var Montage = require("montage").Montage;
var Component = require("montage/ui/component").Component;
var Promise = require("montage/core/promise").Promise;
var Map = require("montage/collections/map");

/**
 Description TODO
 @class module:"palette/ui/editor.reel".Editor
 @extends module:montage/ui/component.Component
 */
exports.Editor = Montage.create(Component, /** @lends module:"palette/ui/editor.reel".Editor# */ {

    _currentDocument:{
        value:null
    },

    currentDocument:{
        get:function () {
            return this._currentDocument;
        }
    },

    openDocument: {
        value: Function.noop
    },

    /*
     * Load the document and register it so that it can be closed and tracked
     *
     */
    open: {
        value: function (document) {
            if (document !== this.currentDocument) {
                this.dispatchBeforeOwnPropertyChange("currentDocument", this._currentDocument);
                this._currentDocument = document;
                this.openDocument(document);
                this.dispatchOwnPropertyChange("currentDocument", document);
            } else {
                this.openDocument(document);
            }
            this.needsDraw = true;
        }
    },

    closeDocument: {
        value: Function.noop
    },

    close: {
        value:function (document) {
            if (document === this.currentDocument) {
                this.dispatchBeforeOwnPropertyChange("currentDocument", this._currentDocument);
                this._currentDocument = null;
                this.closeDocument(document);
                this.dispatchOwnPropertyChange("currentDocument", null);
            } else {
                this.closeDocument(document);
            }
            this.needsDraw = true;
        }
    }

});
