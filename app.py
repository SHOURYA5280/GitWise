import math
from datetime import date
from flask import Flask, render_template, request, jsonify
from database import get_connection, initialize_database
from marketplace.flipkart import search_flipkart_products

app = Flask(__name__)

# Create database tables when the application starts
initialize_database()


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/create-plan", methods=["POST"])
def create_plan():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid request data"}), 400

    try:
        budget = float(data.get("budget"))
        gifts = int(data.get("gifts"))
        deadline = data.get("deadline")

        if budget <= 0 or gifts <= 0:
            return jsonify({"error": "Budget and gift count must be positive"}), 400

        if not deadline:
            return jsonify({"error": "Deadline is required"}), 400

        try:
            deadline_date = date.fromisoformat(deadline)
        except ValueError:
            return jsonify({"error": "Invalid deadline format"}), 400

        if deadline_date < date.today():
            return jsonify({
                "error": "Shopping deadline cannot be in the past."
            }), 400

    except (ValueError, TypeError):
        return jsonify({"error": "Please enter valid details"}), 400

    connection = get_connection()

    try:

        cursor = connection.cursor()

        # Save the main shopping plan
        cursor.execute("""
            INSERT INTO shopping_plans
            (total_budget, number_of_gifts, deadline)
            VALUES (?, ?, ?)
        """, (budget, gifts, deadline))

        plan_id = cursor.lastrowid

        # Divide the budget equally for now
        allocation = round(budget / gifts, 2)

        for number in range(1, gifts + 1):

            if number == gifts:
                gift_budget = round(
                    budget - allocation * (gifts - 1), 2
                )
            else:
                gift_budget = allocation

            cursor.execute("""
                INSERT INTO gift_allocations
                (plan_id, gift_number, gift_name, allocated_budget)
                VALUES (?, ?, ?, ?)
            """, (
                plan_id,
                number,
                f"Gift {number}",
                gift_budget
            ))

        connection.commit()

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()

    return jsonify({
        "message": "Shopping plan saved successfully!",
        "plan_id": plan_id,
        "budget": budget,
        "gifts": gifts,
        "deadline": deadline,
        "remaining_balance": budget
    })

@app.route("/plan/<int:plan_id>", methods=["GET"])
def get_plan(plan_id):

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT *
        FROM shopping_plans
        WHERE id = ?
    """, (plan_id,))

    plan = cursor.fetchone()

    if plan is None:
        connection.close()
        return jsonify({"error": "Shopping plan not found"}), 404

    cursor.execute("""
        SELECT *
        FROM gift_allocations
        WHERE plan_id = ?
        ORDER BY gift_number
    """, (plan_id,))

    allocations = cursor.fetchall()

    connection.close()

    return jsonify({
        "plan": dict(plan),
        "gifts": [dict(gift) for gift in allocations]
    })

@app.route("/plan/<int:plan_id>/allocations", methods=["PUT"])
def update_allocations(plan_id):

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid request"}), 400

    allocations = data.get("allocations")

    if not isinstance(allocations, list) or not allocations:
        return jsonify({"error": "Invalid allocations"}), 400

    connection = get_connection()
    cursor = connection.cursor()

    try:

        # Find the shopping plan
        cursor.execute("""
            SELECT total_budget
            FROM shopping_plans
            WHERE id = ?
        """, (plan_id,))

        plan = cursor.fetchone()

        if plan is None:
            return jsonify({"error": "Shopping plan not found"}), 404

        # Retrieve existing gifts
        cursor.execute("""
            SELECT id
            FROM gift_allocations
            WHERE plan_id = ?
        """, (plan_id,))

        existing_ids = {row["id"] for row in cursor.fetchall()}

        total_allocation = 0
        updates = []

        for gift in allocations:

            try:
                gift_id = int(gift["id"])
                amount = float(gift["allocated_budget"])

                if not math.isfinite(amount) or amount < 0:
                    raise ValueError

            except (KeyError, ValueError, TypeError):
                return jsonify({"error": "Invalid allocation values"}), 400

            if gift_id not in existing_ids:
                return jsonify({"error": "Invalid gift ID"}), 400

            total_allocation += amount
            updates.append((amount, gift_id))

        # Ensure every gift is included exactly once
        submitted_ids = [gift_id for _, gift_id in updates]

        if set(submitted_ids) != existing_ids or len(submitted_ids) != len(existing_ids):
            return jsonify({"error": "Please submit every gift exactly once"}), 400

        # Check total budget
        if total_allocation > plan["total_budget"] + 0.001:
            return jsonify({
                "error": "Your total allocation exceeds the shopping budget."
            }), 400

        # Save updated allocations
        cursor.executemany("""
            UPDATE gift_allocations
            SET allocated_budget = ?
            WHERE id = ?
        """, updates)

        connection.commit()

        return jsonify({
            "message": "Budget allocations updated successfully!",
            "allocated_budget": round(total_allocation, 2),
            "remaining_budget": round(
                plan["total_budget"] - total_allocation, 2
            )
        })

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()
    
@app.route("/search-products", methods=["GET"])
def search_products():

    query = request.args.get("query", "").strip()

    if not query:
        return jsonify({
            "error": "Please enter a product name."
        }), 400

    products = search_flipkart_products(query)

    return jsonify({
        "query": query,
        "source": "Demo data - not live marketplace results",
        "products": products
    })

if __name__ == "__main__":
    app.run(debug=True)