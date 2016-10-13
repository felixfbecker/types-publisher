"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const assert = require("assert");
const fs = require("fs");
const io_1 = require("../util/io");
const util_1 = require("../util/util");
const common_1 = require("./common");
const versionsFilename = "data/versions.json";
const changesFilename = "data/version-changes.txt";
class Versions {
    constructor(data) {
        this.data = data;
    }
    static load() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Versions(yield io_1.readJson(versionsFilename));
        });
    }
    static existsSync() {
        return fs.existsSync(versionsFilename);
    }
    /** Calculates versions and changed packages by comparing contentHash of parsed packages the NPM registry. */
    static determineFromNpm({ typings, notNeeded }, log, forceUpdate) {
        return __awaiter(this, void 0, void 0, function* () {
            const changes = [];
            const data = {};
            yield util_1.nAtATime(25, typings, (pkg) => __awaiter(this, void 0, void 0, function* () {
                const packageName = pkg.typingsPackageName;
                let { version, contentHash, deprecated } = yield fetchVersionInfoFromNpm(packageName);
                assert(!deprecated, `Package ${packageName} has been deprecated, so we shouldn't have parsed it. Was it re-added?`);
                if (forceUpdate || pkg.contentHash !== contentHash) {
                    log(`Changed: ${packageName}`);
                    changes.push(packageName);
                    version++;
                    contentHash = pkg.contentHash;
                }
                data[packageName] = { version, contentHash, deprecated };
            }));
            yield util_1.nAtATime(25, notNeeded, (pkg) => __awaiter(this, void 0, void 0, function* () {
                const packageName = pkg.typingsPackageName;
                let { version, contentHash, deprecated } = yield fetchVersionInfoFromNpm(packageName);
                if (!deprecated) {
                    log(`Now deprecated: ${packageName}`);
                    changes.push(packageName);
                    version++;
                }
                data[packageName] = { version, contentHash, deprecated };
            }));
            return { changes, versions: new Versions(data) };
        });
    }
    save() {
        return io_1.writeFile(versionsFilename, this.render());
    }
    versionInfo(typing) {
        const info = this.data[typing.typingsPackageName];
        if (!info) {
            throw new Error(`No version info for ${typing.typingsPackageName}`);
        }
        return info;
    }
    render() {
        return JSON.stringify(this.data, undefined, 4);
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Versions;
function fetchVersionInfoFromNpm(packageName) {
    return __awaiter(this, void 0, void 0, function* () {
        const escapedPackageName = common_1.fullPackageName(packageName).replace(/\//g, "%2f");
        const uri = common_1.settings.npmRegistry + escapedPackageName;
        const info = yield io_1.fetchJson(uri);
        if (info.error) {
            if (info.error === "Not found") {
                return { version: 0, contentHash: "", deprecated: false };
            }
            else {
                throw new Error(`Error getting version of ${packageName}: ${info.error}`);
            }
        }
        else {
            const versionSemver = info["dist-tags"].latest;
            assert(typeof versionSemver === "string");
            const latestVersionInfo = info.versions[versionSemver];
            assert(!!latestVersionInfo);
            const contentHash = latestVersionInfo.typesPublisherContentHash || "";
            const deprecated = !!latestVersionInfo.deprecated;
            return { version: versionNumberFromSemver(versionSemver), contentHash, deprecated };
        }
    });
}
function versionNumberFromSemver(semver) {
    const rgx = /^\d+\.\d+\.(\d+)$/;
    const match = rgx.exec(semver);
    if (!match) {
        throw new Error(`Unexpected semver: ${semver}`);
    }
    return Number.parseInt(match[1], 10);
}
function readChanges() {
    return __awaiter(this, void 0, void 0, function* () {
        return (yield io_1.readFile(changesFilename)).split("\n");
    });
}
function writeChanges(changes) {
    return io_1.writeFile(changesFilename, changes.join("\n"));
}
exports.writeChanges = writeChanges;
function changedPackages(allPackages) {
    return __awaiter(this, void 0, void 0, function* () {
        const changes = yield readChanges();
        return changes.map(changedPackageName => {
            const pkg = allPackages.find(p => p.typingsPackageName === changedPackageName);
            if (pkg === undefined) {
                throw new Error(`Expected to find a package named ${changedPackageName}`);
            }
            return pkg;
        });
    });
}
exports.changedPackages = changedPackages;
//# sourceMappingURL=versions.js.map