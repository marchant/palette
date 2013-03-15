var Montage = require("montage").Montage,
    EditingDocument = require("core/editing-document").EditingDocument,
    EditingController = require("core/controller/editing-controller").EditingController,
    Template = require("montage/core/template").Template,
    Promise = require("montage/core/promise").Promise,
    MontageReviver = require("montage/core/serialization/deserializer/montage-reviver").MontageReviver,
    ReelProxy = require("core/reel-proxy").ReelProxy,
    SORTERS = require("core/sorters");

// The ReelDocument is used for editing Montage Reels
exports.ReelDocument = Montage.create(EditingDocument, {

    load: {
        value: function (fileUrl, packageUrl) {
            var self = this,
                objectName = MontageReviver.parseObjectLocationId(fileUrl).objectName;

            return require.loadPackage(packageUrl).then(function (packageRequire) {
                return packageRequire.async(fileUrl).get(objectName).then(function (componentPrototype) {
                    return Template.getTemplateWithModuleId(componentPrototype.templateModuleId, packageRequire);
                }).then(function (template) {
                    return self.create().init(fileUrl, template, packageRequire);
                });
            });
        }
    },

    init: {
        value: function (fileUrl, template, packageRequire) {
            var self = EditingDocument.init.call(this, fileUrl, packageRequire);

            self._template = template;
            self.selectedObjects = [];

            //TODO handle external serializations
            var serialization = template.getInlineObjectsString(template.document);
            self._editingProxyMap = {};
            self._addProxies(self._proxiesFromSerialization(serialization));

            return self;
        }
    },

    _template: {
        value: null
    },

    _buildSerialization: {
        value: function () {
            var template = this._template,
                templateObjects = {};

            Object.keys(this._editingProxyMap).sort(SORTERS.labelComparator).forEach(function (label) {
                templateObjects[label] = SORTERS.unitSorter(this._editingProxyMap[label].serialization);
            }, this);

            this.dispatchBeforeOwnPropertyChange("serialization", template.objectsString);

            template.objectsString = JSON.stringify(templateObjects, null, 4);

            this.dispatchOwnPropertyChange("serialization", template.objectsString);
        }
    },

    serialization: {
        get: function () {
            return this._template.objectsString;
        }
    },

    htmlDocument: {
        get: function () {
            return this._template.document;
        }
    },

    _ownerElement: {
        get: function () {
            var montageId = this.getPath("_editingProxyMap.owner.properties.element.property('#')"),
                element;

            if (!montageId) {
                throw new Error("Owner component has no element specified");
            }

            element = this.htmlDocument.querySelector("[data-montage-id='" + montageId + "']");

            if (!element) {
                throw new Error("Owner component element could not be found");
            }

            return element;
        }
    },

    _createElementFromMarkup: {
        value: function (markup, id) {
            //TODO not create an element each time
            var incubator = this.htmlDocument.createElement('div'),
                result;

            incubator.innerHTML = markup;
            result = incubator.removeChild(incubator.firstElementChild);
            result.setAttribute("data-montage-id", id);

            return result;
        }
    },

    save: {
        value: function (location, dataWriter) {
            //TODO I think I've made this regex many times...and probably differently
            var filenameMatch = location.match(/.+\/(.+)\.reel/),
                path,
                template = this._template,
                doc = this._template.document,
                serializationElement;

            if (!(filenameMatch && filenameMatch[1])) {
                throw new Error('Components can only be saved into ".reel" directories');
            }

            path = location + "/" + filenameMatch[1] + ".html";

            this._buildSerialization();

            return dataWriter(template.html, path);
        }
    },

    _editingController: {
        value: null
    },

    // Editing Model

    _proxiesFromSerialization: {
        value: function (serialization) {

            serialization = JSON.parse(serialization);

            var labels = Object.keys(serialization),
                self = this,
                proxy,
                montageId;

            return labels.map(function (label) {

                var exportId;
                if (serialization[label].prototype) {
                    exportId = serialization[label].prototype;
                } else {
                    if (self.fileUrl && self.packageRequire) {
                        exportId = self.fileUrl.substring(self.packageRequire.location.length);
                    }
                }

                proxy = ReelProxy.create().init(label, serialization[label], self, exportId);
                montageId = proxy.getPath("properties.element.property('#')");
                proxy.element = self.htmlDocument.querySelector("[data-montage-id='" + montageId + "']");
                return proxy;
            });
        }
    },

    _addProxies: {
        value: function (proxies) {
            var self = this;

            this.dispatchBeforeOwnPropertyChange("editingProxyMap", this.editingProxyMap);
            this.dispatchBeforeOwnPropertyChange("editingProxies", this.editingProxies);

            if (Array.isArray(proxies)) {
                proxies.forEach(function (proxy) {
                    self.__addProxy(proxy);
                });
            } else {
                self.__addProxy(proxies);
            }

            this.dispatchOwnPropertyChange("editingProxyMap", this.editingProxyMap);
            this.dispatchOwnPropertyChange("editingProxies", this.editingProxies);

            self._buildSerialization();
        }
    },

    __addProxy: {
        value: function (proxy) {
            var proxyMap = this._editingProxyMap;

            proxyMap[proxy.label] = proxy;

            //TODO not blindly append to the end of the body
            //TODO react to changing the element?
            if (proxy.element && !proxy.element.parentNode) {
                this._ownerElement.appendChild(proxy.element);
            }
        }
    },

    _removeProxies: {
        value: function (proxies) {
            var self = this;

            this.dispatchBeforeOwnPropertyChange("editingProxyMap", this.editingProxyMap);
            this.dispatchBeforeOwnPropertyChange("editingProxies", this.editingProxies);

            if (Array.isArray(proxies)) {
                proxies.forEach(function (proxy) {
                    self.__removeProxy(proxy);
                });
            } else {
                self.__removeProxy(proxies);
            }

            this.dispatchOwnPropertyChange("editingProxyMap", this.editingProxyMap);
            this.dispatchOwnPropertyChange("editingProxies", this.editingProxies);

            self._buildSerialization();
        }
    },

    __removeProxy: {
        value: function (proxy) {
            var proxyMap = this._editingProxyMap,
                parentNode;

            if (!proxyMap.hasOwnProperty(proxy.label)) {
                throw new Error("Could not find proxy to remove with label '" + proxy.label + "'");
            }
            delete proxyMap[proxy.label];

            if (proxy.element && (parentNode = proxy.element.parentNode)) {
                parentNode.removeChild(proxy.element);
            }
        }
    },

    associateWithLiveRepresentations: {
        value: function (owner, template, frame) {
            var labels = Object.keys(owner.templateObjects),
                self = this,
                proxy;

            var editController = this._editingController = EditingController.create();
            editController.frame = frame;
            editController.owner = owner;

            labels.forEach(function (label) {
                proxy = self.editingProxyMap[label];
                proxy.stageObject = owner.templateObjects[label];
            });
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

            // label is undefined for the owner component
            if (label && !proxy) {
                throw new Error("No editing proxy found for object with label '" + label + "'");
            }

            return proxy;
        }
    },

    // Selection API

    selectObjectsOnAddition: {
        value: true
    },

    selectedObjects: {
        value: null
    },

    updateSelectionCandidate: {
        value: function (currentElement) {
            if (!currentElement) {
                return;
            }

            var selectedObjects = this.selectedObjects;
            var selectionCandidate = currentElement.component;

            var ownerElement = this.editingProxyMap.owner.stageObject.element;
            var selectedElements = selectedObjects.map(function (object) {
                return object.getPath("stageObject.element");
            });

            // Select the highest component inside the current selection
            while (
                currentElement !== ownerElement &&
                selectedElements.indexOf(currentElement) === -1  &&
                currentElement != null
            ) {
                if (currentElement.component) {
                    selectionCandidate = currentElement.component;
                }
                currentElement = currentElement.parentElement;
            }

            return selectionCandidate ? this.editingProxyForObject(selectionCandidate) : void 0;
        }
    },

    // Selects nothing
    clearSelectedObjects: {
        value: function () {
            this.selectedObjects.clear();
        }
    },

    // Remove object from current set of selectedObjects
    deselectObject: {
        value: function (object) {
            this.selectedObjects.splice(0, this.selectedObjects.length, object);
        }
    },

    // Add object to current set of selectedObjects
    selectObject: {
        value: function (object) {
            var selectedObjects = this.selectedObjects;

            if (selectedObjects.indexOf(object) === -1) {
                //TODO what is the order ofthe selectedObjects?
                selectedObjects.push(object);
            }
            //TODO otherwise, do we remove it here?

        }
    },

    // Editing API

    _generateLabel: {
        value: function (serialization) {
            var name = MontageReviver.parseObjectLocationId(serialization.prototype).objectName,
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

    addObject: {
        value: function (labelInOwner, serialization, identifier) {
            var self = this,
                deferredUndo = Promise.defer(),
                proxy,
                proxyPromise;

            serialization = Object.clone(serialization);

            if (!labelInOwner) {
                labelInOwner = this._generateLabel(serialization);
            }

            if (typeof identifier === "undefined") {
                identifier = labelInOwner; //TODO lower case the identifier?
                if (!serialization.properties) {
                    serialization.properties = {};
                }
                serialization.properties.identifier = identifier;
            }

            self.undoManager.register("Add Object", deferredUndo.promise);

            proxy = ReelProxy.create().init(labelInOwner, serialization, self);

            if (this._editingController) {
                proxyPromise = this._editingController.addObject(labelInOwner, serialization)
                    .then(function (newObject) {
                        proxy.stageObject = newObject;
                        return proxy;
                    });
            } else {
                proxyPromise = Promise.resolve(proxy);
            }

            return proxyPromise.then(function (addedProxy) {

                self._addProxies(addedProxy);

                self.dispatchEventNamed("didAddObject", true, true, {
                    object: addedProxy
                });

                if (self.selectObjectsOnAddition) {
                    self.clearSelectedObjects();
                    self.selectObject(addedProxy);
                }

                deferredUndo.resolve([self.removeObject, self, addedProxy]);

                return addedProxy;
            });
        }
    },

    removeObject: {
        value: function (proxy) {

            var self = this,
                deferredUndo = Promise.defer(),
                removalPromise;

            this.undoManager.register("Remove Object", deferredUndo.promise);

            if (this._editingController) {
                removalPromise = this._editingController.removeObject(proxy.stageObject);
            } else {
                removalPromise = Promise.resolve(proxy);
            }

            return removalPromise.then(function (removedProxy) {
                self._removeProxies(removedProxy);
                deferredUndo.resolve([self.addObject, self, removedProxy.label, removedProxy.serialization]);
                return removedProxy;
            });
        }
    },

    addComponent: {
        value: function (labelInOwner, serialization, markup, elementMontageId, identifier) {
            var self = this,
                deferredUndo,
                proxy,
                proxyPromise;

            serialization = Object.clone(serialization);

            if (!labelInOwner) {
                labelInOwner = this._generateLabel(serialization);
            }

            //Only set these if they were not explicitly falsy; assume that if they
            // were explicitly falsy the author is doing so on purpose
            //TODO I don't like manipulating the serialization without knowing how the package's version of montage would do it
            // we can work around that but we shouldn't rely on the live stage object/editingController to do the work for us
            //TODO pull more out of the EditingController
            if (typeof elementMontageId === "undefined") {
                elementMontageId = labelInOwner; //TODO format more appropriately for use in DOM?
                if (!serialization.properties) {
                    serialization.properties = {};
                }
                serialization.properties.element = {"#": elementMontageId};
            }

            if (typeof identifier === "undefined") {
                identifier = labelInOwner; //TODO lower case the identifier?
                if (!serialization.properties) {
                    serialization.properties = {};
                }
                serialization.properties.identifier = identifier;
            }

            deferredUndo = Promise.defer();
            self.undoManager.register("Add Component", deferredUndo.promise);

            proxy = ReelProxy.create().init(labelInOwner, serialization, this);
            proxy.markup = markup; //TODO formalize this, ComponentProxy subclass?
            proxy.elementMontageId = elementMontageId; //TODO same here

            if (this._editingController) {
                proxyPromise = this._editingController.addComponent(labelInOwner, serialization, markup, elementMontageId, identifier)
                    .then(function (newComponent) {
                        proxy.stageObject = newComponent;
                        return proxy;
                    });
            } else {
                proxyPromise = Promise.resolve(proxy);
            }

            return proxyPromise.then(function (resolvedProxy) {

                if (markup) {
                    resolvedProxy.element = self._createElementFromMarkup(markup, elementMontageId);
                }

                self._addProxies(resolvedProxy);

                self.dispatchEventNamed("didAddComponent", true, true, {
                    component: resolvedProxy
                });

                if (self.selectObjectsOnAddition) {
                    self.clearSelectedObjects();
                    self.selectObject(resolvedProxy);
                }

                deferredUndo.resolve([self.removeComponent, self, resolvedProxy]);

                return resolvedProxy;
            });
        }
    },

    removeComponent: {
        value: function (proxy) {

            var self = this,
                removalPromise,
                deferredUndo = Promise.defer();

            this.undoManager.register("Remove Component", deferredUndo.promise);

            if (this._editingController) {
                removalPromise = this._editingController.removeComponent(proxy.stageObject)
                    .then(function () {
                        return proxy;
                    });
            } else {
                removalPromise = Promise.resolve(proxy);
            }

            return removalPromise.then(function (removedProxy) {
                self._removeProxies(removedProxy);

                self.dispatchEventNamed("didRemoveComponent", true, true, {
                    component: removedProxy
                });

                deferredUndo.resolve([
                    self.addComponent,
                    self,
                    removedProxy.label,
                    removedProxy.serialization,
                    removedProxy.markup,
                    removedProxy.elementMontageId,
                    removedProxy.getPath("properties.identifier")]);

                return removedProxy;
            });
        }
    },

    setOwnedObjectProperty: {
        value: function (proxy, property, value) {

            var undoManager = this.undoManager,
                undoneValue = proxy.getObjectProperty(property);

            //TODO maybe the proxy shouldn't be involved in doing this as we hand out the proxies
            // throughout the editingEnvironment, I don't want to expose accessible editing APIs
            // that do not go through the editingDocument...or do I?

            // Might be nice to have an editing API that avoids undoability and event dispatching?
            proxy.setObjectProperty(property, value);

            this._buildSerialization();

            this.dispatchEventNamed("didSetObjectProperty", true, true, {
                object: proxy,
                property: property,
                value: value,
                undone: undoManager.isUndoing,
                redone: undoManager.isRedoing
            });

            undoManager.register("Set Property", Promise.resolve([this.setOwnedObjectProperty, this, proxy, property, undoneValue]));
        }
    },

    defineObjectBinding: {
        value: function (sourceObject, sourceObjectPropertyPath, boundObject, boundObjectPropertyPath, oneWay, converter) {
            // TODO locaize
            this.undoManager.register("Define Binding", Promise.resolve([this.deleteBinding, this, sourceObject, sourceObjectPropertyPath]));

            //Similar concerns above, where does this API belong?
            sourceObject.defineObjectBinding(sourceObjectPropertyPath, boundObject, boundObjectPropertyPath, oneWay, converter);

            this._buildSerialization();

            this.dispatchEventNamed("didDefineBinding", true, true, {
                sourceObject: sourceObject,
                sourceObjectPropertyPath: sourceObjectPropertyPath,
                boundObject: boundObject,
                boundObjectPropertyPath: boundObjectPropertyPath,
                oneWay: oneWay,
                converter: converter
            });

        }
    },

    cancelObjectBinding: {
        value: function (sourceObject, sourceObjectPropertyPath) {
            var binding = sourceObject.bindings ? sourceObject.bindings[sourceObjectPropertyPath] : null,
                bindingString,
                converterEntry,
                boundObjectLabel,
                boundObject,
                boundObjectPropertyPath,
                oneWay,
                converter;

            if (!binding) {
                throw new Error("Cannot remove binding that does not exist");
            }

            //TODO what if we can't find an object with the label?
            //TODO rely on a deserializer from the package to help us decode this string
            oneWay = !!binding["<-"];
            bindingString = oneWay ? binding["<-"] : binding["<->"];
            bindingString.match(/^@([^\.]+)\.?(.*)$/);

            boundObjectLabel = RegExp.$1;
            boundObjectPropertyPath = RegExp.$2;

            //TODO what if boundObjectLabel and boundObjectPropertyPath are malformed?

            boundObject = this.editingProxyMap[boundObjectLabel];

            converterEntry = binding.converter;
            if (converterEntry) {
                converter = this.editingProxyMap[converterEntry["@"]];
            }

            // TODO localize
            this.undoManager.register("Delete Binding", Promise.resolve([this.defineBinding, this, sourceObject, sourceObjectPropertyPath, boundObject, boundObjectPropertyPath, oneWay, converter]));

            sourceObject.cancelObjectBinding(sourceObjectPropertyPath);

            this._buildSerialization();

            this.dispatchEventNamed("didDeleteBinding", true, true, {
                sourceObject: sourceObject,
                sourceObjectPropertyPath: sourceObjectPropertyPath,
                boundObject: boundObject,
                boundObjectPropertyPath: boundObjectPropertyPath
            });
        }
    }

});
