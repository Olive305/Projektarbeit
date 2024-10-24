# Start

### On Linux and MacOS:
Run `start.sh` (not fully tested).

### On Windows:
Run `start.bat`.

These files install the dependencies and start both the frontend and backend.
You have to install graphviz and add it to path (in Windows and Linux, not tested on MacOs)

## Broken Features

- Renaming of nodes.
- Automatic node generation.
- Toggling grid on/off.
- All metrics except for `fitness` (not yet implemented).

## Partially Broken Features

- (Potentially) saving and loading of graphs as files.

## Short Explanation of Key Features

The canvas displays the graph as edges and nodes (directly follows graph). The server sends predictions for nodes that should be attached, which are shown as green nodes with blue, dashed edges or in rainbow colors, based on which node the prediction is coming from. Clicking on such a prediction will select it.

Each prediction has a probability at which it should be shown as preview. The **Probability Slider** (only shown when auto probability checkbox is disabled) allows you to adjust the threshold for which predictions should be displayed. The higher the probability, the fewer predictions will be shown. There is also an option to automatically calculate the number of predictions to display. This function is enabled by default and can be toggled using the checkbox.

Clicking on existing nodes selects them. Once selected, you can delete, copy, and eventually move them simultaneously. You can also select nodes using a **Lasso** (blue rectangle).

Right-clicking on nodes or edges opens a menu that allows you to delete them. More functions will be added later.

Above the canvas, where the graphs are displayed, there are buttons. The page always opens with a "New" button. These buttons act as tabs (the design will be further refined) and allow you to open multiple graphs simultaneously. In the **File** tab (top left), you can open new tabs, open existing files, or save the graph as a file.

The **"To Petri net"** button (now in the File button in the header) opens a new tab where the graph is displayed as a Petri net. No predictions are made for Petri nets and further functions like downloading the petri Net will be added.

At the top of the header is a **Select Matrix** button. Clicking this button will display all available matrices, allowing you to switch between them. Switching the matrix will result in different node suggestions.
