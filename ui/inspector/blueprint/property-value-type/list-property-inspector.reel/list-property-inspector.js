/**
 @module "./list-property-inspector.reel"
 @requires montage
 @requires "../../value-type-inspector.reel"
 */
var Montage = require("montage").Montage,
    shim = require("montage/collections/shim"),
    ValueTypeInspector = require("../../value-type-inspector.reel").ValueTypeInspector;

/**
 Description TODO
 @class module:"./list-property-inspector.reel".ListPropertyInspector
 @extends module:"../../value-type-inspector.reel".ValueTypeInspector
 */
exports.ListPropertyInspector = Montage.create(ValueTypeInspector, /** @lends module:"./list-property-inspector.reel".ListPropertyInspector# */ {

    collectionValue: {
        get: function () {
            if (this.propertyBlueprint && this.propertyBlueprint.isToMany && (this.propertyBlueprint.collectionValueType === "list")) {
                if (this.objectValue) {
                    if (!(this.objectValue instanceof Array)) {
                        if (this.objectValue.forEach) {
                            this.objectValue = new Array(this.objectValue);
                        } else {
                            var temp = this.objectValue;
                            this.objectValue = [];
                            this.objectValue.add(temp);
                        }
                    }
                }
                return this.objectValue;
            }
            return [];
        },
        set: function (value) {
            this.objectValue = value;
        }
    },

    handleAddButtonAction: {
        value: function (evt) {
            if (!this.objectValue) {
                this.objectValue = [];
            }
            this.collectionValue.add("");
        }
    },

    handleRemoveButtonAction: {
        value: function (evt) {
            var index = evt.detail.index;
            if (this.collectionValue && (index >= 0) && (index < this.collectionValue.length)) {
                this.collectionValue.splice(index, 1);
            }
        }
    }


});
