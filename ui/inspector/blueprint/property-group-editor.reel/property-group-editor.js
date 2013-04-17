/**
    @module "./property-group-editor.reel"
    @requires montage
    @requires montage/ui/component
*/
var Montage = require("montage").Montage,
    Component = require("montage/ui/component").Component;

/**
    Description TODO
    @class module:"./property-group-editor.reel".PropertyGroupEditor
    @extends module:montage/ui/component.Component
*/
exports.PropertyGroupEditor = Montage.create(Component, /** @lends module:"./property-group-editor.reel".PropertyGroupEditor# */ {

    editingDocument: {
        value: null
    },

    object: {
        value: null
    },

    name: {
        value: null
    },

    properties: {
        value: null
    },

    _open: {
        value: false
    },

    open: {
        get: function() {
            return this._open;
        },
        set: function(value) {
            if (this._open === value) {
                return;
            }
            this._open = value;
            this.needsDraw = true;
        }
    },

    draw: {
        value: function() {
            this.element.open = this._open;
        }
    }

});
