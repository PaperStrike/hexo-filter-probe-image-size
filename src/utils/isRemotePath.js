const remoteRegex = /^(https?:)\/\//;

/**
 * @param {string} path
 * @return {boolean}
 */
const isRemotePath = (path) => remoteRegex.test(path);

module.exports = isRemotePath;
