# Installation and Starting

## Pull the Docker Image files

- Pull the GitHub repo or download the `DockerFiles.part01.rar` and `DockerFiles.part02.rar` files.

## Unpack the Compressed Files

### On Windows

1. Install WinRAR.
2. Right click the `DockerFiles.part1.rar` file and click on the "Extract Here" option.

### On Linux

1. Install `unrar`:
    ```sh
    sudo apt-get install unrar
    ```
2. Unpack the files using this command:
    ```sh
    unrar x DockerFiles.part1.rar
    ```

### On macOS

1. Install `unrar` with Homebrew:
    ```sh
    brew install unrar
    ```
2. Unpack the files using this command:
    ```sh
    unrar x DockerFiles.part01.rar
    ```

## Load the Docker Image

1. Open the `DockerFiles` folder where the `my-app.tar` file is located in the command line.
2. Run the following command to load the Docker image:
    ```sh
    docker load -i my-app.tar
    ```

## Start the Site

1. Run the following command in the `DockerFiles` folder to start the site on `localhost:8000`:
    ```sh
    docker run -p 8000:8000 my-app
    ```
