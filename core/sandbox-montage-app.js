var Promise = require("montage/core/promise").Promise;

module.exports = sandboxMontageApp;
function sandboxMontageApp(applicationLocation, frameWindow) {
    // Ensure trailing slash
    applicationLocation = applicationLocation.replace(/([^\/])$/, "$1/");
    if (!frameWindow) {
        var iframe = document.createElement("iframe");
        iframe.style.display = "none";
        document.body.appendChild(iframe);

        frameWindow = iframe.contentWindow;
    }

    var booted = Promise.defer();

    var frameDocument = frameWindow.document;

    frameWindow.addEventListener("message", function (event) {
        if (event.data.type === "montageReady") {
            frameWindow.postMessage({
                type: "montageInit",
                location: applicationLocation
            }, "*");
        }
    }, true);

    frameWindow.montageDidLoad = function () {
        booted.resolve([frameWindow.require, frameWindow.montageRequire]);
    };

    // Need all XHRs to have withCredentials.
    var XHR = frameWindow.XMLHttpRequest;
    frameWindow.XMLHttpRequest = function () {
        var xhr = new XHR();
        xhr.withCredentials = true;
        return xhr;
    };

    var montageLocation = applicationLocation + "node_modules/montage/montage.js";
    var script = document.createElement("script");
    script.src = montageLocation;
    script.dataset.remoteTrigger = window.location.origin;
    // Bootstrapper removes the script tag when done, so no need
    // to do it here on load
    frameDocument.head.appendChild(script);

    return booted.promise.timeout(10000, "Montage from " + applicationLocation + " timed out while booting");
}
