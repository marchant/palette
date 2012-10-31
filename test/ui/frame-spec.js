var Montage = require("montage").Montage,
    TestPageLoader = require("test/support/testpageloader").TestPageLoader;

var testPage = TestPageLoader.queueTest("frame", function () {
    describe("ui/frame-spec", function () {

        var test = testPage.test;

        it("should load", function () {
            expect(testPage.loaded).toBeTruthy();
        });

        describe("the montage frame", function () {

            var montageFrame = test.montageFrame,
                frameDoc = montageFrame.element.contentWindow.document,
                frameHead = montageFrame.element.contentWindow.document.head,
                frameBody = montageFrame.element.contentWindow.document.body,
                done;

            beforeEach(function () {
                done = false;
            });

            it("should have loaded the internal frame document", function () {
                var matched = /montage-frame\.reel\/frame\/frame\.html/.test(montageFrame.element.src);
                expect(matched).toBeTruthy();
                expect(montageFrame.element.contentWindow).toBeTruthy();
            });

            describe("loading no serialization", function () {

                it("should create a default owner component if no serialization provided", function () {
                    montageFrame.load().then(function (owner) {
                        expect(frameBody.firstElementChild.getAttribute("data-montage-id")).toEqual("owner");
                        expect(frameBody.firstElementChild.controller).toBe(owner);
                        done = true;
                    });

                    waitsFor(function () {
                        return done;
                    }, 10);
                });

            });

            describe("loading a serialization with no specified owner", function () {

                var serialization = '{\n\t"button": {\n\t\t"prototype": "montage/ui/button.reel",\n\t\t"properties": {\n\t\t\t"element": {"#": "myButton"}\n\t\t}\n\t}\n}',
                    html = '<button data-montage-id="myButton"></button>';

                it("should create a default owner component", function () {
                    montageFrame.load(serialization, html).then(function (owner) {
                        expect(owner).toBeTruthy();
                        done = true;
                    });

                    waitsFor(function () {
                        return done;
                    }, "MontageFrame to load owner component", 10);
                });

                it("should move specified content into synthesized owner element", function () {
                    montageFrame.load(serialization, html).then(function (owner) {
                        expect(frameBody.firstElementChild.getAttribute("data-montage-id")).toEqual("owner");
                        expect(frameBody.firstElementChild.controller).toBe(owner);
                        done = true;
                    });

                    waitsFor(function () {
                        return done;
                    }, "MontageFrame to load owner component", 10);
                });

            });

            describe("loading a serialization with an owner component", function () {

                var serialization = '{\n\t"owner": {\n\t\t"prototype": "montage/ui/component",\n\t\t"properties": {\n\t\t\t"element": {"#": "owner"}\n\t\t}\n\t}\n}',
                    html = '<button data-montage-id="owner" data-fromOriginalContent="true"></button>';

                it("should use owner component found in specified serialization", function () {

                    montageFrame.load(serialization, html).then(function (owner) {
                        expect(frameBody.firstElementChild.getAttribute("data-montage-id")).toEqual("owner");
                        expect(frameBody.firstElementChild.controller).toEqual(owner);
                        expect(frameBody.firstElementChild).toBe(owner.element);
                        expect(owner.element.getAttribute("data-fromOriginalContent")).toBeTruthy();
                        done = true;
                    });

                    waitsFor(function () {
                        return done;
                    }, "MontageFrame to load owner component", 10);
                });

            });

        });

    });
});
