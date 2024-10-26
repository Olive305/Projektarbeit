from matrices.openMatrix import MyCsv
from prediction import Prediction
from flask import Flask, jsonify, request
from flask_cors import CORS
import os

# Define the project folder (current working directory in this case)
project_folder = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)
CORS(app)

# Multiple matrices usable
matrixPaths = [
    (os.path.join(project_folder, r"matrices", "Helpdesk_nsp_matrix.csv"), "Helpdesk"),
    (os.path.join(project_folder, r"matrices", "PDC_2020_1211111_TrainTest_nsp_matrix.csv"), "PDC_2020_1211111_TrainTest"),
    (os.path.join(project_folder, r"matrices", "SimpleIORChoice_nsp_matrix.csv"), "Simple IOR Choice")
]

# test test

matrices = {}

# Initialize the matrices
for path in matrixPaths:
    matrix = MyCsv()
    matrix.openCsv(path[0])
    matrices[path[1]] = matrix
    

@app.route("/api/test", methods=['GET'])
def test():
    return jsonify(True)

@app.route("/api/predict", methods=['POST'])
def predict():
    data = request.json
    if 'input_value' not in data:
        return jsonify({"error": "No input_value provided"}), 400

    input_value = data['input_value']
    prediction = Prediction(matrices)

    # Function call for the prediction (to be added)
    result = prediction.getPredictions(input_value)

    return jsonify(result)

@app.route("/api/getMatrices", methods=['GET'])
def getMatrices():
    # Ensure that all available matrices are returned
    return jsonify({
        "available_matrices": list(matrices.keys()),
        "default_matrix": "Simple IOR Choice"
    })

if __name__ == "__main__":
    app.run(debug=True, port=8081)
