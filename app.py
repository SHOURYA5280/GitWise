from flask import Flask, render_template, request, jsonify

app = Flask(__name__)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/create-plan", methods=["POST"])
def create_plan():
    data = request.get_json()

    budget = data.get("budget")
    gifts = data.get("gifts")
    deadline = data.get("deadline")

    return jsonify({
        "message": "Shopping plan received successfully!",
        "budget": budget,
        "gifts": gifts,
        "deadline": deadline
    })


if __name__ == "__main__":
    app.run(debug=True)