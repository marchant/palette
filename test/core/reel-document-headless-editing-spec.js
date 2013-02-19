var Montage = require("montage").Montage,
    Template = require("montage/ui/template").Template,
    Promise = require("montage/core/promise").Promise,
    mockReelDocument = require("test/mocks/reel-document-mocks").mockReelDocument,
    WAITSFOR_TIMEOUT = 2500;

describe("core/reel-document-headless-editing-spec", function () {

    var reelDocumentPromise;

    beforeEach(function () {
        reelDocumentPromise = mockReelDocument("foo/bar/mock.reel", {
            "owner": {
                "properties": {
                    "element": {"#": "ownerElement"}
                }
            },
            "foo": {
                "properties": {
                    "element": {"#": "foo"}
                }
            },
            "bar": {}
        }, '<div data-montage-id="ownerElement"></div><div data-montage-id="foo"></div>');
    });

    describe("adding a component", function () {

        var labelInOwner = "myComponent",
            serialization = {prototype: "test/my-component.reel"},
            markup = '<div></div>',
            elementMontageId = "myComponentId",
            identifier = "myComponentIdentifier";

        it("should return a promise for a proxy of the added component", function () {
            return reelDocumentPromise.then(function (reelDocument) {
                var addedComponent = reelDocument.addComponent(labelInOwner, serialization, markup, elementMontageId, identifier);
                expect(Promise.isPromiseAlike(addedComponent)).toBeTruthy();
                return addedComponent;
            }).timeout(WAITSFOR_TIMEOUT).done();
        });

        it("should add the proxy to the editing document", function () {
            return reelDocumentPromise.then(function (reelDocument) {
                var addedComponent = reelDocument.addComponent(labelInOwner, serialization, markup, elementMontageId, identifier);
                return addedComponent.then(function (proxy) {
                    expect(proxy).toBeTruthy();
                    expect(reelDocument.editingProxyMap[labelInOwner]).toBe(proxy);
                    expect(reelDocument.editingProxies.indexOf(proxy) >= 0).toBeTruthy();
                });
            }).timeout(WAITSFOR_TIMEOUT);
        });

        it("should add the component to the serialization of the editing document", function () {
            return reelDocumentPromise.then(function (reelDocument) {
                var addedComponent = reelDocument.addComponent(labelInOwner, serialization, markup, elementMontageId, identifier),
                    templateSerialization;

                return addedComponent.then(function (proxy) {
                    templateSerialization = JSON.parse(reelDocument.serialization);
                    expect(templateSerialization[labelInOwner]).toBeTruthy();
                });
            }).timeout(WAITSFOR_TIMEOUT);
        });
    });

    describe("removing a component", function () {

        var labelInOwner = "foo";

        it("should return a promise for a removed proxy", function () {
            return reelDocumentPromise.then(function (reelDocument) {
                var proxyToRemove = reelDocument.editingProxyMap[labelInOwner],
                    removalPromise = reelDocument.removeComponent(proxyToRemove);

                expect(Promise.isPromiseAlike(removalPromise)).toBeTruthy();
                return removalPromise;
            }).timeout(WAITSFOR_TIMEOUT).done();
        });

        it("should remove the proxy from the editing document", function () {
            return reelDocumentPromise.then(function (reelDocument) {
                var proxyToRemove = reelDocument.editingProxyMap[labelInOwner];

                return reelDocument.removeComponent(proxyToRemove).then(function (removedProxy) {
                    expect(removedProxy).toBeTruthy();
                    expect(reelDocument.editingProxyMap[labelInOwner]).toBeUndefined();
                    expect(reelDocument.editingProxies.indexOf(removedProxy) === -1).toBeTruthy();
                });
            }).timeout(WAITSFOR_TIMEOUT);
        });

        it("should remove the component from the serialization of the editing document", function () {
            return reelDocumentPromise.then(function (reelDocument) {
                var proxyToRemove = reelDocument.editingProxyMap[labelInOwner],
                    removalPromise = reelDocument.removeComponent(proxyToRemove),
                    templateSerialization;

                return removalPromise.then(function () {
                    templateSerialization = JSON.parse(reelDocument.serialization);
                    expect(templateSerialization[labelInOwner]).toBeUndefined();
                });
            }).timeout(WAITSFOR_TIMEOUT);
        });

        it("must not remove any other components from the serialization of the editing document", function () {
            return reelDocumentPromise.then(function (reelDocument) {
                var proxyToRemove = reelDocument.editingProxyMap[labelInOwner],
                    removalPromise = reelDocument.removeObject(proxyToRemove),
                    templateSerialization;

                return removalPromise.then(function () {
                    expect(reelDocument.editingProxies.length).toBe(2);
                    templateSerialization = JSON.parse(reelDocument.serialization);
                    expect(templateSerialization.owner).toBeTruthy();
                    expect(templateSerialization.bar).toBeTruthy();
                });
            }).timeout(WAITSFOR_TIMEOUT);
        });
    });

    describe("adding an object", function () {

        var labelInOwner = "myObject",
            serialization = {prototype: "test/my-object"};

        it("should return a promise for a proxy of the added object", function () {
            return reelDocumentPromise.then(function (reelDocument) {
                var addedObject = reelDocument.addObject(labelInOwner, serialization);
                expect(Promise.isPromiseAlike(addedObject)).toBeTruthy();
                return addedObject;
            }).timeout(WAITSFOR_TIMEOUT).done();
        });

        it("should add the proxy to the editing document", function () {
            return reelDocumentPromise.then(function (reelDocument) {
                return reelDocument.addObject(labelInOwner, serialization).then(function (proxy) {
                    expect(proxy).toBeTruthy();
                    expect(reelDocument.editingProxyMap[labelInOwner]).toBe(proxy);
                    expect(reelDocument.editingProxies.indexOf(proxy) >= 0).toBeTruthy();
                });
            }).timeout(WAITSFOR_TIMEOUT);
        });

        it("should add the component to the serialization of the editing document", function () {
            return reelDocumentPromise.then(function (reelDocument) {
                var addedObject = reelDocument.addObject(labelInOwner, serialization),
                    templateSerialization;

                return addedObject.then(function (proxy) {
                    templateSerialization = JSON.parse(reelDocument.serialization);
                    expect(templateSerialization[labelInOwner]).toBeTruthy();
                });
            }).timeout(WAITSFOR_TIMEOUT);
        });

    });

    describe("removing an object", function () {

        var labelInOwner = "bar",
            proxyToRemove;

        it("should return a promise for a removed proxy", function () {
            return reelDocumentPromise.then(function (reelDocument) {
                var proxyToRemove = reelDocument.editingProxyMap[labelInOwner],
                    removalPromise = reelDocument.removeObject(proxyToRemove);

                expect(Promise.isPromiseAlike(removalPromise)).toBeTruthy();
                return removalPromise;
            }).timeout(WAITSFOR_TIMEOUT).done();
        });

        it("should remove the proxy from the editing document", function () {
            return reelDocumentPromise.then(function (reelDocument) {
                var proxyToRemove = reelDocument.editingProxyMap[labelInOwner],
                    removalPromise = reelDocument.removeObject(proxyToRemove);

                return removalPromise.then(function (removedProxy) {
                    expect(removedProxy).toBeTruthy();
                    expect(reelDocument.editingProxyMap[labelInOwner]).toBeUndefined();
                    expect(reelDocument.editingProxies.indexOf(removedProxy) === -1).toBeTruthy();
                });
            }).timeout(WAITSFOR_TIMEOUT);
        });

        it("should remove the object from the serialization of the editing document", function () {
            return reelDocumentPromise.then(function (reelDocument) {
                var proxyToRemove = reelDocument.editingProxyMap[labelInOwner],
                    removalPromise = reelDocument.removeObject(proxyToRemove),
                    templateSerialization;

                return removalPromise.then(function () {
                    templateSerialization = JSON.parse(reelDocument.serialization);
                    expect(templateSerialization[labelInOwner]).toBeUndefined();
                });
            }).timeout(WAITSFOR_TIMEOUT);
        });

        it("must not remove any other objects from the serialization of the editing document", function () {
            return reelDocumentPromise.then(function (reelDocument) {
                var proxyToRemove = reelDocument.editingProxyMap[labelInOwner],
                    removalPromise = reelDocument.removeObject(proxyToRemove),
                    templateSerialization;

                return removalPromise.then(function () {
                    expect(reelDocument.editingProxies.length).toBe(2);
                    templateSerialization = JSON.parse(reelDocument.serialization);
                    expect(templateSerialization.owner).toBeTruthy();
                    expect(templateSerialization.foo).toBeTruthy();
                });
            }).timeout(WAITSFOR_TIMEOUT);
        });

    });

    describe("setting a property on an object", function () {

        var labelInOwner = "bar",
            proxyToEdit;

        beforeEach(function () {

        });

        it("should set the property on the proxy to be the expected value", function () {
            return reelDocumentPromise.then(function (reelDocument) {
                var proxyToEdit = reelDocument.editingProxyMap[labelInOwner];
                reelDocument.setOwnedObjectProperty(proxyToEdit, "prop", "myValue");

                expect(proxyToEdit.properties.prop).toBe("myValue");
            });
        });

        it("should set the property in the serialization to be the expected value", function () {
            return reelDocumentPromise.then(function (reelDocument) {
                var proxyToEdit = reelDocument.editingProxyMap[labelInOwner],
                    templateSerialization;

                reelDocument.setOwnedObjectProperty(proxyToEdit, "prop", "myValue");
                templateSerialization = JSON.parse(reelDocument.serialization);

                expect(templateSerialization[labelInOwner].properties.prop).toBe("myValue");
            });
        });

    });

    describe("adding a serialized editing payload", function () {

    });

});
