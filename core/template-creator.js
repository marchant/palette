/* <copyright>
Copyright (c) 2012, Motorola Mobility LLC.
All Rights Reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice,
  this list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of Motorola Mobility LLC nor the names of its
  contributors may be used to endorse or promote products derived from this
  software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.
</copyright> */
/**
    @module montage/tools/template/template-creator
    @requires montage/ui/template
*/

exports = typeof exports !== "undefined" ? exports : {};

var Montage = require("montage/core/core").Montage;
var Template = require("montage/ui/template").Template;

/**
    @class module:montage/tools/template/template-creator.TemplateCreator
    @extends module:montage/ui/template.Template
*/
var TemplateCreator = exports.TemplateCreator = Montage.create(Template, /** @lends module:montage/tools/template/template-creator.TemplateCreator# */ {
    initWithDocument: {
        value: function(doc, montageJsPath) {
            return this.initWithHeadAndBodyElements(doc.head, doc.body, montageJsPath);
        }
    },

    initWithBodyElement: {
        value: function(body, montageJsPath) {
            return this.initWithHeadAndBodyElements(null, body, montageJsPath);
        }
    },

    initWithHeadAndBodyElements: {
        value: function(head, body, montageJsPath) {
            var serializer = this.serializer,
                objects = {},
                components = {},
                componentsChildComponents = {},
                componentsElements = {},
                doc,
                script,
                self = this;

            this._componentNamesIndex = {};
            this._objectNamesIndex = {};
            doc = this._document = document.implementation.createHTMLDocument("");

            function copyNode(sourceNode, targetNode, isRootNode) {
                var childNodes = sourceNode.childNodes,
                    childNode,
                    targetChildNode,
                    label,
                    script,
                    component = isRootNode ? null : sourceNode.controller;

                if (component) {
                    label = self._generateLabelForComponent(component, Object.keys(components));
                    componentsElements[label] = component._element;
                    component._element = targetNode;
                    components[label] = component;
                    componentsChildComponents[label] = component.childComponents;
                    component._element.setAttribute('data-ninja-node', 'true');
                    delete component.childComponents;
                } else {
                    for (var i = 0; (childNode = childNodes[i]); i++) {
                        targetChildNode = targetNode.appendChild(childNode.cloneNode(false));
                        copyNode(childNode, targetChildNode);
                    }
                }
            }

            if (head) {
                doc.head.innerHTML = head.innerHTML;
            }
            if (montageJsPath) {
               script = doc.createElement("script");
               script.setAttribute("src", montageJsPath);
               doc.head.appendChild(script);
               doc.head.insertBefore(doc.createTextNode("\n    "), script);
            }

            // try to make things look nice...
            var html = doc.documentElement;
            html.insertBefore(doc.createTextNode("\n"), doc.head);
            html.insertBefore(doc.createTextNode("\n"), doc.body);
            html.appendChild(doc.createTextNode("\n"));
            if (!head) {
                // the first child is the title
                doc.head.insertBefore(doc.createTextNode("\n    "), doc.head.firstChild);
            }

            copyNode(body, this._document.body, true);
            this._ownerSerialization = serializer.serialize(components);
            for (var label in components) {
                components[label].childComponents = componentsChildComponents[label];
                components[label]._element = componentsElements[label];
            }
            components = componentsChildComponents = null;
            this._externalObjects = serializer.getExternalObjects();

            return this;
        }
    },

    _componentNamesIndex: {
        value: null
    },

    _generateLabelForComponent: {value: function(component, labels) {
        var componentInfo = Montage.getInfoForObject(component),
            componentLabel = componentInfo.label || component.identifier,
            componentName,
            index;

        if (componentLabel) {
            return componentLabel;
        } else {
            componentName = componentInfo.objectName.toLowerCase();
            do {
                index = this._componentNamesIndex[componentName] || 1;
                this._componentNamesIndex[componentName] = index + 1;
            } while (labels.indexOf(componentName+index) >= 0);

            return componentName + index;
        }
    }},
});
