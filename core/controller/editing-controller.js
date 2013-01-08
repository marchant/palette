var Montage = require("montage").Montage,
    Promise = require("montage/core/promise").Promise,
    Exporter = require("core/exporter").Exporter,
    Deserializer = require("montage/core/deserializer").Deserializer,
    Component = require("montage/ui/component").Component; //TODO this is only for debugging

// The actual object responsible for add, removing, and altering components that belong to the owner it controls.
// This controller will inform others of the intent and result of each operation it performs allowing consumers
// to react to changes for whatever reason.
exports.EditingController = Montage.create(Montage, {

    frame: {
        value: null
    },

    template: {
        get: function () {

            var iframeWindow = this.frame._element.contentWindow,
                exporter,
                template;

            if (iframeWindow) {
                exporter = Exporter.create();
                template = exporter.export(iframeWindow, this.owner, this.ownerRequire);
            }

            return template;
        }
    },

    //TODO cache this
    ownerRequire: {
        get: function() {
            return this.owner.element.ownerDocument.defaultView.require;
        }
    },

    //TODO what to do if owner changes in the middle of adding a childComponent?
    //TODO should the owner be able to be changed?
    owner: {
        value: null
    },

    _createElementFromMarkup: {
        value: function (markup, id) {
            //TODO not create an element each time
            var incubator = this.owner.element.ownerDocument.createElement('div'),
                result;

            incubator.innerHTML = markup;
            result = incubator.removeChild(incubator.firstElementChild);
            result.setAttribute("data-montage-id", id);

            return result;
        }
    },

    addObject: {
        value: function (objectModule, objectName, serialization) {

            var self = this;
            return this.installObject(objectModule, objectName, function (objectModule, deferredId) {

                var objectPrototype = objectModule[objectName],
                    objectInstance = objectPrototype.create();

                objectInstance.identifier = self._generateObjectId(objectName);

                // TODO set as a property on the owner?
                // how does this end up in the serialization if not exposed as property on owner?
                // self.owner;

                self._didAddObject(deferredId, objectInstance);
            });
        }
    },

    addComponent: {
        value: function (labelInOwner, serialization, markup, elementMontageId, identifier) {

            if (!labelInOwner) {
                throw new Error("Cannot add a component without a label for the owner's serialization");
            }

            var element,
                deserializer = Deserializer.create(),
                self = this,
                serializationWithinOwner = {},
                deferredComponent = Promise.defer(),
                ownerDocument = this.owner.element.ownerDocument;

            serialization = Object.clone(serialization);

            if (!serialization.properties && (identifier || elementMontageId)) {
                serialization.properties = {};
            }

            if (identifier) {
                serialization.properties.identifier = identifier;
            }

            if (elementMontageId) {
                serialization.properties.element = {"#": elementMontageId};

                element = ownerDocument.querySelector("[data-montage-id=" + elementMontageId + "]");

                if (!element) {
                    element = this._createElementFromMarkup(markup, elementMontageId);
                    //TODO do this off-screen to avoid rendering flash, not sure how to balance that with
                    // putting this in the right spot in the DOM; can we move it after the fact easily?
                    this.owner.element.appendChild(element);
                }
            }

            serializationWithinOwner[labelInOwner] = serialization;

            deserializer.initWithObjectAndRequire(serializationWithinOwner, this.ownerRequire);
            deserializer.deserializeWithInstancesAndDocument(null, ownerDocument, function (objects) {
                var newComponent = objects[identifier];
                newComponent.ownerComponent = self.owner;
                newComponent.needsDraw = true;
                deferredComponent.resolve({label: labelInOwner, serialization: serialization, component: newComponent});
            });

            return deferredComponent.promise;
        }
    },

    setComponentProperty: {
        value: function (component, property, value) {
            //ensure component is child of controlledComponent
            // is this as simple as: component.setProperty(property, value);
            // what about setting the X coordinate of a component, that should be within the controlledComponent's CSS
        }
    }

});
