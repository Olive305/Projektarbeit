# Start the site

Run main.py file (opens frontend and backend)

You may need to install the dependencies and start both the frontend and backend.
You have to install graphviz and add it to path (in Windows and Linux, not tested on MacOs)

## Broken Features

## Partially Broken Features

- Calculation of the generalization metric of the graph seems to be accurate but have to recheck. I have to further read into the calculation of this metric to fix this
- Special case when positioning the predicted nodes: When there is a node directly below the found gap, the gap is displaced on y coordinate lower for some reason

## Not tested

## Short Explanation of Key Features

(Maybe not up to date.)

The canvas displays the graph as edges and nodes (directly follows graph). The server sends predictions for nodes that should be attached, which are shown as green nodes with blue, dashed edges or in rainbow colors, based on which node the prediction is coming from. Clicking on such a prediction will select it.

Each prediction has a probability at which it should be shown as preview. The **Probability Slider** (only shown when auto probability checkbox is disabled) allows you to adjust the threshold for which predictions should be displayed. The higher the probability, the fewer predictions will be shown. There is also an option to automatically calculate the number of predictions to display. This function is enabled by default and can be toggled using the checkbox.

Clicking on existing nodes selects them. Once selected, you can delete, copy, and eventually move them simultaneously. You can also select nodes using a **Lasso** (blue rectangle).

Right-clicking on nodes or edges opens a menu that allows you to delete them. More functions will be added later.

Above the canvas, where the graphs are displayed, there are buttons. The page always opens with a "New" button. These buttons act as tabs (the design will be further refined) and allow you to open multiple graphs simultaneously. In the **File** tab (top left), you can open new tabs, open existing files, or save the graph as a file.

The **"To Petri net"** button (now in the File button in the header) opens a new tab where the graph is displayed as a Petri net. No predictions are made for Petri nets and further functions like downloading the petri Net will be added.

At the top of the header is a **Select Matrix** button. Clicking this button will display all available matrices, allowing you to switch between them. Switching the matrix will result in different node suggestions. It also shows a **Add Matrix** button, which allows to add a custom csv file for custom predictions. This matrix will only be used during the current session. It is possible to add multiple custom matrices during a session. It is also possible to remove added matrices.
