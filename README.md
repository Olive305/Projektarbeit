# Installation and Starting

## Pull the Repository

- Pull the GitHub repo or download the `DockerFiles.part01.rar` and `DockerFiles.part02.rar` files.

## Unpack the Compressed Files

### On Windows

1. Install WinRAR if not already installed.
2. Right-click on `DockerFiles.part01.rar` and select "Extract Here".

### On Linux

1. Install `unrar` if not already installed:
    ```sh
    sudo apt-get install unrar
    ```
2. Unpack the files using the following command:
    ```sh
    unrar x DockerFiles.part01.rar
    ```

### On macOS

1. Install `unrar` using Homebrew if not already installed:
    ```sh
    brew install unrar
    ```
2. Unpack the files using the following command:
    ```sh
    unrar x DockerFiles.part01.rar
    ```

## Load the Docker Image

1. Navigate to the `DockerFiles` folder where the `my-app.tar` file is located.
2. Run the following command to load the Docker image:
    ```sh
    docker load -i my-app.tar
    ```

## Start the Site

1. Run the following command in the `DockerFiles` folder to start the site on `localhost:8000`:
    ```sh
    docker run -p 8000:8000 my-app
    ```

# Short Explanation of Key Features

(Maybe not up to date.)

- The canvas displays the process as edges and nodes (directly follows graph). The server sends predictions for actions (nodes) which are displayed on the canvas in different colors with support and probability.

- In the **Probability** section of the side bar, the **Probability Slider** allows you to adjust the threshold for which predictions should be displayed. The **Support Slider** does the same, but just for support. The higher the probability or support, the fewer predictions will be shown. There is also an option to automatically calculate the number of predictions to display, which disables the probablity and support slider. This function is enabled by default and can be toggled using the checkbox.


- Clicking on existing nodes selects them. Once selected, you can delete and move all the selected nodes simultaneously. You can also select nodes using a **Lasso**.

- Right-clicking on nodes or edges opens a menu that allows you to delete them and show more functions for them.

- In the **header** there is the **File** button, opening a pop-up menu showing functions to create a new process tab, download the current process or save a generated petri net of the process as a picture or as a pnml file.

- In the **header** there is the **Select Matrix** button. Clicking this button will display all available matrices, allowing you to switch between them. Switching the matrix will result in different node suggestions. It also shows an **Add Matrix** button, which allows you to add a custom CSV file for custom predictions.

- In the **header** there is the **View** button, with functionality to change certain appearances of the page and also the function to auto position the graph for better visibility.

- On the left control bar, there is an input to change the name of the current graph. Below that, there are three collapsible menus for the performance metrics, the probability, and the variants. In the variants menu, the variants of the process log are displayed. It is possible to search for keys inside the variants (multiple keys can be entered by separating them with a comma or a space). Furthermore, it is possible to sort them in different ways.
