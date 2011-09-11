# Overview
This is a JSON-RPC protocol implementation in NodeJS that follows JSON-RPC 2.0 specs. The good and also bad thing about this library is that it enforces method handler modules to have a certain convention/design pattern. However, it allows the server to automatically extract documentation from the handler (Introspection). This library is still under development.

## Features
- Handle GET/POST request
- Better error feedbacks
- Allow method namespacing (Module.method)
- Allow exposure of all methods inside a module
- Introspection (in progress)
- Authentication (in progress)

