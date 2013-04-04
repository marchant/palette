/**
 @module "./property-editor.reel"
 @requires montage
 @requires montage/ui/component
 */
var Montage = require("montage").Montage,
    Component = require("montage/ui/component").Component,
    Gate = require("montage/core/gate").Gate;

/**
 Description TODO
 @class module:"./property-editor.reel".PropertyEditor
 @extends module:montage/ui/component.Component
 */
exports.PropertyEditor = Montage.create(Component, /** @lends module:"./property-editor.reel".PropertyEditor# */ {

    _updateGate: {
        value: null
    },
    /**
     Description TODO
     @function
     @returns this._blockDrawGate
     */
    updateGate: {
        enumerable: false,
        get: function () {
            if (!this._updateGate) {
                this._updateGate = Gate.create().initWithDelegate(this);
                this._updateGate.setField("object", false);
                this._updateGate.setField("propertyBlueprint", false);
            }
            return this._updateGate;
        }
    },

    _object: {
        value: null
    },

    /*
     * Target object proxy that is inspected with the blueprint
     */
    object: {
        get: function () {
            return this._object;
        },
        set: function (value) {
            if (this._object !== value) {
                if (this.updateGate.getField("object")) {
                    this.updateGate.setField("object", false);
                }
                this._object = value;
                if (value) {
                    this.updateGate.setField("object", true);
                }
            }
        }
    },

    _propertyBlueprint: {
        value: null
    },

    /*
     * Property blueprint that is inspected
     */
    propertyBlueprint: {
        get: function () {
            return this._propertyBlueprint;
        },
        set: function (value) {
            if (this._propertyBlueprint !== value) {
                if (this.updateGate.getField("propertyBlueprint")) {
                    this.updateGate.setField("propertyBlueprint", false);
                }
                this._propertyBlueprint = value;
                if (value) {
                    this.updateGate.setField("propertyBlueprint", true);
                }
            }
        }
    },

    _objectValue: {
        value: null
    },

    /*
     * Target value in the object
     */
    objectValue: {
        dependencies: ["object", "propertyBlueprint"],
        get: function () {
            return this._objectValue;
        },
        set: function (value) {
            if ((this._objectValue !== value) && this._object && this._propertyBlueprint) {
                if (typeof value !== "undefined" && !this._propertyBlueprint.readOnly) {
//                    console.log("Set value for " + this._propertyBlueprint.name + " ", value)
                    this._object.editingDocument.setOwnedObjectProperty(this._object, this._propertyBlueprint.name, value);
                }
            }
            this._objectValue = value;
        }
    },

    gateDidBecomeTrue: {
        value: function (gate) {
            if (gate == this._updateGate) {
                if (this._object && this._propertyBlueprint) {
                    var value = this._object.editingDocument.getOwnedObjectProperty(this._object, this._propertyBlueprint.name);
                    if (this._objectValue != value) {
//                        console.log("gateDidBecomeTrue for " + this._propertyBlueprint.name + " ", value, this.uuid)

                        this.dispatchBeforeOwnPropertyChange("objectValue", this._objectValue);
                        this._objectValue = value;
                        this.dispatchOwnPropertyChange("objectValue", value);
                    }
                }
            } else if (Component.gateDidBecomeTrue) {
                Component.gateDidBecomeTrue.call(this, gate);
            }
        }
    },

    gateDidBecomeFalse: {
        value: function (gate) {
            if (gate == this._updateGate) {
//                console.log("gateDidBecomeFalse for " + (this._propertyBlueprint ? this._propertyBlueprint.name : "null") + " ", this.uuid, value)

                this.dispatchBeforeOwnPropertyChange("objectValue", this._objectValue);
                this._objectValue = null;
                this.dispatchOwnPropertyChange("objectValue", null);
            } else if (Component.gateDidBecomeFalse) {
                Component.gateDidBecomeFalse.call(this, gate);
            }
        }
    }

});
