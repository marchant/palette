var Target = require("montage/core/target").Target,
    Document = require("core/document").Document,
    Promise = require("montage/core/promise").Promise,
    Map = require("montage/collections/map");

exports.DocumentController = Target.specialize({

    constructor: {
        value: function DocumentController() {
            this.super();
            this.documents = [];
            this._urlDocumentMap = new Map();
        }
    },

    _currentDocument: {
        value: null
    },

    _setCurrentDocument: {
        value: function (document) {
            if (document === this.currentDocument) {
                return;
            }

            this.dispatchBeforeOwnPropertyChange("currentDocument", this.currentDocument);
            this._currentDocument = document;
            this.acceptedCurrentDocument();
            this.dispatchOwnPropertyChange("currentDocument", this.currentDocument);
        }
    },

    /**
     * Called after the currentDocument has been changed prior to notifying outside observers
     */
    acceptedCurrentDocument: {
        value: Function.noop
    },

    currentDocument: {
        get: function () {
            return this._currentDocument;
        }
    },

    /**
     * The document prototype to used for documents representing the specified url.
     *
     * @param {string} url The url for which to find a representative document type
     * @return {object} The prototype of the document used to represent this url
     */
    documentTypeForUrl: {
        value: function (url) {
            return Document;
        }
    },

    /**
     * The open document instance representing the specified URL.
     *
     * @param {string} url The url for which to find a representative document
     * @return {EditingDocument} The instance of the document representing that url
     */
    documentForUrl: {
        value: function (url) {
            return this._urlDocumentMap.get(url);
        }
    },

    /**
     * Open a document instance representing the specified URL.
     *
     * An already open document will be yielded if it exists, otherwise a new document
     * of the appropriate type will be created and added to the collection of open documents.
     *
     * @param {string} url The url for which to open a representative document
     * @return {Promise} A promise for the document instance representing the specified url
     */
    openUrl: {
        value: function (url) {
            var openDocument = this.documentForUrl(url),
                documentType,
                doc,
                self = this;

            if (openDocument) {
                if (openDocument.url !== this._latestUrl) {
                    this._setCurrentDocument(openDocument);
                }
                return Promise(openDocument);
            } else {
                // While opening a new document that is not already the opened,
                // consider none to be current so that anything expecting a
                // document doesn't work on the wrong one
                if (!this.currentDocument || url !== this.currentDocument.url) {
                    this._setCurrentDocument(null);
                }

                this._latestUrl = url;

                documentType = this.documentTypeForUrl(url);
                if (documentType) {
                    doc = this.createDocumentWithTypeAndUrl(documentType, url);
                    this.addDocument(doc);
                    this.selectDocument(doc);
                    return this.loadDocument(doc)
                    .then(function() {
                        if (doc.url === self._latestUrl) {
                            self._setCurrentDocument(doc);
                        }
                        return doc;
                    });
                } else {
                    return Promise(null);
                }
            }
        }
    },

    /**
     * Create a document with the specified document prototype for the specified url
     *
     * By default this expects the documentType to have a `load` method which accepts
     * `url` and returns a promise for a document instance.
     *
     * This method can be overridden to specialize how how the document is created.
     *
     * @param {object} documentType The document prototype to use in creating the document
     * @param {string} url The url to create a document from
     *
     * @return {Promise} A promise for the document instance
     */
    createDocumentWithTypeAndUrl: {
        value: function (documentType, url) {
            return new documentType(url);
        }
    },

    loadDocument: {
        value: function(doc) {
            return doc.load(doc.url);
        }
    },

    /**
     * The most recent url requested to open a document for
     * @private
     */
    _latestUrl: {
        value: null
    },

    /**
     * The map of urls to their representative documents
     * @private
     */
    _urlDocumentMap: {
        value: null
    },

    /**
     * The collection of open documents
     */
    documents: {
        value: null
    },

    /**
     * Add the specified document to the documents collection
     * @param {Document} document The document to add to the collection of opened documents
     */
    addDocument: {
        value: function (document) {
            // TODO account for second document representing same url...
            var docAlreadyOpen = this._urlDocumentMap.get(document.url);
            if (!docAlreadyOpen) {
                this.documents.push(document);
                this._urlDocumentMap.set(document.url, document);
            }
        }
    },

    selectDocument: {
        value: Function.noop
    },

    /**
     * Remove the specified document from the documents collection
     * @param {Document} document The document to remove from the collection of opened documents
     */
    removeDocument: {
        value: function (document) {
            var docs = this.documents,
                docIndex = docs.indexOf(document);

            // TODO account for second document representing same url...
            if (-1 !== docIndex) {
                docs.splice(docIndex, 1);
                this._urlDocumentMap.delete(document.url);

                if (document === this.currentDocument) {
                    this._setCurrentDocument(null);
                }
            }
        }
    }

});
