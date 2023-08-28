/// <reference path="../typing/mpflutter.d.ts" />

let wasmInstances: Record<string, WebAssembly.WebAssemblyInstantiatedSource> =
  {};
let wasmEventSinks: Record<string, (data: any) => void> = {};

export class MPWasmMethodChannel extends MPMethodChannel {
  async onMethodCall(method: string, params: any): Promise<any> {
    if (method === "loadInstance") {
      const refId = params["refId"] as string;
      const filePath = params["filePath"] as string;
      const envFunctions = params["envFunctions"] as string[];
      let importObj = { env: {} as any };
      envFunctions.forEach((it) => {
        importObj.env[it] = (...args: any[]) => {
          wasmEventSinks[refId]?.({ envFunction: it, args: args });
        };
      });
      return new Promise((resolve, reject) => {
        fetch(filePath)
          .then((bytes) => bytes.arrayBuffer())
          .then((module) => WebAssembly.instantiate(module, importObj))
          .then((finalcode) => {
            wasmInstances[refId] = finalcode;
            resolve(null);
          })
          .catch((e) => {
            reject(e);
          });
      });
    } else if (method === "destroyInstance") {
      const refId = params["refId"] as string;
      delete wasmInstances[refId];
    } else if (method === "callExport") {
      const refId = params["refId"] as string;
      const method = params["method"] as string;
      const args = params["args"] as any[];
      const wasmInstance = wasmInstances[refId];
      if (!wasmInstance) {
        throw new Error("wasm instance not found.");
      }
      const result = (wasmInstance.instance.exports[method] as Function)(
        ...args
      );
      return result;
    } else {
      throw new Error("Method not implemented.");
    }
  }
}

export class MPWasmEventChannel extends MPEventChannel {
  onListen(params: any, eventSink: (data: any) => void) {
    const refId = params["refId"] as string;
    wasmEventSinks[refId] = eventSink;
  }

  onCancel(params: any) {
    const refId = params["refId"] as string;
    delete wasmEventSinks[refId];
  }
}

pluginRegisterer.registerChannel(
  "com.mpflutter.mpwasmMethodChannel",
  MPWasmMethodChannel
);

pluginRegisterer.registerChannel(
  "com.mpflutter.mpwasmEventChannel",
  MPWasmEventChannel
);
