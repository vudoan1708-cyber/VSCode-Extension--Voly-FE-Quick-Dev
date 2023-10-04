# volyfequickdev

## Features

This extension is used to help speed up the frontend development process at Voly, ensure that Svelte components are built and served statically, which is then fetched by an internal tool used to load components to the Voly site

## Requirements

Run ```npm ci``` to install all the necesssary dependencies

## Extension Settings

No settings required

## Known Issues

1. CSS has to be globalised to work on staging

2. Dev build folder is overriden every save, hence it cannot contain more than 1 high-level component

3. Abuse saves on different files can cause race conditions

4. UI-Loader will always fetch the endpoint on page load, need to add something to the Voly system as a flag to ensure it only makes call when necessary

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

-----------------------------------------------------------------------------------------------------------
## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

### For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)
