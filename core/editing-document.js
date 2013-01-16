var Montage = require("montage").Montage,
    EditingController = require("core/controller/editing-controller").EditingController,
    UndoManager = require("montage/core/undo-manager").UndoManager,
    Template = require("montage/ui/template").Template,
    Promise = require("montage/core/promise").Promise,
    Deserializer = require("montage/core/deserializer").Deserializer,
    EditingProxy = require("core/editing-proxy").EditingProxy;

exports.EditingDocument = Montage.create(Montage, {

    _objectNameFromModuleId: {
        value: function (moduleId) {
            //TODO this utility should live somewhere else (/baz/foo-bar.reel to FooBar)
            Deserializer._findObjectNameRegExp.test(moduleId);
            return RegExp.$1.replace(Deserializer._toCamelCaseRegExp, Deserializer._replaceToCamelCase);
        }
    },

    _generateLabel: {
        value: function (serialization) {
            var name = this._objectNameFromModuleId(serialization.prototype),
                label = name.substring(0, 1).toLowerCase() + name.substring(1),
                labelRegex = new RegExp("^" + label + "(\\d+)$", "i"),
                match,
                lastUsedIndex;

            lastUsedIndex = Object.keys(this.editingProxyMap).map(function (existingLabel) {
                match = existingLabel.match(labelRegex);
                return match && match[1] ? match[1] : null;
            }).reduce(function (lastFoundIndex, index) {
                if (null == index) {
                    return lastFoundIndex;
                } else {
                    index = parseInt(index, 10);

                    if (null == lastFoundIndex) {
                        return index;
                        //TODO should we fill in gaps? or find the highest used index?
                    } else if (index > lastFoundIndex) {
                        return index;
                    } else {
                        return lastFoundIndex;
                    }
                }
            });

            lastUsedIndex = lastUsedIndex || 0;

            return label + (lastUsedIndex + 1);
        }
    },

    title: {
        dependencies: ["reelUrl"],
        get: function () {
            return this.reelUrl.substring(this.reelUrl.lastIndexOf("/") + 1);
        }
    },

    undoManager: {
        value: null
    },

    _editingController: {
        value: null
    },

    editingController: {
        get: function () {
            return this._editingController;
        }
    },

    _reelUrl: {
        value: null
    },

    _packageUrl: {
        value: null
    },

    reelUrl: {
        get: function () {
            return this._reelUrl;
        }
    },

    _ownerTemplate: {
        value: null
    },

    packageUrl: {
        get: function () {
            return this._packageUrl;
        }
    },

    init: {
        value: function (reelUrl, packageUrl, editingFrame, owner, ownerTemplate) {

            this._reelUrl = reelUrl;
            this._packageUrl = packageUrl;
            this._ownerTemplate = ownerTemplate;

            //TODO merge editingController and editingDocument, all of these are
            var editController = this._editingController = EditingController.create();
            editController.frame = editingFrame;
            editController.owner = owner;

            this.undoManager = UndoManager.create();

            this._createProxiesFromSerialization(JSON.parse(ownerTemplate._ownerSerialization), owner);

            return this;
        }
    },

    _createProxiesFromSerialization: {
        value: function (serialization, owner) {

            var labels = Object.keys(serialization),
                proxyMap = this._editingProxyMap = Object.create(null),
                stageObject;

            labels.forEach(function (label) {
                stageObject = owner.templateObjects[label];
                proxyMap[label] = EditingProxy.create().initWithLabelAndSerializationAndStageObject(label, serialization[label], stageObject);
            });
        }
    },

    ownerRequire: {
        get: function () {
            return this.editingController.ownerRequire;
        }
    },

    //TODO this is still somewhat mid-refactoring, probably could be cleaned up
    template: {
        get: function () {
            var template = this.editingController.template;
            var components = {};

            Object.keys(this._editingProxyMap).forEach(function (label) {
                components[label] = this._editingProxyMap[label].serialization;
            }, this);

            template._ownerSerialization = JSON.stringify(components);

            return template;
        }
    },

    // Editing Document APIs
    addComponent: {
        value: function (labelInOwner, serialization, markup, elementMontageId, identifier) {

            var self = this,
                objectName,
                proxy;

            if (!labelInOwner) {
                labelInOwner = this._generateLabel(serialization);
            }

            //Only set these if they were not explicitly falsy; assume that if they
            // were explicitly falsy the author is doing so on purpose
            if (typeof elementMontageId === "undefined") {
                elementMontageId = labelInOwner; //TODO format more appropriately for use in DOM?
            }

            if (typeof identifier === "undefined") {
                identifier = labelInOwner; //TODO lower case the identifier?
            }

            return this.editingController.addComponent(labelInOwner, serialization, markup, elementMontageId, identifier).then(function (result) {
                proxy = EditingProxy.create().initWithLabelAndSerializationAndStageObject(labelInOwner, result.serialization, result.component);
                self._editingProxyMap[labelInOwner] = proxy;

                //TODO guess we should have cloned the element we found and kept that around so we can restore it on undo
                self.undoManager.add("Add " + labelInOwner, self.removeComponent, self, proxy, null);

                self.dispatchEventNamed("didAddComponent", true, true, {
                    component: proxy
                });

                return proxy;
            });
        }
    },

    removeComponent: {
        value: function (proxy, originalElement) {

            var self = this;

            return this.editingController.removeComponent(proxy.stageObject, originalElement).then(function (element) {

                //TODO well, UM is certainly synchronous, it adds this, but since undoing ended before promise resolution,
                // its added to the undo stack, not the redo stack…
                self.undoManager.add("Remove " + proxy.label, self.addComponent, self,
                    proxy.label, proxy.serialization, element.outerHTML,
                    element.getAttribute("data-montage-id"), proxy.getProperty("properties.identifier"));

                //TODO does this trigger a change in the editingProxies computed collection? I assume not
                delete self.editingProxyMap[proxy.label];
            });
        }
    },

    setOwnedObjectProperty: {
        //TODO accept the object itself as well (we should accept either objects or their proxies)
        value: function (proxy, property, value) {
            //TODO add to undo manager

            var undoManager = this.undoManager,
                undoneValue = proxy.getObjectProperty(property);

            undoManager.add("Set " + property + " on " + proxy.label,
                this.setOwnedObjectProperty, this, proxy, property, undoneValue);

            //TODO maybe the proxy shouldn't be involved in doing this as we hand out the proxies
            // throughout the editingEnfironment, I don't want to expose accessible editing APIs
            // that do not go through the editingDocument...or do I?

            // Might be nice to have an editing API that avoid undoability and event dispatching?
            proxy.setObjectProperty(property, value);

            this.dispatchEventNamed("didSetObjectProperty", true, true, {
                object: proxy,
                property: property,
                value: value,
                undone: undoManager.isUndoing,
                redone: undoManager.isRedoing
            });
        }
    },

    defineBinding: {
        value: function (sourceObject, sourceObjectPropertyPath, boundObject, boundObjectPropertyPath, oneWay, converter) {

            //TODO add undoablitiy
            //TODO dispatch editingEvent, should we literally just dispatch a generic "edit" event?

            //Similar concerns above, where does this API belong?
            sourceObject.defineBinding(sourceObjectPropertyPath, boundObject, boundObjectPropertyPath, oneWay, converter);
        }
    },

    _editingProxyMap: {
        value: null
    },

    editingProxyMap: {
        get: function () {
            return this._editingProxyMap;
        }
    },

    editingProxies: {
        get: function () {
            //TODO cache this
            var proxyMap = this._editingProxyMap,
                labels = Object.keys(proxyMap);

            return labels.map(function (label) {
                return proxyMap[label];
            });
        }
    },

    editingProxyForObject: {
        value: function (object) {
            var label = Montage.getInfoForObject(object).label,
                proxy = this._editingProxyMap[label];

            if (!proxy) {
                throw new Error("No editing proxy found for object with label '" + label + "'");
            }

            return proxy;
        }
    }

});
