var Montage = require("montage").Montage,
    Target = require("montage/core/target").Target,
    Promise = require("montage/core/promise").Promise,
    UndoManager = require("montage/core/undo-manager").UndoManager;

exports.Document = Target.specialize( {

    constructor: {
        value: function Document() {
            this.super();

            this.defineBinding("isDirty", {
                "<-": "changeCount != 0"
            });
        }
    },

    /**
     * Return a promise for a document representing the specified URL
     *
     * @param {string} url The url for which to create a representative document
     * @return {Promise} A promise that resolves to an initialized document instance
     */
    load: {
        value: function (url) {
            return Promise.resolve(this.create().init(url));
        }
    },

    _url: {
        value: null
    },

    /**s
     * The URL this document represents
     */
    url: {
        get: function () {
            return this._url;
        }
    },

    /**
     * Initialize a document instance representing the specified URL
     *
     * @param {string} url The URL this document instance will represent
     */
    init: {
        value: function (url) {
            this._url = url;
            this.undoManager = UndoManager.create();
            return this;
        }
    },

    /**
     * The preferred type of component used for presenting this document
     */
    editorType: {
        get: function () {
            return null;
        }
    },

    /**
     * The actual component currently presenting this document
     */
    editor: {
        value: null
    },

    /**
     * The title of this document
     */
    title: {
        get: function () {
            return this.url.substring(this.url.lastIndexOf("/") + 1);
        }
    },

    _undoManager: {
        value: null
    },
    /**
     * This document's UndoManager
     */
    undoManager: {
        get: function() {
            return this._undoManager;
        },
        set: function(value) {
            if (this._undoManager === value) {
                return;
            }

            if (this._undoManager && this._undoManager.delegate === this) {
                this._undoManager.delegate = null;
            }
            this._undoManager = value;
            if (!value.delegate) {
                value.delegate = this;
            }
        }
    },

    /**
     * Perform the operation at the top of the undo stack
     */
    undo: {
        value: function () {
            return this.undoManager.undo();
        }
    },

    /**
     * Perform the operation at the top of the redo stack
     */
    redo: {
        value: function () {
            return this.undoManager.redo();
        }
    },

    /*
     *
     */
    canUndo: {
        get: function () {
            return this.getPath("undoManager.undoCount > 0");
        }
    },

    /*
     *
     */
    canRedo: {
        get: function () {
            return this.getPath("undoManager.redoCount > 0");
        }
    },

    /**
     * Saves the data to the specified dataWriter. For example:<br/>
     * <code>
     *      var serializer = Serializer.create().initWithRequire(this.packageRequire);
     *      var serializedDescription = serializer.serializeObject(this.currentProxyObject.proxiedObject);
     *      return dataWriter(serializedDescription, location);
     * </code>
     *
     * By default sets the changeCount to 0. If you override this method then
     * you must do this yourself.
     * @param {string} url The url to save this document's data to
     * @param {function} dataWriter The data writing function that will perform the data writing portion of the save operation
     */
    save: {
        value: function (url, dataWriter) {
            var self = this;
            return Promise.when(dataWriter("", url))
            .then(function (value) {
                self.changeCount = 0;
                return value;
            });
        }
    },

    /**
     * Give the document an opportunity to decide if it can be closed.
     * @return null if the document can be closed, a string withe reason it cannot close otherwise
     */
    canClose: {
        value: function () {
            // TODO PJYF This message needs to be localized
            return (this.isDirty ? "You have unsaved Changes" : null);
        }
    },

    /**
     * Whether or not this document has unsaved changes and is considered dirty
     * @type {boolean}
     */
    isDirty: {
        value: false
    },

    /**
     * The number of changes that have been made to this document. Used to set
     * isDirty to true if non-zero.
     *
     * If you are using the default undo manger created by the Document then
     * this property will be managed automatically; increasing when an undo
     * is registered or a redo is performed, and decreasing when an undo is
     * performed. If the document is saved, one or more undos are performed
     * and then a new change is registered then the changeCount is set to
     * `POSITIVE_INFINITY` as it is now not possible to return to a non-dirty
     * state.
     *
     * Note: The change count can be negative after the document is saved and
     * an undo is performed.
     * @type {number}
     */
    changeCount: {
        value: 0
    },

    didRegisterChange: {
        value: function () {
            var changeCount = this.changeCount;
            // If we are behind the save and cannot redo then we can never get
            // back to the non-dirty state.
            if (this.changeCount < 0 && !this.undoManager.canRedo) {
                this.changeCount = Number.POSITIVE_INFINITY;
            } else {
                this.changeCount = changeCount + 1;
            }
        }
    },

    didUndo: {
        value: function () {
            this.changeCount--;
        }
    },

    didRedo: {
        value: function () {
            this.changeCount++;
        }
    },

    close: {
        value: Function.noop
    }


});
