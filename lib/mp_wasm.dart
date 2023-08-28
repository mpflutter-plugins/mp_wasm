import 'dart:async';
import 'dart:math';

import 'package:flutter/services.dart';

class MPWasmPlugin {
  static MethodChannel methodChannel = MethodChannel(
    'com.mpflutter.mpwasmMethodChannel',
  );

  static EventChannel eventChannel = EventChannel(
    'com.mpflutter.mpwasmEventChannel',
  );
}

class MPWasmInstance {
  final refId = Random().nextDouble().toString();
  final String filePath;
  final Map<String, Function(List<dynamic> args)> envFunctions;
  StreamSubscription<dynamic>? eventSink;

  MPWasmInstance({required this.filePath, this.envFunctions = const {}});

  dispose() {
    eventSink?.cancel();
    return MPWasmPlugin.methodChannel.invokeMethod("destroyInstance", {
      "refId": refId,
    });
  }

  load() async {
    await MPWasmPlugin.methodChannel.invokeMethod("loadInstance", {
      "refId": refId,
      "filePath": filePath,
      "envFunctions": envFunctions.keys.toList(),
    });
    eventSink = MPWasmPlugin.eventChannel
        .receiveBroadcastStream({"refId": refId}).listen((event) {
      if (event is Map) {
        final envFunction = event["envFunction"] as String;
        final args = event["args"] as List<dynamic>;
        (this.envFunctions[envFunction] as Function)(args);
      }
    });
  }

  Future<dynamic> callExport(String method, List<dynamic> args) async {
    return MPWasmPlugin.methodChannel.invokeMethod("callExport", {
      "refId": refId,
      "method": method,
      "args": args,
    });
  }
}
