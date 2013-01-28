/**
    @module "ui/workbench.reel"
    @requires montage
    @requires montage/ui/component
*/
var Montage = require("montage").Montage,
    Component = require("montage/ui/component").Component,
    Promise = require("montage/core/promise").Promise,
    Event = require("core/event").Event;

/**
    Description TODO
    @class module:"ui/workbench.reel".Workbench
    @extends module:montage/ui/component.Component
*/

// The workbench is high-level working area for loading a project and interacting with it.
// The workbench is responsible for providing the rich environment for editing tools and menus
// tool cursors, alignment guides, contextual editing components, and other editing specific visuals
// well be drawn within the workbench above, but coordinated with, the document being edited.

exports.Workbench = Montage.create(Component, /** @lends module:"ui/workbench.reel".Workbench# */ {

    // Load the specified reel onto the workbench, optionally specifying the packageUrl
    // Returns a promised editingDocument
    load: {
        value: function (fileUrl, packageUrl) {
            var self = this;

            return this.editingFrame.load(fileUrl, packageUrl).then(function (editingDocument) {

                self.dispatchPropertyChange("editingDocument", function () {
                    self._editingDocument = editingDocument;
                });

                return editingDocument;
            });
        }
    },

    _editingDocument: {
        value: null
    },

    editingDocument: {
        get: function () {
            return this._editingDocument;
        }
    },

    _editingFrame: {
        value: null
    },

    editingFrame: {
        get: function () {
            return this._editingFrame;
        },
        set: function (value) {
            if (value === this._editingFrame) {
                return;
            }

            if (this._editingFrame && this === this._editingFrame.delegate) {
                this._editingFrame.delegate = null;
            }

            this._editingFrame = value;

            if (this._editingFrame) {
                this._editingFrame.delegate = this;
            }
        }
    },

    didObserveEvent: {
        value: function(frame, event) {
            switch (event.type) {
                // Propogate drag and drop events up
                case "dragenter":
                case "dragleave":
                case "dragover":
                case "drop":
                    event.propagationStopped = false;
                    this.dispatchEvent(event);
            }
        }
    }

});
