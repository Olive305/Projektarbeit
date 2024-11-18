# Start the site

Run `start.sh` for Windows or `start.bat` for Linux and Mac to start the site (opens frontend and backend).

You may need to install the dependencies and start both the frontend and backend.
You have to install graphviz and add it to the path (in Windows and Linux, not tested on MacOS).

## Broken Features

- Generalization and precision are calculated wrongly (partly).

## Partially Broken Features

- Special case when positioning the predicted nodes: When there is a node directly below the found gap, the gap is displaced on the y-coordinate lower for some reason.
- There is an issue when deleting nodes; they will not be added again correctly (only in manual probability, not in auto probability).

## Not tested

## Short Explanation of Key Features

(Maybe not up to date.)

The canvas displays the graph as edges and nodes (directly follows the graph). The server sends predictions for nodes that should be attached, which are shown as green nodes with blue, dashed edges or in rainbow colors, based on which node the prediction is coming from. Clicking on such a prediction will select it.

Each prediction has a probability at which it should be shown as a preview. The **Probability Slider** (only shown when the auto probability checkbox is disabled) allows you to adjust the threshold for which predictions should be displayed. The higher the probability, the fewer predictions will be shown. There is also an option to automatically calculate the number of predictions to display. This function is enabled by default and can be toggled using the checkbox.

Clicking on existing nodes selects them. Once selected, you can delete, copy, and move them simultaneously. You can also select nodes using a **Lasso** (blue rectangle).

Right-clicking on nodes or edges opens a menu that allows you to delete them. More functions will be added later.

Above the canvas, where the graphs are displayed, there are buttons. The page always opens with a "New" button. These buttons act as tabs (the design will be further refined) and allow you to open multiple graphs simultaneously. In the **File** tab (top left), you can open new tabs, open existing files, or save the graph as a file.

The **"To Petri net"** button now downloads a Petri net representation as an image instead of opening a new tab with the Petri net.

At the top of the header is a **Select Matrix** button. Clicking this button will display all available matrices, allowing you to switch between them. Switching the matrix will result in different node suggestions. It also shows an **Add Matrix** button, which allows you to add a custom CSV file for custom predictions. This matrix will only be used during the current session. It is possible to add multiple custom matrices during a session. It is also possible to remove added matrices.

On the left control bar, there is an input to change the name of the current graph. Below that, there are three collapsible menus for the performance metrics, the probability, and the variants. In the variants menu, the variants of the process log are displayed. It is possible to search for keys inside the variants (multiple keys can be entered by separating them with a comma or a space). Furthermore, it is possible to sort them in different ways.
