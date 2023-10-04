# volyfequickdev

## Features

This extension is used to help speed up the frontend development process at Voly, ensure that Svelte components are built and served statically, which is then fetched by an internal tool used to load components to the Voly site

![Statically served files](https://ui.voly.co.uk/extension-media/volyfequickdev-treeview.png)
<br /><sup>Statically served files are accessible from a working workspace</sup>

## Requirements

Run ```npm ci``` to install all the necesssary dependencies

## Extension Settings

No settings required

## Known Issues

1. UI-Loader will always fetch the endpoint on page load, need to add something to the Voly system as a flag to ensure it only makes call when necessary

## Release Notes

### 1.0.0

Initial release of ...

-----------------------------------------------------------------------------------------------------------
## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

### For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)
