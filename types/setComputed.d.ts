declare function setComputed(dependencies: any): ([k, store]: [any, (string | undefined)?], fn: any, ...args: any[]) => boolean;
export default setComputed;
