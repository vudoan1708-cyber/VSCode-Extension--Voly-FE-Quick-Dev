# volyfequickdev

## Features

This extension is used to help speed up the frontend development process at Voly, ensure that Svelte components are built and served statically, which is then fetched by an internal tool used to load components to the Voly site

![Statically served files](https://ui.voly.co.uk/extension-media/volyfequickdev-treeview.png)
<br /><sup>Statically served files are accessible from a working workspace</sup>

## Extension Settings

No settings required

## Known Issues

1. UI-Loader will always fetch the endpoint on page load, need to add something to the Voly system as a flag to ensure it only makes call when necessary

## Release Notes

### 1.0.0

- Making use of rollup build in watch mode, the extension listens on document save event to trigger 2 commands to generate instantiation scripts and build the corresponding components.
- The Folder Explorer section from the activity bar provides a mini workspace to keep track of built files, and an ability remove them if necessary.
- The Extension Settings section allows dev to close and reopen the server, globally activate and deactivate the extension.
- The Shareable Local Connection section allows frontend dev to connect to another dev - specifically a backend dev - to transfer built component files (share their local with others) and changes can then be seen by both parties. This is currently limited to one connection per dev.

### 1.1.0
- In the previous version, there was a lackage of deep trace for sources of import, meaning once the extension finds component(s) that is / are importing the saved file, the operation terminates regardless of any valid instantiation comment. We will now have an ability to traverse deeper into the sources of import when a saved file is a child component whose immediate parent component does not contain an instantiation comment.

### 1.1.1
- Cleanup code.

### 1.1.2
- Fixed issue with duplicate components to be instantiated and built in different terminal instances. This was due to not checking the visited paths and active terminal IDs when brute-force finding instantiables and tracing for sources of import.

### 1.1.3
- Update finding instantiables logic to ensure same component can be re-instantiated if the terminal process for it has been terminated.

### 1.1.4
- Prioritise the results of the trace for import sources over ones of brute-force finding instantiables.

### 1.1.5
- Change server provider from Express to Koa for its lightweight dependencies and bundleable-ness with ```webpack```.
