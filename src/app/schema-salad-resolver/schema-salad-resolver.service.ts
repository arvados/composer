import {Injectable} from "@angular/core";
import * as yaml from "js-yaml";
import * as request from "request";
import {LoadOptions} from "js-yaml";
import {RecursiveNestingError} from "./errors/recursive-nesting.error";
import {FileRepositoryService} from "../file-repository/file-repository.service"

@Injectable()
export class SchemaSaladResolver {

    constructor(private fileRepo: FileRepositoryService) {
    }

    static isUrl(s) {
        const regexp = /^(ftp|http|https):\/\/.*/i;
        return regexp.test(s);
    }

    static isLocalFile(filepath: string) {
        const isWin = /^win/.test(process.platform);
        if (isWin) {
            return (/^[a-z]:\\.+$/i).test(filepath);
        }

        return filepath.startsWith("/");
    }

    traverse(data, source, root, rootPath, graph = {}, traversedExternalPaths?) {

        return new Promise((resolve, reject) => {

            const future = [];

            const isResolvableGraph = root.$graph !== undefined;

            for (let key in data) {

                const entry = data[key];

                const isExternalResource = typeof entry === "string" && [
                    "run",
                    "$mixin",
                    "$import",
                    "$include"
                ].indexOf(key) !== -1;

                const isGraphReference    = isExternalResource && key === "run" && entry.startsWith("#");
                const isGraphSubreference = !isExternalResource && typeof entry === "string" && entry.startsWith("#") && entry.indexOf("/") !== -1;

                if (isGraphSubreference && isResolvableGraph) {

                    const [graphKey, ...rest] = entry.substr(1).split("/");
                    const remains             = rest.join("/");

                    if (graph[graphKey]) {
                        data[key] = remains;
                        future.push(Promise.resolve(1));
                    } else {
                        future.push(Promise.reject(new Error(`Could not dereference a non-existing $graph path for “${entry}”`)));
                    }


                } else if (isGraphReference) {
                    const embedding = new Promise((resolve, reject) => {
                        const graphID = entry.slice(1);
                        if (graph[graphID]) {

                            Object.assign(data, {
                                [key]: graph[graphID]
                            });

                            resolve();
                            return;
                        }

                        reject(new Error(`Graph id “${entry}” has no corresponding $graph entry`));
                    });

                    future.push(embedding);
                } else if (isExternalResource) {
                    future.push(new Promise((resolve, reject) => {

                        let externalPathParts = source.split("/").slice(0, -1);
                        let entryPathParts = entry.split("/");
                        while (entryPathParts.length > 0) {
                            let front = entryPathParts.shift();
                            if (front == ".") {
                                continue;
                            } else if (front == "..") {
                                externalPathParts.pop();
                            } else {
                                externalPathParts.push(front);
                            }
                        }

                        let externalPath = externalPathParts.join("/");

                        if (SchemaSaladResolver.isUrl(entry) || (!SchemaSaladResolver.isUrl(source) && SchemaSaladResolver.isLocalFile(entry))) {
                            externalPath = entry;
                        }

                        let patchFn;

                        // Each root external resource pass Set to nesting structures to avoid infinite recursion
                        const traversed = traversedExternalPaths || new Set<string>([rootPath]);

                        // Avoid recursive nesting
                        if (traversed.has(externalPath)) {
                            throw new RecursiveNestingError(`${externalPath}`);
                        }

                        traversed.add(externalPath);

                        this.resolve(externalPath, {
                            type: key === "$include" ? "text" : "json"
                        }, rootPath, traversed).then((content) => {
                            switch (key) {

                            case "$import":
                                Object.keys(data).forEach(k => delete data[k]);
                                Object.assign(data, content);
                                break;
                            case "$include":
                                data[key] = content;

                                break;

                            case "$mixin":
                                const newData = {};
                                for (let k in data) {
                                    if (k === "$mixin") {
                                        Object.assign(newData, content);
                                        continue;
                                    }
                                    newData[k] = data[k];
                                }

                                Object.keys(data).forEach(k => delete data[k]);
                                Object.assign(data, newData);

                                break;
                            case "run":
                            default:
                                Object.assign(data, {
                                    [key]: content,
                                    "sbg:rdfId": entry,
                                    "sbg:rdfSource": externalPath
                                });
                                break;
                            }

                            resolve(patchFn);
                        }, reject);
                    }));
                } else if (entry && typeof entry === "object") {
                    future.push(this.traverse(entry, source, root, rootPath, graph, traversedExternalPaths));
                } else {
                    future.push(new Promise(resolve => resolve()));
                }
            }

            Promise.all(future).then(() => {

                Object.keys(data).forEach(k => {

                    if (data[k] !== null && typeof data[k] === "object" && !Array.isArray(data[k]) && data[k]["$include"]) {
                        data[k] = data[k]["$include"];
                    }
                });

                resolve(data);
            }, reject);
        });
    }

    parseJSON(content, source, rootPath, root?, graph?, traversedExternalPaths?) {
        return new Promise((resolve, reject) => {
            const data = yaml.safeLoad(content, {
                filename: source,
                onWarning: (warning) => {
                    console.log(warning);
                },
                json: true
            } as LoadOptions) || {};

            if (typeof root === "string") {
                root = yaml.safeLoad(root, {json: true} as LoadOptions);
            }

            if (!graph) {
                graph = {};
                if (data.$graph && Array.isArray(data.$graph)) {
                    graph = data.$graph.reduce((acc, entry) => {
                        return Object.assign(acc, {[entry.id]: entry});
                    }, {});
                }
            }

            this.traverse(data, source, root, rootPath, graph, traversedExternalPaths).then(resolve, reject);
        });
    }

    /**
     * @param filename
     * @param options
     * @param rootPath
     * @param traversedExternalPaths
     * @returns {Promise<Object>|Promise}
     */
    resolve(filename, options, rootPath, traversedExternalPaths) {

        options = Object.assign({
            type: "json"
        }, options);

        return new Promise((resolve, reject) => {

            let call = new Promise((resolve, reject) => {
                /*if (isUrl(filename)) {
                  request(filename, (err, response, body) => {
                  if (err) return reject(err);
                  resolve(body);
                  });
                  } else {
                  fs.readFile(filename, {encoding: "utf8", flag: "r"}, (err, data) => {
                  if (err) return reject(err);

                  resolve(data);
                  });
                  }*/
                this.fileRepo.fetchFile(filename).then((data) => {
                    resolve(data);
                });
            });

            call.then((body) => {
                if (options.type === "json") {
                    try {
                        this.parseJSON(body, filename, rootPath, body, null, traversedExternalPaths).then(resolve, reject);
                    } catch (ex) {
                        reject(ex);
                    }
                } else {
                    resolve(body);
                }
            }, reject);
        });
    }

    resolveContent(content, path): Promise<Object> {
        return new Promise((resolve, reject) => {
            try {
                // Root path is path at this point
                this.parseJSON(content, path, path, content).then(resolve, reject);
            } catch (ex) {
                reject(ex);
            }
        })
    }
}
