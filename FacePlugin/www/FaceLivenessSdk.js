/**
 * `cordova.plugins.FaceLivenessSdk` — the plugin as plain, non-bundled JavaScript.
 *
 * Cordova clobbers this module onto `cordova.plugins.FaceLivenessSdk` once `deviceready` has
 * fired, so a page with no build step can call the plugin directly. TypeScript apps should
 * import the typed API from `face-liveness-cordova` instead, which is the same surface with
 * types, an engine wrapper and the result helpers.
 *
 * Every method returns a Promise. The native side runs liveness in the FacePlugin engine and on
 * the native screens; nothing about liveness happens here.
 */

var exec = require('cordova/exec');

var PLUGIN = 'FaceLivenessSdk';

function call(action, options) {
  return new Promise(function (resolve, reject) {
    exec(
      resolve,
      function (reason) {
        if (reason instanceof Error) {
          reject(reason);
          return;
        }
        if (typeof reason === 'string') {
          reject(new Error(reason));
          return;
        }
        var error = new Error(
          (reason && reason.message) || PLUGIN + '.' + action + '() failed'
        );
        if (reason && reason.code) error.name = reason.code;
        reject(error);
      },
      PLUGIN,
      action,
      [options || {}]
    );
  });
}

module.exports = {
  /** Activate the engine and load the models. Resolves with `{ code }`. */
  start: function (options) {
    return call('start', options);
  },

  /** What the licence key unlocks: `{ licensed, level, levelName, recognition, liveness, label }`. */
  licenseStatus: function () {
    return call('licenseStatus');
  },

  /** The engine's own message for the last activation failure, as `{ message }`. */
  lastLicenseError: function () {
    return call('lastLicenseError');
  },

  /** This device's machine code, as `{ code }`, for issuing an offline licence. */
  machineCode: function () {
    return call('machineCode');
  },

  /**
   * Opens the native guided active-liveness screen and waits for the attempt to finish.
   * Resolves with `{ result }`, or `{}` when the user closed the screen first.
   */
  startActiveLiveness: function (options) {
    return call('startActiveLiveness', options);
  },

  /** Opens the native passive-liveness screen. It has no result; the user closes it. */
  startPassiveLiveness: function (options) {
    return call('startPassiveLiveness', options);
  }
};
