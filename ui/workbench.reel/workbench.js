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
    // Returns a promised editingInfo {owner, template}
    load: {
        value: function (fileUrl, packageUrl) {
            return this.editingFrame.load(fileUrl, packageUrl);
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

            if (this._editingFrame) {
                this._editingFrame.removeEventListener("update", this, true);
                if (this === this._editingFrame.delegate) {
                    this._editingFrame.delegate = null;
                }
            }

            this._editingFrame = value;

            if (this._editingFrame) {
                this._editingFrame.addEventListener("update", this, true);
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
    },

    prepareForDraw: {
        value: function() {
            // changing the size of the window causes overlays to be shifted
            window.addEventListener("resize", this, true);
            // CSS animations can change the size of elements, causing
            // overlays to be shifted
            window.addEventListener("webkitTransitionEnd", this, true);
            // In fact, any draw can cause the overlays to be shifted!
            var self = this;
            var root = require("montage/ui/component").__root__;
            var originalDrawIfNeeded = root.drawIfNeeded;
            root.drawIfNeeded = function() {
                self.dispatchEventNamed("update");
                originalDrawIfNeeded.call(root);
            };
        }
    },

    captureUpdate: {
        value: function(event) {
            this.dispatchEventNamed("update");
        }
    },

    captureResize: {
        value: function(event) {
            this.dispatchEventNamed("update");
        }
    },

    captureWebkitTransitionEnd: {
        value: function(event) {
            this.dispatchEventNamed("update");
        }
    }

});
