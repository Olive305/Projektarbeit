import time

import pm4py
from matrices.openMatrix import MyCsv
from prediction import Prediction
from flask import Flask, jsonify, request, send_file, send_from_directory, session, g
from pm4py.objects.log.importer.xes import importer as xes_importer
from flask_cors import CORS
import os
import uuid

# Define the project folder (current working directory in this case)
project_folder = os.path.dirname(os.path.abspath(__file__))

app = Flask(
    __name__, static_folder=os.path.join("..", "client", "dist"), static_url_path=""
)
app.secret_key = "your_secret_key"  # Required for session management
CORS(app)

app.config.update(
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=False,  # Set to True in production with https
)

# Paths to predefined matrices
matrix_paths = [
    (os.path.join(project_folder, "matrices", "Helpdesk_nsp_matrix.csv"), "Helpdesk"),
    (
        os.path.join(
            project_folder, "matrices", "PDC_2020_1211111_TrainTest_nsp_matrix.csv"
        ),
        "PDC_2020_1211111_TrainTest",
    ),
    (
        os.path.join(project_folder, "matrices", "SimpleIORChoice_nsp_matrix.csv"),
        "Simple IOR Choice",
    ),
]

# Paths to predefined logs
logs_paths = {
    "PDC_2020_1211111_TrainTest": os.path.join(
        project_folder, "logs", "pdc_2020_1211111.xes"
    )
}

# Load predefined matrices
matrices = {}
for path, name in matrix_paths:
    matrix = MyCsv()
    matrix.openCsv(path)
    matrices[name] = matrix

# Load predefined logs
logs = {}
for name, path in logs_paths.items():
    logs[name] = xes_importer.apply(path)


@app.route("/")
@app.route("/<path:path>")
def serve_frontend(path=""):
    # Serve the specific static file if it exists, otherwise serve index.html
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):  # type: ignore
        return send_from_directory(app.static_folder, path)  # type: ignore
    else:
        return send_from_directory(app.static_folder, "index.html")  # type: ignore


@app.route("/api/testConnection", methods=["GET"])
def test_connection():
    """API endpoint to test server connection."""
    return jsonify({"status": "Connection successful"})


@app.route("/api/autoPosition", methods=["GET"])
def auto_position():
    """
    Position the nodes of the current graph.
    """

    if "prediction" not in session:
        return jsonify(
            {"error": "No active session found. Please start a session first."}
        ), 400

    # Initialize Prediction with last used matrix
    prediction = Prediction.from_json(
        session["prediction"],
        matrices.get(session["lastUsedMatrix"])
        or MyCsv.from_dict(
            session.get("custom_matrices", {}).get(session["lastUsedMatrix"])
        ),
    )
    prediction.positionGraph()
    return jsonify({"positions": prediction.serializeNodePositions()})


@app.route("/api/startSession", methods=["POST"])
def start_session():
    """
    Initialize a prediction session. Users can choose a predefined matrix or upload a custom CSV file.
    """
    data = request.form

    # Check for provided matrix name or custom CSV upload
    matrix_name = data.get("matrix_name")
    custom_csv = request.files.get("file") if "file" in request.files else None

    # Initialize a new Prediction instance
    if custom_csv:
        tmp_dir = os.path.join(os.path.sep, "tmp")
        if not os.path.exists(tmp_dir):
            os.makedirs(tmp_dir)
        custom_path = os.path.join(tmp_dir, f"{uuid.uuid4()}.csv")
        custom_csv.save(custom_path)
        csv = MyCsv()
        csv.openCsv(custom_path)
        session["matrix"] = csv
        g.custom_path = custom_path
        matrix = csv
    elif matrix_name and matrix_name in matrices:
        matrix = matrices[matrix_name]
    else:
        return jsonify(
            {"error": "Please provide a valid matrix name or upload a CSV file."}
        ), 400

    pred = Prediction(matrix)

    session["prediction"] = pred.to_json()
    session["session_id"] = str(uuid.uuid4())

    return jsonify(
        {"message": "Session started successfully", "session_id": session["session_id"]}
    )


@app.route("/api/changeMatrix", methods=["POST"])
def change_matrix():
    """
    Change the matrix mid-session. Users can specify a new predefined matrix or upload a custom CSV.
    """
    if "prediction" not in session:
        return jsonify(
            {"error": "No active session found. Please start a session first."}
        ), 400

    data = request.form or {}
    matrix_name = data.get("matrix_name")
    custom_csv = request.files.get("file") if "file" in request.files else None

    # Ensure custom matrices are initialized in session
    if "custom_matrices" not in session:
        session["custom_matrices"] = {}

    # Check if using a predefined matrix
    if matrix_name in matrices:
        # Update with predefined matrix and clear any custom matrix path
        matrix = matrices[matrix_name]

    elif matrix_name in session.get("custom_matrices", {}):
        # Update with custom matrix and clear any predefined matrix
        matrix = MyCsv.from_dict(session["custom_matrices"][matrix_name])

    # Check if a custom matrix was provided by name or uploaded file
    elif custom_csv:
        # Create tmp directory if it doesn't exist
        tmp_dir = os.path.join(os.path.sep, "tmp")
        if not os.path.exists(tmp_dir):
            os.makedirs(tmp_dir)

        # Save the new custom CSV
        custom_path = os.path.join(tmp_dir, f"{uuid.uuid4()}.csv")
        custom_csv.save(custom_path)

        # Load the matrix from the CSV
        matrix = MyCsv()
        matrix.openCsv(custom_path)

        # Store the custom matrix in session for future use
        session["custom_matrices"][matrix_name] = matrix.to_dict()
        if "matrix_paths" not in session:
            session["matrix_paths"] = {}
        session["matrix_paths"][matrix_name] = custom_path  # Update path for teardown
        g.custom_path = custom_path  # Update for teardown

    else:
        return jsonify(
            {"error": "Please provide a valid matrix name or upload a CSV file."}
        ), 400

    # Update the Prediction instance with the new matrix
    session["lastUsedMatrix"] = matrix_name

    return jsonify({"message": "Matrix added successfully"})


@app.route("/api/removeMatrix", methods=["POST"])  # type: ignore
def remove_matrix():
    """
    Remove a custom matrix from the session.
    """
    data = request.json
    matrix_name = data.get("matrix_name")  # type: ignore

    # If the matrix to remove is a predefined matrix do nothing
    if matrix_name in matrices:
        return jsonify({"message": "Predefined matrices cannot be removed"})

    # Ensure custom matrices are initialized in session
    custom_matrices = session.get("custom_matrices", {})
    matrix_paths = session.get("matrix_paths", {})

    # Check if the matrix exists in the session
    if matrix_name in custom_matrices:
        # Remove the matrix from the session
        del custom_matrices[matrix_name]
        session["custom_matrices"] = custom_matrices

        # Remove the matrix file if it exists
        custom_path = matrix_paths.get(matrix_name)
        if custom_path and os.path.exists(custom_path):
            os.remove(custom_path)
            del matrix_paths[matrix_name]
            session["matrix_paths"] = matrix_paths
            
        if "custom_logs" in session and matrix_name in session["custom_logs"]:
            del session["custom_logs"][matrix_name]

        # Check if the last used matrix is the deleted matrix
        if session.get("lastUsedMatrix") == matrix_name:
            session["lastUsedMatrix"] = "Simple IOR Choice"

    return jsonify({"message": "Matrix removed successfully"})

@app.route("/api/addLog", methods=["POST"])
def add_log():
    # add a log to an existing custom matrix
    data = request.form or {}
    matrix_name = data.get("matrix_name")
    custom_log = request.files.get("file") if "file" in request.files else None
    
    if matrix_name not in session.get("custom_matrices", {}):
        return jsonify({"error": "Matrix not found in session"}), 400
    
    if not custom_log:
        return jsonify({"error": "Please provide a log file"}), 400
    
    # Save the uploaded log to a temporary file
    tmp_dir = os.path.join(os.path.sep, "tmp")
    if not os.path.exists(tmp_dir):
        os.makedirs(tmp_dir)
    custom_log_path = os.path.join(tmp_dir, f"{uuid.uuid4()}.xes")
    custom_log.save(custom_log_path)
    
    # Store the log in the session
    if "custom_logs" not in session:
        session["custom_logs"] = {}
    session["custom_logs"][matrix_name] = custom_log_path
    
    return jsonify({"message": "Log added successfully"})


@app.route("/api/getAvailableMatrices", methods=["GET"])
def get_available_matrices():
    """Get the list of available matrices, including predefined and session custom matrices."""
    # Ensure custom matrices are initialized in session
    custom_matrices = session.get("custom_matrices", {})

    # Get predefined and custom matrices and the logs of custom matrices
    default_matrices = list(matrices.keys())
    custom_matrices = list(custom_matrices.keys())
    custom_log = list(session.get("custom_logs", {}).keys())
    
    return jsonify({
        "default_matrices": default_matrices,
        "custom_matrices": custom_matrices,
        "custom_logs": custom_log
    })


@app.route("/api/generatePetriNet", methods=["POST"])
def generate_petri_net():
    """
    Generate a Petri net from the current prediction session.
    This function expects a graph input to convert.
    """

    if "prediction" not in session:
        return jsonify(
            {"error": "No active session found. Please start a session first."}
        ), 400

    # Initialize Prediction with last used matrix
    prediction = Prediction.from_json(
        session["prediction"],
        matrices.get(session["lastUsedMatrix"])
        or MyCsv.from_dict(
            session.get("custom_matrices", {}).get(session["lastUsedMatrix"])
        ),
    )
    petri_net_path = prediction.convert_to_petri_net()

    # Check if the file exists before sending it
    if os.path.exists(petri_net_path):
        return send_file(petri_net_path, mimetype="image/jpeg")
    else:
        return jsonify({"error": "Petri net image not found"}), 404


@app.route("/api/getVariants", methods=["POST"])
def get_variants():
    """
    Retrieve variants from the current prediction session.
    """
    if "prediction" not in session:
        return jsonify(
            {"error": "No active session found. Please start a session first."}
        ), 400

    # Initialize Prediction with last used matrix
    prediction = Prediction.from_json(
        session["prediction"],
        matrices.get(session["lastUsedMatrix"])
        or MyCsv.from_dict(
            session.get("custom_matrices", {}).get(session["lastUsedMatrix"])
        ),
    )

    variants = prediction.getVariants()

    return jsonify({"variants": variants})


@app.route("/api/getMetrics", methods=["POST"])
def get_metrics():
    """
    Retrieve metrics from the current prediction session.
    This endpoint expects a graph input to calculate metrics.
    """

    # Get the starting time to check for prerformance
    start_time = time.time()

    if "prediction" not in session:
        return jsonify(
            {"error": "No active session found. Please start a session first."}
        ), 400

    # Initialize Prediction with last used matrix
    prediction = Prediction.from_json(
        session["prediction"],
        matrices.get(session["lastUsedMatrix"])
        or MyCsv.from_dict(
            session.get("custom_matrices", {}).get(session["lastUsedMatrix"])
        ),
    )

    # Time to initialize the prediction
    print("%s seconds for initialization in metrics" % (time.time() - start_time))


    metrics = prediction.getMetrics()

    # Time to get the metrics
    print("%s seconds for metrics" % (time.time() - start_time))

    return jsonify({"metrics": metrics})

@app.route("/api/getPm4pyMetrics", methods=["POST"])
def get_pm4py_metrics():
    """
    Retrieve metrics from the current prediction session.
    This endpoint expects a graph input to calculate metrics.
    """

    # Get the starting time to check for prerformance
    start_time = time.time()

    if "prediction" not in session:
        return jsonify(
            {"error": "No active session found. Please start a session first."}
        ), 400

    # Initialize Prediction with last used matrix
    prediction = Prediction.from_json(
        session["prediction"],
        matrices.get(session["lastUsedMatrix"])
        or MyCsv.from_dict(
            session.get("custom_matrices", {}).get(session["lastUsedMatrix"])
        ),
    )

    # Time to initialize the prediction
    print("%s seconds for initialization in metrics" % (time.time() - start_time))
    
    log = None

    # Retrieve the log from either predefined logs or custom logs in the session
    if "custom_logs" in session:
        if session["lastUsedMatrix"] in session["custom_logs"]:
            log = xes_importer.apply(session["custom_logs"][session["lastUsedMatrix"]])
            
    if not log:        
        log = logs.get(session["lastUsedMatrix"], None)

    metrics = prediction.getPm4pyMetrics(log)

    # Time to get the metrics
    print("%s seconds for pm4py metrics" % (time.time() - start_time))

    return jsonify({"metrics": metrics})


@app.route("/api/predictOutcome", methods=["POST"])
def predict_outcome():
    """
    Generate predictions based on the graph input provided.
    This will reset the Prediction instance in the session with the latest input.
    """
    # Get the starting time to check for prerformance
    start_time = time.time()

    data = request.json
    graph_input = data.get("graph_input")  # type: ignore
    matrixName = data.get("matrix")  # type: ignore

    session["lastUsedMatrix"] = matrixName

    # Print time to receive the data
    print("%s seconds for data" % (time.time() - start_time))

    if "prediction" not in session:
        return jsonify(
            {"error": "No active session found. Please start a session first."}
        ), 400

    # Retrieve the matrix from either predefined matrices or custom matrices in the session
    matrix = matrices.get(matrixName) or MyCsv.from_dict(
        session.get("custom_matrices", {}).get(matrixName)
    )

    # Time to retrieve the matrix
    print("%s seconds for matrix" % (time.time() - start_time))

    if not matrix:
        return jsonify({"error": "Given matrix not available in this session."}), 400

    prediction_data = session["prediction"]

    # Load Prediction from session and update it with new data
    prediction = Prediction.from_json(prediction_data, matrix)
    predictions = prediction.getPredictions(graph_input)

    # Time to get the predictions
    print("%s seconds for predictions" % (time.time() - start_time))

    # Update session with the modified Prediction instance
    session["prediction"] = prediction.to_json()
    session.modified = True  # Ensure session updates are saved

    # Time to update the session
    print("%s seconds for session" % (time.time() - start_time))

    return jsonify({"predictions": predictions})

@app.route("/api/getMaxSupport", methods=["POST"])
def get_max_support():
    """
    Retrieve the max support from the current matrix.
    """
    if "prediction" not in session:
        return jsonify(
            {"error": "No active session found. Please start a session first."}
        ), 400

    # Get the last used matrix
    matrix_name = session["lastUsedMatrix"]
    
    # Retrieve the matrix from either predefined matrices or custom matrices in the session
    matrix = matrices.get(matrix_name) or MyCsv.from_dict(
        session.get("custom_matrices", {}).get(matrix_name)
    )
    
    max_support = matrix.supportMax

    return jsonify({"max_support": max_support})


@app.teardown_appcontext
def cleanup(exception=None):
    """
    Cleanup any temporary files stored during the session.
    This ensures custom CSVs are removed after session ends.
    """
    # Access g.custom_path instead of session to avoid request context error
    custom_path = getattr(g, "custom_path", None)
    if custom_path and os.path.exists(custom_path):
        os.remove(custom_path)


if __name__ == "__main__":
    app.run(debug=True, port=8081, host="localhost")
