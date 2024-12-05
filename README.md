# Installation

1. **Install Python**
    - Download from the [official site](https://www.python.org/downloads/)
    - Ensure Python is added to the PATH

2. **Install Node.js**
    - Download from the [official site](https://nodejs.org/en/download/package-manager)
    - If npm is not working on Windows PowerShell, adjust the PowerShell Execution Policy:
      ```powershell
      Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
      ```

3. **Install Graphviz**
    - Download from the [official site](https://graphviz.org/download/)
    - Ensure Graphviz is added to the PATH

# Start the Site

- Run `start.sh` for Windows or `start.bat` for Linux and Mac to start the site (opens frontend and backend).
- You may need to install dependencies and start both the frontend and backend.
- Ensure Graphviz is installed and added to the PATH (in Windows and Linux, not tested on MacOS).

## Broken Features

## Partially Broken Features

- From a node with no edge going to it, the node is recognized as a node with an edge from the starting node, and therefore predictions are shown incorrectly.

## Not Tested

## Short Explanation of Key Features

(Maybe not up to date.)

- The canvas displays the graph as edges and nodes (directly follows the graph). The server sends predictions for nodes that should be attached, shown as green nodes with blue, dashed edges or in rainbow colors, based on which node the prediction is coming from. Clicking on such a prediction will select it.
- Each prediction has a probability at which it should be shown as a preview. The **Probability Slider** (only shown when the auto probability checkbox is disabled) allows you to adjust the threshold for which predictions should be displayed. The higher the probability, the fewer predictions will be shown. There is also an option to automatically calculate the number of predictions to display. This function is enabled by default and can be toggled using the checkbox.
- Clicking on existing nodes selects them. Once selected, you can delete, copy, and move them simultaneously. You can also select nodes using a **Lasso** (blue rectangle).
- Right-clicking on nodes or edges opens a menu that allows you to delete them. More functions will be added later.
- Above the canvas, where the graphs are displayed, there are buttons. The page always opens with a "New" button. These buttons act as tabs (the design will be further refined) and allow you to open multiple graphs simultaneously. In the **File** tab (top left), you can open new tabs, open existing files, or save the graph as a file.
- The **"To Petri net"** button now downloads a Petri net representation as an image instead of opening a new tab with the Petri net.
- At the top of the header is a **Select Matrix** button. Clicking this button will display all available matrices, allowing you to switch between them. Switching the matrix will result in different node suggestions. It also shows an **Add Matrix** button, which allows you to add a custom CSV file for custom predictions. This matrix will only be used during the current session. It is possible to add multiple custom matrices during a session. It is also possible to remove added matrices.
- On the left control bar, there is an input to change the name of the current graph. Below that, there are three collapsible menus for the performance metrics, the probability, and the variants. In the variants menu, the variants of the process log are displayed. It is possible to search for keys inside the variants (multiple keys can be entered by separating them with a comma or a space). Furthermore, it is possible to sort them in different ways.
