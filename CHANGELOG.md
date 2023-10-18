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
## [08/10/2023]
- Azure relay communication has been established and successfully locally tested. Need to test this remotely
- The extension can now watch on created files / folders so the ```dev-builds``` folder can be synced up immediately for each successful built component without having to wait for the whole build process to complete to sync.<br />
  ### Constraints:
    - Race condition with loading components asynchronously. Regardless of strict checks, quite frequently, current list components (Unpaid Invoices, Invoice List,...), Dashboard, and Report components cannot be replaced with the locally built ones (this is a UI-Loader problem to think about).
## [10/10/2023]
- The UI-Loader has been updated to ensure the asynchronous function is called before the synchronous one and hence, this cures the race condition issue.
- Extension and Server settings are now available in the view section.
## [11/10/2023] - Update to Version 2
- Make use of ```rollup``` watch build technology for hot reloading. The initial build per component still takes a bit of time (roughly 30 - 40 seconds), however, from then on, it usually takes 1 - 5 seconds to reload per component as the ```livereload``` snippet is injected into the bundle which will enable ```livereload``` on a web app. This should give the best developer experience as possible comparing with the version 1
- Save on file will also now trace the sources of import - in addition to the original method (brute-force finding at least 1 instantiable). The original method has also been updated so that it only returns non-duplicates. This will in hope, ease the watch build technology.
- In accordance to the V2 changes, new terminals will only open on the ground of new saved component is found<br />
  ### Constraints:
    - With this new change comes an issue with watch building from a really large repo (UI-Reports or Dashboard,...), and [most of the time, it's probably because of a memory leak](https://stackoverflow.com/questions/53230823/fatal-error-ineffective-mark-compacts-near-heap-limit-allocation-failed-javas) that prevents the watch build from going. Still trying to consider solutions - possibly changing to ```webpack```?
    - Despite the new source trace logic, ```livereload``` uses up a lot of computational resource even with just 3 open terminals. Might be resolved by developers themselves by manually close unused ones.
## [12/10/2023]
- Completely stop the extension from working if the root directory in a workspace is not found due to its role in the extension's functionalities. Developers must select a random file and reload VSCode to it to work properly.
## [13/10/2023]
- Externally required modules needed to be part of the inclusion list in ```.vscodeignore``` so that they will not be ignored when being packaged. This problem was only found when the extension was side loaded to other developers for testing purposes, and it has now been fixed.<br />
  ### Constraints:
    - UI-Loader hard-coded timeout of 200ms for the fetch API doesn’t actually work for Dariusz. Whilst some network connections only need less than 200ms for a fetch to complete, others will require a bit more. This problem could be fixed with personalised timeout.
## [15/10/2023]
- In the previous version, there was a lackage of deep trace for sources of import, meaning once the extension finds component(s) that is / are importing the saved file, the operation terminates regardless of any valid instantiation comment. We will now have an ability to traverse deeper into the sources of import when a saved file is a child component whose immediate parent component does not contain an instantiation comment. E.g.<br />
  - BigParent.svelte (instantiation comment ✅)<br />
  |->Parent.svelte (instantiation comment ❌)<br />
    &emsp;|->Child.svelte (saved target)
  ```typescript
  BigParent.svelte
  import Parent from 'Parent.svelte';
    ⬆️
  Parent.svelte
  import Child from 'Child.svelte';
    ⬆️
  Child.svelte
  // This is the saved file, the operation should trace down the root where instantiation comment will be found...
  ```
- ```build``` folder needs watching on file creation and change events when transferring file using Azure relay, instead of ```dev-builds``` folder which only exists in the extension's workspace.
## [18/10/2023]
- Fixed issue with duplicate components to be instantiated and built in different terminal instances. This was due to not checking the visited paths and active terminal IDs when brute-force finding instantiables and tracing for sources of import.
<br />
