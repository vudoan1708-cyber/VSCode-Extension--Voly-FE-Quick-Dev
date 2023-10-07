# Change Log

All notable changes to the "volyfequickdev" extension will be documented in this file.

## [29/09/2023]

- Initial setup and working prototype<br />
  ### Constraints:
  - <b><i>dev-builds</i></b> folder is overwritten every save, hence it cannot contain more than 1 high-level component / repo
  - Abusing saves on files can cause race conditions and only the final one that gets resolved will be on test2
  - Programmatically uninterruptible terminal processes
  - UI-Loader will always fetch the endpoint on page load, need to add something to the Voly system as a flag to ensure it only makes call when necessary
## [04/10/2023]
- <b><i>dev-builds</i></b> folder is still overwritten every save. However, the working <b><i>build</i></b> folder that is synced with it, is no longer overwritten every save (ensure the historical saves), but will be deleted everytime VSCode is shut down
- Abusing saves on files can now be tolerable, race condition might still be a problem.
- Folder view is available for manual deletion of exposed files<br />
  ### Constraints:
    - Treeview doesn't yet allow multiple file selection for deletion
## [04/10/2023]
- Treeview are now refreshable and the files can now be deleted in batch
## [04/10/2023]
- [Work in progress] Setting up [Azure Relay](https://learn.microsoft.com/en-us/azure/azure-relay/relay-what-is-it) to "expose services [to the public cloud]", which will help with socket connection between 2 different local machines from different geographical locations. This service should then be used to transfer ```dev-builds``` files from one physical machine to another<br />
  ### Constraints:
    - ```"webpack": "^5.70.0"``` is not working in production as the module ```hyco-ws``` resposible for the cloud relay service cannot be bundled.
## [07/10/2023]
- [Work in progress] Azure relay connection is successful. Data can be sent from the sender (a FE dev) to the listener (a BE dev). Just need to work out how to rewrite the buffer-like data into actual files.
- Turns out, webpack was not a problem when used with ```hyco-ws```. The module just needs to be externally required, and the environment variables need to be included as a plugin in the webpack configuration.

<br />

## Possible features:
- Changes on local servers can be shareable to specified user emails - UI-Loader will then take charge of comparing user emails to load components accordingly
